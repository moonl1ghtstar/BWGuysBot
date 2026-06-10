const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('타임아웃')
        .setDescription('유저를 타임아웃 시킵니다.')
        .addUserOption(option => 
            option.setName('대상')
                .setDescription('타임아웃 할 유저')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('시간')
                .setDescription('타임아웃 기간 (분 단위)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('사유')
                .setDescription('타임아웃 사유')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('대상');
        const duration = interaction.options.getInteger('시간');
        const reason = interaction.options.getString('사유') || '사유 없음';
        const member = await interaction.guild.members.fetch(target.id);
        const moderator = await interaction.guild.members.fetch(interaction.user.id);

        // 1. 본인 타임아웃 방지
        if (target.id === interaction.user.id) {
            return await interaction.reply({ content: '자기 자신을 타임아웃 할 수 없습니다.', ephemeral: true });
        }

        // 2. 권한 계층 확인
        if (member.roles.highest.position >= moderator.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return await interaction.reply({ content: '본인보다 높거나 같은 역할을 가진 멤버는 타임아웃 할 수 없습니다.', ephemeral: true });
        }

        if (!member.moderatable) {
            return await interaction.reply({ content: '봇의 권한이 부족하여 이 유저를 타임아웃 할 수 없습니다.', ephemeral: true });
        }

        await interaction.deferReply();

        await member.timeout(duration * 60 * 1000, reason);

        const embed = new EmbedBuilder()
            .setTitle('유저 타임아웃')
            .setColor(0xFFFF00)
            .addFields(
                { name: '대상', value: `${target.tag} (${target.id})`, inline: true },
                { name: '기간', value: `${duration}분`, inline: true },
                { name: '사유', value: reason, inline: true },
                { name: '관리자', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        // DM the user
        try {
            await target.send(`[${interaction.guild.name}] 서버에서 ${duration}분 동안 타임아웃 되었습니다.\n사유: ${reason}`);
        } catch (error) {
            console.log(`Could not DM user ${target.tag}`);
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
