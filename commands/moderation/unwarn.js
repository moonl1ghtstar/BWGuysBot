const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('경고취소')
        .setDescription('유저의 가장 최근 경고 1개를 취소합니다.')
        .addUserOption(option => 
            option.setName('대상')
                .setDescription('경고를 취소할 유저')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('대상');
        const guildId = interaction.guild.id;

        await interaction.deferReply();

        // 해당 유저의 경고 기록 가져오기
        const warnings = db.getWarnings(target.id, guildId);
        
        if (warnings.length === 0) {
            return await interaction.editReply(`${target.tag} 유저는 취소할 경고 기록이 없습니다.`);
        }

        // 가장 마지막에 추가된 경고(가장 최근 경고) 삭제
        const lastWarn = warnings[warnings.length - 1];
        db.removeWarning(lastWarn.id);

        return await interaction.editReply(`${target.tag} 유저의 가장 최근 경고(사유: ${lastWarn.reason || '없음'})가 취소되었습니다.\n현재 남은 경고: ${warnings.length - 1}회`);
    },
};
