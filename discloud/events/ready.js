const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        const time = logger.getFormattedTime();
        console.log(`[${time}] [INFO] Ready! Logged in as ${client.user.tag}`);
    },
};