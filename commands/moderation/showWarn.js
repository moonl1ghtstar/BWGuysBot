const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../database/db');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('경고조회')
        .setDescription('유저의 경고 기록을 조회합니다.')
        .addUserOption(option =>
            option.setName('대상')
                .setDescription('조회할 유저')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('대상');
        const guildId = interaction.guild.id;

        // 1. 봇 조회 방지
        if (target.bot) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(':x: 실행 실패')
                .setColor(0xFF0000)
                .setDescription('> 봇의 경고 기록은 조회할 수 없습니다.')
                .setTimestamp();
            logger.logFailure(interaction, '봇 경고조회 시도');
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // --- [1단계] 데이터 처리 및 내역 구성 ---
        const warnings = db.getWarnings(target.id, guildId);

        if (warnings.length === 0) {
            const errorEmbed = new EmbedBuilder()
                .setTitle(':x: 실행 실패')
                .setColor(0xFF0000)
                .setDescription(`> **${target.tag}** 유저는 경고 기록이 없습니다.`)
                .setTimestamp();
            logger.logFailure(interaction, '경고 기록이 없는 유저의 경고조회 시도');
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        let description = `### ${target} 님의 경고 기록        \n\n`;
        description += `### 경고 누적:        \n`;
        description += `> \`${warnings.length}회 / 5회\`        \n\n`;

        warnings.forEach((warn, index) => {
            // DB의 timestamp 문자열을 ISO-8601 표준 형식으로 변환 후 Unix timestamp(초)로 변환
            const utcString = warn.timestamp.replace(' ', 'T') + 'Z';
            const unixTime = Math.floor(new Date(utcString).getTime() / 1000);

            description += `### 경고 ${index + 1}:        \n`;
            description += `> **처리자:** <@${warn.moderator_id}>        \n`;
            description += `> **시각:** <t:${unixTime}:F> (<t:${unixTime}:R>)        \n`;
            description += `> **사유:** ${warn.reason || '없음'}        \n`;
        });

        // --- [2단계] 임베드 메세지 구성 ---
        const embed = new EmbedBuilder()
            .setTitle(':rotating_light: 경고 조회') // 임베드 제목
            .setColor(0x0099FF) // 임베드 왼쪽 선 색상 (하늘색)
            .setDescription(description) // 위에서 생성한 상세 내역이 들어가는 곳
            .setTimestamp(); // 하단 현재 시각 표시

        // --- [3단계] 최종 메세지 발송 ---
        await interaction.reply({
            content: `${target}님의 경고 기록입니다.`,
            embeds: [embed]
        });

        // 성공 로그 기록
        logger.logSuccess(interaction);
    },
};

