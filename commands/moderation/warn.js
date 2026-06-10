const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('경고')
        .setDescription('유저에게 경고를 부여합니다.')
        .addUserOption(option =>
            option.setName('대상')
                .setDescription('경고를 줄 유저')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('사유')
                .setDescription('경고 사유')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        const target = interaction.options.getUser('대상');
        const reason = interaction.options.getString('사유') || '사유 없음';
        const guildId = interaction.guild.id;
        const moderatorId = interaction.user.id;

        // 1. 본인 경고 방지
        if (target.id === interaction.user.id) {
            return await interaction.reply({ content: '자기 자신에게 경고를 줄 수 없습니다.', ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(target.id);
        const moderator = await interaction.guild.members.fetch(moderatorId);

        // 2. 권한 계층 확인 (본인보다 높거나 같은 역할의 유저는 경고 불가)
        if (member.roles.highest.position >= moderator.roles.highest.position && interaction.guild.ownerId !== moderatorId) {
            return await interaction.reply({ content: '본인보다 높거나 같은 역할을 가진 멤버에게는 경고를 줄 수 없습니다.', ephemeral: true });
        }

        // 응답 지연 (데이터 처리 및 메시지 발송 시간 확보)
        await interaction.deferReply();

        // --- [1단계] 데이터 기록 및 누적 횟수 계산 ---
        db.addWarning(target.id, guildId, reason, moderatorId);
        const warnings = db.getWarnings(target.id, guildId);
        const warnCount = warnings.length;

        // --- [2단계] 임베드 메세지 구성 (여기서 디자인을 수정하세요) ---
        const warnEmbed = new EmbedBuilder()
            .setTitle(':rotating_light: 유저 경고 부여 안내') // 임베드의 제목
            .setColor(0xFF0000) // 임베드 왼쪽 선의 색상
            .setThumbnail(target.displayAvatarURL({ dynamic: true })) // 우측 상단에 대상자 프로필 사진 추가
            .setDescription(
                `### 처리자:        \n` +
                `> ${interaction.user}\n\n` +
                `### 대상자:        \n` +
                `> ${target}\n\n` +
                `### 경고 누적:        \n` +
                `> ${warnCount}\n\n` +
                `### 사유:        \n` +
                `> ${reason}`
            )
            .setTimestamp(); // 맨 아래에 현재 시간을 표시

        // --- [3단계] 최종 메세지 발송 ---
        await interaction.editReply({
            // content: 채팅창에 일반 텍스트로 찍히는 부분 (멘션용)
            content: `${target}`,
            // embeds: 위에 만든 박스 형태의 메세지
            embeds: [warnEmbed]
        });
    },
};
