const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

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
        const member = await interaction.guild.members.fetch(target.id);
        const moderator = await interaction.guild.members.fetch(interaction.user.id);

        // 1. 본인 차단 방지
        if (target.id === interaction.user.id) {
            return await interaction.reply({ content: '자기 자신을 차단할 수 없습니다.', ephemeral: true });
        }

        // 2. 권한 계층 확인
        if (member.roles.highest.position >= moderator.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return await interaction.reply({ content: '본인보다 높거나 같은 역할을 가진 멤버는 차단할 수 없습니다.', ephemeral: true });
        }

        if (!member.bannable) {
            return await interaction.reply({ content: '봇의 권한이 부족하여 이 유저를 차단할 수 없습니다.', ephemeral: true });
        }

        await interaction.deferReply();

        // DM the user before banning
        try {
            await target.send(`[${interaction.guild.name}] 서버에서 차단(Ban)되었습니다.\n사유: ${reason}`);
        } catch (error) {
            console.log(`Could not DM user ${target.tag}`);
        }

        await member.ban({ reason });

        const embed = new EmbedBuilder()
            .setTitle('유저 차단')
            .setColor(0x8B0000)
            .addFields(
                { name: '대상', value: `${target.tag} (${target.id})`, inline: true },
                { name: '사유', value: reason, inline: true },
                { name: '관리자', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
