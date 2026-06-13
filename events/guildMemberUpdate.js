const { Events } = require('discord.js');
const { deliverTimeoutRelease } = require('../utils/timeoutRelease');
const db = require('../database/db');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        const wasTimedOut = Boolean(oldMember.communicationDisabledUntilTimestamp);
        const isTimedOut = Boolean(newMember.communicationDisabledUntilTimestamp);

        if (!wasTimedOut || isTimedOut) return;

        const row = db.getTimeoutNotificationChannel(newMember.id, newMember.guild.id);
        if (!row || row.notified_at) return;

        await deliverTimeoutRelease(newMember.client, row);
    },
};
