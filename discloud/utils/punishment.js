const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');

/**
 * 유저를 타임아웃 시키고 결과 임베드를 반환합니다.
 * @param {GuildMember} member 타임아웃 대상 멤버
 * @param {number} durationMs 타임아웃 기간 (ms)
 * @param {string} reason 사유
 * @returns {EmbedBuilder|null} 성공 시 결과 임베드, 실패 시 null
 */
async function applyTimeout(member, durationMs, reason, channelId = null) {
    if (!member || !member.moderatable) return null;

    try {
        await member.timeout(durationMs, reason);
        if (channelId) {
            db.setTimeoutNotificationChannel(member.id, member.guild.id, channelId);
        }

        const durationMinutes = Math.floor(durationMs / 60000);
        const durationText = durationMinutes >= 1440 ? `${Math.floor(durationMinutes / 1440)}일` :
            durationMinutes >= 60 ? `${Math.floor(durationMinutes / 60)}시간` : `${durationMinutes}분`;

        return new EmbedBuilder()
            .setTitle(':timeout: 자동 처벌: 타임아웃')
            .setColor(0xF1C40F)
            .setDescription(`> **${member.user.tag}** 유저가 **${durationText}** 동안 타임아웃 되었습니다.`)
            .setTimestamp();
    } catch (error) {
        console.error('[ERROR] Timeout 실행 중 오류:', error);
        return null;
    }
}

/**
 * 유저를 차단하고 결과 임베드를 반환합니다.
 * @param {GuildMember} member 차단 대상 멤버
 * @param {string} reason 사유
 * @returns {EmbedBuilder|null} 성공 시 결과 임베드, 실패 시 null
 */
async function applyBan(member, reason) {
    if (!member || !member.bannable) return null;

    try {
        await member.ban({ reason });

        return new EmbedBuilder()
            .setTitle(':ban: 자동 처벌: 서버 차단')
            .setColor(0xFF0000)
            .setDescription(`> **${member.user.tag}** 유저가 서버에서 **차단**되었습니다.`)
            .setTimestamp();
    } catch (error) {
        console.error('[ERROR] Ban 실행 중 오류:', error);
        return null;
    }
}

module.exports = {
    applyTimeout,
    applyBan
};
