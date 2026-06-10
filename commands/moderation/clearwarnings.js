const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('경고초기화')
        .setDescription('서버의 모든 유저 경고 기록을 완전히 삭제합니다.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // 위험한 기능이므로 관리자 권한으로 상향
    async execute(interaction) {
        const guildId = interaction.guild.id;

        const result = db.clearAllGuildWarnings(guildId);

        if (result.changes > 0) {
            await interaction.reply(`서버의 모든 경고 기록(총 ${result.changes}개)이 성공적으로 초기화되었습니다.`);
        } else {
            await interaction.reply('초기화할 경고 기록이 없습니다.');
        }
    },
};
