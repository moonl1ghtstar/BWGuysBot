const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

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

        const warnings = db.getWarnings(target.id, guildId);

        if (warnings.length === 0) {
            return await interaction.reply({ content: `${target.tag} 유저는 경고 기록이 없습니다.`, ephemeral: true });
        }

        let description = `### ${target} 님의 경고 기록        \n\n`;
        description += `### 경고 누적:        \n`;
        description += `> \`${warnings.length}회 / 5회\`        \n\n`;

        warnings.forEach((warn, index) => {
            // DB의 timestamp 문자열을 Unix timestamp(초)로 변환 (Discord 타임스탬프용)
            const unixTime = Math.floor(new Date(warn.timestamp + ' UTC').getTime() / 1000);

            description += `### 경고 ${index + 1}:        \n`;
            description += `> **처리자:** <@${warn.moderator_id}>        \n`;
            description += `> **시각:** <t:${unixTime}:F> (<t:${unixTime}:R>)        \n`;
            description += `> **사유:** ${warn.reason || '없음'}        \n`;
        });

        // --- [2단계] 임베드 메세지 구성 (여기서 디자인을 수정하세요) ---
        const embed = new EmbedBuilder()
            .setTitle(':rotating_light: 경고 조회') // 임베드 제목
            .setColor(0x0099FF) // 임베드 왼쪽 선 색상 (하늘색)
            .setDescription(description) // 위에서 생성한 상세 내역이 들어가는 곳
            .setTimestamp(); // 하단 현재 시각 표시

        // --- [3단계] 최종 메세지 발송 ---
        await interaction.reply({
            // 💡 [메시지 설정] 유저 멘션 외에 추가하고 싶은 텍스트를 아래 content에 넣으세요.
            // 예: content: `${target}님의 경고 기록을 조회합니다.`,
            content: `${target}님의 경고 기록입니다.`,
            embeds: [embed]
        });
    },
};
