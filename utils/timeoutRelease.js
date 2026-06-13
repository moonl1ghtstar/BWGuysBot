const { EmbedBuilder } = require('discord.js');
const db = require('../database/db');

async function sendTimeoutReleaseToChannel(
    guild,
    channelId,
    messageId,
    payload
) {
    if (!channelId) return;

    try {
        const channel = await guild.channels.fetch(channelId);

        if (!channel?.isTextBased()) return;

        if (messageId) {
            try {
                const originalMessage =
                    await channel.messages.fetch(messageId);

                await originalMessage.reply(payload);
                return;
            } catch { }
        }

        await channel.send(payload);
    } catch (error) {
        console.log(
            `Could not send timeout release message to channel ${channelId}`
        );
    }
}

async function sendTimeoutReleaseDM(
    member,
    payload
) {
    try {
        await member.user.send(payload);
    } catch {
        console.log(
            `Could not DM user ${member.user.tag}`
        );
    }
}

async function fetchMemberSafe(
    guild,
    userId
) {
    try {
        return await guild.members.fetch(userId);
    } catch {
        return null;
    }
}

function buildTimeoutReleaseEmbed(member) {
    return new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle(':white_check_mark: 타임아웃 해제')
        .setTimestamp();
}

async function deliverTimeoutRelease(client, row) {
    const guild = client.guilds.cache.get(row.guild_id);
    if (!guild) return false;

    if (!db.markTimeoutNotificationSent(row.user_id, row.guild_id).changes) {
        return false;
    }

    const member = await fetchMemberSafe(
        guild,
        row.user_id
    );

    if (!member) {
        db.clearTimeoutNotificationChannel(row.user_id, row.guild_id);
        return false;
    }

    const embed = buildTimeoutReleaseEmbed(member);
    const payload = { embeds: [embed] };

    await sendTimeoutReleaseToChannel(
        guild,
        row.channel_id,
        row.message_id,
        payload
    );

    await sendTimeoutReleaseDM(
        member,
        payload
    );

    db.clearTimeoutNotificationChannel(row.user_id, row.guild_id);
    return true;
}

async function sweepTimeoutReleases(client) {
    const rows = db.getExpiredTimeoutNotifications(new Date().toISOString());
    for (const row of rows) {
        await deliverTimeoutRelease(client, row);
    }
}

module.exports = {
    buildTimeoutReleaseEmbed,
    deliverTimeoutRelease,
    sweepTimeoutReleases,
};
