const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('차단')
        .setDescription('유저를 서버에서 차단합니다.')
        .addUserOption(option => 
            option.setName('대상')
                .setDescription('차단할 유저')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('사유')
                .setDescription('차단 사유')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('대상');
        const reason = interaction.options.getString('사유') || '사유 없음';
        const guildId = interaction.guild.id;
        const moderatorId = interaction.user.id;

        // 1. 본인 차단 방지
        if (target.id === moderatorId) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(':x: 실행 실패')
                .setColor(0xFF0000)
                .setDescription('> 자기 자신을 차단할 수 없습니다.')
                .setTimestamp();
            logger.logFailure(interaction, '자기 자신 차단 시도');
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // 2. 서버 소유자 차단 방지
        if (target.id === interaction.guild.ownerId) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(':x: 실행 실패')
                .setColor(0xFF0000)
                .setDescription('> 서버 소유자는 차단할 수 없습니다.')
                .setTimestamp();
            logger.logFailure(interaction, '서버 소유자 차단 시도');
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        let member = null;
        try {
            member = await interaction.guild.members.fetch(target.id);
        } catch (error) {
            // 유저가 서버에 없는 경우 member는 null로 남음 (직접 ban 가능)
        }

        const moderator = await interaction.guild.members.fetch(moderatorId);

        // 3. 권한 계층 확인 (서버에 있는 멤버의 경우에만 비교)
        if (member) {
            if (member.roles.highest.position >= moderator.roles.highest.position && interaction.guild.ownerId !== moderatorId) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle(':x: 실행 실패')
                    .setColor(0xFF0000)
                    .setDescription('> 본인보다 높거나 같은 역할을 가진 멤버는 차단할 수 없습니다.')
                    .setTimestamp();
                logger.logFailure(interaction, '역할 계층 위반 차단 시도');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            if (!member.bannable) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle(':x: 실행 실패')
                    .setColor(0xFF0000)
                    .setDescription('> 봇의 권한이 부족하여 이 유저를 차단할 수 없습니다.')
                    .setTimestamp();
                logger.logFailure(interaction, '봇의 권한 부족으로 차단 불가');
                return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }

        // 응답 지연 (데이터 처리 및 메시지 발송 시간 확보)
        await interaction.deferReply();

        // --- [1단계] 데이터 처리 및 DM 발송 ---
        // DM the user before banning
        try {
            await target.send(`[${interaction.guild.name}] 서버에서 차단(Ban)되었습니다.\n사유: ${reason}`);
        } catch (error) {
            console.log(`Could not DM user ${target.tag}`);
        }

        if (member) {
            await member.ban({ reason });
        } else {
            await interaction.guild.members.ban(target.id, { reason });
        }

        // --- [2단계] 임베드 메세지 구성 ---
        const embed = new EmbedBuilder()
            .setTitle(':rotating_light: 유저 차단(Ban) 안내')
            .setColor(0x8B0000)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `### 처리자:        \n` +
                `> ${interaction.user}\n\n` +
                `### 대상자:        \n` +
                `> ${target} (${target.id})\n\n` +
                `### 사유:        \n` +
                `> ${reason}`
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

