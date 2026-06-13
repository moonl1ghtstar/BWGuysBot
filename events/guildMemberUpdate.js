const { Events, EmbedBuilder } = require('discord.js');
const db = require('../database/db');

function formatSeoulTime(date = new Date()) {
    return new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(date);
}

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        const wasTimedOut = Boolean(oldMember.communicationDisabledUntilTimestamp);
        const isTimedOut = Boolean(newMember.communicationDisabledUntilTimestamp);

        if (!wasTimedOut || isTimedOut) return;

        const time = formatSeoulTime(new Date());
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setAuthor({ name: `${time} | :white_check_mark: 타임아웃 해제` })
            .setDescription(`> **${newMember.guild.name}** 서버에서 타임아웃이 해제되었습니다.`)
            .addFields(
                { name: '대상', value: `${newMember.user.tag}`, inline: true },
                { name: '해제 시각', value: time, inline: true }
            )
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        const payload = { embeds: [embed.toJSON()] };
        const timeoutChannel = db.getTimeoutNotificationChannel(newMember.id, newMember.guild.id);

        if (timeoutChannel?.channel_id) {
            const channel = newMember.guild.channels.cache.get(timeoutChannel.channel_id);
            if (channel?.isTextBased()) {
                try {
                    await channel.send(payload);
                } catch (error) {
                    console.log(`Could not send timeout release message to channel ${timeoutChannel.channel_id}`);
                }
            }
            db.clearTimeoutNotificationChannel(newMember.id, newMember.guild.id);
        }

        try {
            await newMember.user.send(payload);
        } catch (error) {
            console.log(`Could not DM user ${newMember.user.tag}`);
        }
    },
};
