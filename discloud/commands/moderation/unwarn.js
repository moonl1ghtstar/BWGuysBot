const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database/db');
const logger = require('../../utils/logger');
const { isTargetAtOrAboveModerator } = require('../../utils/roles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('경고취소')
        .setDescription('유저의 경고를 취소(차감)합니다.')
        .addUserOption(option =>
            option.setName('대상')
                .setDescription('경고를 취소할 유저')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('갯수')
                .setDescription('취소할 경고 갯수 (기본값: 1)')
                .setMinValue(1)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('대상');
        const amount = interaction.options.getInteger('갯수') || 1;
        const guildId = interaction.guild.id;
        const moderatorId = interaction.user.id;

        // 1. 본인 경고취소 방지
        if (target.id === moderatorId) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(':x: 실행 실패')
                .setColor(0xFF0000)
                .setDescription('> 자기 자신의 경고를 취소할 수 없습니다.')
                .setTimestamp();
            logger.logFailure(interaction, '자기 자신 경고취소 시도');
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // 2. 봇 경고취소 방지
        if (target.bot) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(':x: 실행 실패')
                .setColor(0xFF0000)
                .setDescription('> 봇에게는 경고 취소를 할 수 없습니다.')
                .setTimestamp();
            logger.logFailure(interaction, '봇 경고취소 시도');
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        let member = null;
        try {
            member = await interaction.guild.members.fetch(target.id);
        } catch (error) {
            // 유저가 서버에 없는 경우 member는 null
        }

        const moderator = interaction.member;

        // 2. 권한 계층 확인 (서버에 존재하는 경우에만)
        if (member) {
            if (isTargetAtOrAboveModerator(member, moderator) && interaction.guild.ownerId !== moderatorId) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle(':x: 실행 실패')
                    .setColor(0xFF0000)
                    .setDescription('> 본인보다 높거나 같은 역할을 가진 멤버의 경고는 취소할 수 없습니다.')
                    .setTimestamp();
                logger.logFailure(interaction, '역할 계층 위반 경고취소 시도');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }

        // --- [1단계] 데이터 조회 및 검증 ---
        const warnings = db.getWarnings(target.id, guildId);

        if (warnings.length === 0) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(':x: 실행 실패')
                .setColor(0xFF0000)
                .setDescription(`> **${target.tag}** 유저는 취소할 경고 기록이 없습니다.`)
                .setTimestamp();
            logger.logFailure(interaction, '경고 기록이 없는 유저의 경고취소 시도');
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // 응답 지연 (데이터 처리 및 메시지 발송 시간 확보)
        await interaction.deferReply();

        // 취소할 갯수 결정 (보유 경고보다 많이 요청하면 전부 삭제)
        const actualAmount = Math.min(amount, warnings.length);

        // 가장 마지막에 추가된 경고부터 순차적으로 삭제
        for (let i = 0; i < actualAmount; i++) {
            const warnToRemove = warnings[warnings.length - 1 - i];
            db.removeWarning(warnToRemove.id);
        }

        const remainingWarns = warnings.length - actualAmount;

        // --- [2단계] 임베드 메세지 구성 ---
        const embed = new EmbedBuilder()
            .setTitle(':rotating_light: 유저 경고 취소 안내')
            .setColor(0x2ECC71) // 녹색
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `### 처리자:        \n` +
                `> ${interaction.user}\n\n` +
                `### 대상자:        \n` +
                `> ${target}        \n\n` +
                `### 경고 누적:        \n` +
                `> ${remainingWarns}회 / 5회 (-${actualAmount})       \n\n `
            )
            .setTimestamp();

        // --- [3단계] 최종 메세지 발송 ---
        await interaction.editReply({
            content: `${target}`,
            embeds: [embed]
        });

        // 성공 로그 기록
        logger.logSuccess(interaction);
    },
};
