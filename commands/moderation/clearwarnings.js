const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('경고초기화')
        .setDescription('서버의 모든 유저 경고 기록을 완전히 삭제합니다.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // 위험한 기능이므로 관리자 권한으로 상향
    async execute(interaction) {
        const guildId = interaction.guild.id;

        // 응답 지연 (데이터 처리 및 메시지 발송 시간 확보)
        await interaction.deferReply();

        // --- [1단계] 데이터 처리 ---
        const result = db.clearAllGuildWarnings(guildId);

        // --- [2단계] 임베드 메세지 구성 ---
        const embed = new EmbedBuilder()
            .setTitle(':rotating_light: 서버 경고 전체 초기화')
            .setColor(result.changes > 0 ? 0x2ECC71 : 0x95A5A6)
            .setDescription(
                `### 처리자:        \n` +
                `> ${interaction.user}\n\n` +
                `### 처리 결과:        \n` +
                `> ${result.changes > 0 ? `서버의 모든 경고 기록(총 **${result.changes}개**)이 성공적으로 초기화되었습니다.` : '초기화할 경고 기록이 없습니다.'}`
            )
            .setTimestamp();

        // --- [3단계] 최종 메세지 발송 ---
        await interaction.editReply({
            embeds: [embed]
        });

        // 성공 로그 기록
        logger.logSuccess(interaction);
    },
};

