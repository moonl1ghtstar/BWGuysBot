const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database/db');
const logger = require('../../utils/logger');
const punishment = require('../../utils/punishment');
const { isTargetAtOrAboveModerator } = require('../../utils/roles');

// helper functions
function createErrorEmbed(message) {
    return new EmbedBuilder()
        .setTitle(':x: 실행 실패')
        .setColor(0xFF0000)
        .setDescription(`> ${message}`)
        .setTimestamp();
}

function createPunishmentFailEmbed(message) {
    return new EmbedBuilder()
        .setTitle(':warning: 자동 처벌 실패')
        .setColor(0xF1C40F)
        .setDescription(`> ${message}`)
        .setTimestamp();
}

function getAutoTimeoutInfo(warnCount) {
    const durations = {
        1: {
            durationMs: 10 * 60 * 1000,
            durationText: '10분'
        },
        2: {
            durationMs: 60 * 60 * 1000,
            durationText: '1시간'
        },
        3: {
            durationMs: 24 * 60 * 60 * 1000,
            durationText: '1일'
        },
        4: {
            durationMs: 7 * 24 * 60 * 60 * 1000,
            durationText: '7일'
        }
    };

    return durations[warnCount] || null;
}

function buildBanEmbed(interaction, target, punishmentReason) {
    return new EmbedBuilder()
        .setTitle(':rotating_light: 유저 차단 안내')
        .setColor(0x8B0000)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setDescription(
            `### 처리자:        \n` +
            `> ${interaction.user}\n\n` +
            `### 대상자:        \n` +
            `> ${target}\n\n` +
            `### 사유:      \n` +
            `> ${punishmentReason}`
        );
}

function buildTimeoutEmbed(interaction, target, durationText, reason) {
    return new EmbedBuilder()
        .setTitle(':rotating_light: 유저 타임아웃 안내')
        .setColor(0xF1C40F)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setDescription(
            `### 처리자:        \n` +
            `> ${interaction.user}\n\n` +
            `### 대상자:        \n` +
            `> ${target}\n\n` +
            `### 기간:      \n` +
            `> ${durationText}\n\n` +
            `### 사유:      \n` +
            `> ${reason}`
        );
}

async function replyError(
    interaction,
    logMessage,
    userMessage
) {
    logger.logFailure(
        interaction,
        logMessage
    );

    return interaction.reply({
        embeds: [
            createErrorEmbed(userMessage)
        ],
        flags: [MessageFlags.Ephemeral]
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('경고')
        .setDescription('유저에게 경고를 부여합니다.')
        .addUserOption(option =>
            option.setName('대상')
                .setDescription('경고를 줄 유저')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('갯수')
                .setDescription('부여할 경고 갯수 (기본값: 1)')
                .setMinValue(1)
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('사유')
                .setDescription('경고 사유')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('대상');
        const reason = interaction.options.getString('사유') || '사유 없음';
        const amount = interaction.options.getInteger('갯수') || 1;
        const manualDuration = interaction.options.getInteger('시간');
        const guildId = interaction.guild.id;
        const moderatorId = interaction.user.id;

        // 1. 본인 경고 방지
        if (target.id === moderatorId) {
            return replyError(
                interaction,
                '자기 자신 경고 시도',
                '자기 자신에게 경고를 줄 수 없습니다.'
            );
        }

        // 2. 봇 경고 방지
        if (target.bot) {
            return replyError(
                interaction,
                '봇 경고 시도',
                '봇에게는 경고를 줄 수 없습니다.'
            );
        }

        // 3. 서버 소유자 경고 방지
        if (target.id === interaction.guild.ownerId) {
            logger.logFailure(interaction, '서버 소유자 경고 시도');

            return interaction.reply({
                embeds: [createErrorEmbed('서버 소유자에게는 경고를 줄 수 없습니다.')],
                flags: [MessageFlags.Ephemeral]
            });
        }

        let member = interaction.options.getMember('대상');
        if (!member) {
            try {
                member = await interaction.guild.members.fetch(target.id);
            } catch (error) {
                return replyError(
                    interaction,
                    '존재하지 않는 유저 경고 시도',
                    '대상 유저가 서버에 존재하지 않습니다.'
                );
            }
        }

        const moderator = interaction.member;

        // 3. 권한 계층 확인 (본인보다 높거나 같은 역할의 유저는 경고 불가)
        if (isTargetAtOrAboveModerator(member, moderator) && interaction.guild.ownerId !== moderatorId) {
            return replyError(
                interaction,
                '역할 계층 위반 경고 시도',
                '본인보다 높거나 같은 역할을 가진 멤버에게는 경고를 줄 수 없습니다.'
            );
        }

        // 응답 지연 (데이터 처리 및 메시지 발송 시간 확보)
        await interaction.deferReply();

        // --- [1단계] 데이터 기록 및 누적 횟수 계산 ---
        for (let i = 0; i < amount; i++) {
            db.addWarning(target.id, guildId, reason, moderatorId);
        }

        const warnings = db.getWarnings(target.id, guildId);
        const warnCount = warnings.length;

        // --- [2단계] 자동 처벌 로직 ---
        let punishmentEmbed = null;

        if (warnCount >= 5) {
            const punishmentReason = `경고 ${warnCount}회 누적 (자동 처벌)`;

            punishmentEmbed = await punishment.applyBan(
                member,
                punishmentReason
            );

            if (punishmentEmbed) {
                punishmentEmbed = buildBanEmbed(
                    interaction,
                    target,
                    punishmentReason
                );
            } else {
                punishmentEmbed = createPunishmentFailEmbed(
                    '경고는 기록됐지만 봇 권한 또는 역할 순서 문제로 자동 차단을 적용하지 못했습니다.'
                );

                logger.logFailure(interaction, '자동 차단 적용 실패');
            }
        } else {
            let durationMs = 0;
            let durationText = '';
            let pReason = '';

            if (manualDuration) {
                durationMs = manualDuration * 60 * 1000;
                durationText = `${manualDuration}분`;
                pReason = reason;
            } else if (warnCount >= 1) {
                pReason = `경고 ${warnCount}회 누적 (자동 처벌)`;

                const timeoutInfo = getAutoTimeoutInfo(warnCount);

                if (timeoutInfo) {
                    durationMs = timeoutInfo.durationMs;
                    durationText = timeoutInfo.durationText;
                }
            }

            if (durationMs > 0) {
                punishmentEmbed = await punishment.applyTimeout(
                    member,
                    durationMs,
                    pReason,
                    interaction.channelId
                );

                if (punishmentEmbed) {
                    punishmentEmbed = buildTimeoutEmbed(
                        interaction,
                        target,
                        durationText,
                        pReason
                    );
                } else {
                    punishmentEmbed = createPunishmentFailEmbed(
                        '경고는 기록됐지만 봇 권한 또는 역할 순서 문제로 자동 처벌을 적용하지 못했습니다.'
                    );

                    logger.logFailure(interaction, '자동 타임아웃 적용 실패');
                }
            }
        }

        // --- [3단계] 임베드 메세지 구성 ---
        const warnEmbed = new EmbedBuilder()
            .setTitle(':rotating_light: 유저 경고 부여 안내') // 임베드의 제목
            .setColor(0xFF0000) // 임베드 왼쪽 선의 색상
            .setThumbnail(target.displayAvatarURL({ dynamic: true })) // 우측 상단에 대상자 프로필 사진 추가
            .setDescription(
                `### 처리자:        \n` +
                `> ${interaction.user}\n\n` +
                `### 대상자:        \n` +
                `> ${target}\n\n` +
                `### 경고 누적:        \n` +
                `> ${warnCount}회 / 5회 (+${amount})\n\n` +
                `### 사유:        \n` +
                `> ${reason}`
            )
            .setTimestamp(); // 맨 아래에 현재 시간을 표시

        const embeds = [warnEmbed];
        if (punishmentEmbed) embeds.push(punishmentEmbed);

        try {
            await target.send({ embeds });
        } catch (error) {
            console.log(`Could not DM user ${target.tag}`);
        }

        // --- [4단계] 최종 메세지 발송 ---
        const sentMessage = await interaction.editReply({
            content: `${target}`,
            embeds: embeds
        });

        const notification = db.getTimeoutNotificationChannel(
            target.id,
            interaction.guild.id
        );

        if (notification) {
            db.setTimeoutNotificationChannel(
                target.id,
                interaction.guild.id,
                notification.channel_id,
                notification.expires_at,
                sentMessage.id
            );
        }

        // 성공 로그 기록
        logger.logSuccess(interaction);
    },
};
