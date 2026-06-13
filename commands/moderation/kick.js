const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger');
const { isTargetAtOrAboveModerator } = require('../../utils/roles');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('추방')
        .setDescription('유저를 서버에서 추방합니다.')
        .addUserOption(option =>
            option.setName('대상')
                .setDescription('추방할 유저')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('사유')
                .setDescription('추방 사유')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('대상');
        const reason = interaction.options.getString('사유') || '사유 없음';
        const moderatorId = interaction.user.id;

        // 1. 본인 추방 방지
        if (target.id === moderatorId) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(':x: 실행 실패')
                .setColor(0xFF0000)
                .setDescription('> 자기 자신을 추방할 수 없습니다.')
                .setTimestamp();
            logger.logFailure(interaction, '자기 자신 추방 시도');
            return await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
        }

        // 2. 서버 소유자 추방 방지
        if (target.id === interaction.guild.ownerId) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(':x: 실행 실패')
                .setColor(0xFF0000)
                .setDescription('> 서버 소유자는 추방할 수 없습니다.')
                .setTimestamp();
            logger.logFailure(interaction, '서버 소유자 추방 시도');
            return await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
        }

        let member = interaction.options.getMember('대상');
        if (!member) {
            try {
                member = await interaction.guild.members.fetch(target.id);
            } catch (error) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle(':x: 실행 실패')
                    .setColor(0xFF0000)
                    .setDescription('> 대상 유저가 이 서버에 존재하지 않습니다.')
                    .setTimestamp();
                logger.logFailure(interaction, '존재하지 않는 유저 추방 시도');
                return await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
            }
        }

        const moderator = interaction.member;

        // 3. 권한 계층 확인
        if (isTargetAtOrAboveModerator(member, moderator) && interaction.guild.ownerId !== moderatorId) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(':x: 실행 실패')
                .setColor(0xFF0000)
                .setDescription('> 본인보다 높거나 같은 역할을 가진 멤버는 추방할 수 없습니다.')
                .setTimestamp();
            logger.logFailure(interaction, '역할 계층 위반 추방 시도');
            return await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
        }

        if (!member.kickable) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(':x: 실행 실패')
                .setColor(0xFF0000)
                .setDescription('> 봇의 권한이 부족하여 이 유저를 추방할 수 없습니다.')
                .setTimestamp();
            logger.logFailure(interaction, '봇의 권한 부족으로 추방 불가');
            return await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
        }

        // 응답 지연 (데이터 처리 및 메시지 발송 시간 확보)
        await interaction.deferReply();

        await member.kick(reason);

        // --- [2단계] 임베드 메세지 구성 ---
        const embed = new EmbedBuilder()
            .setTitle(':rotating_light: 유저 추방 안내')
            .setColor(0xE74C3C)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setDescription(
                `### 처리자:        \n` +
                `> ${interaction.user}\n\n` +
                `### 대상자:        \n` +
                `> ${target}        \n\n` +
                `### 사유:        \n` +
                `> ${reason}`
            )
            .setTimestamp();

        try {
            await target.send({ embeds: [embed] });
        } catch (error) {
            console.log(`Could not DM user ${target.tag}`);
        }

        // --- [3단계] 최종 메세지 발송 ---
        await interaction.editReply({
            content: `${target}`,
            embeds: [embed]
        });

        // 성공 로그 기록
        logger.logSuccess(interaction);
    },
};
