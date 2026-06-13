const Database = require('better-sqlite3');
const logger = require('../utils/logger');
const db = new Database('database.sqlite');
const time = logger.getFormattedTime();
console.log(`[${time}] [SYSTEM] SQLite database initialized successfully.`);

// Create warnings table
db.prepare(`
    CREATE TABLE IF NOT EXISTS warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        reason TEXT,
        moderator_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS timeout_notifications (
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, guild_id)
    )
`).run();

module.exports = {
    addWarning: (userId, guildId, reason, moderatorId) => {
        const stmt = db.prepare('INSERT INTO warnings (user_id, guild_id, reason, moderator_id) VALUES (?, ?, ?, ?)');
        return stmt.run(userId, guildId, reason, moderatorId);
    },
    getWarnings: (userId, guildId) => {
        const stmt = db.prepare('SELECT * FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY id ASC');
        return stmt.all(userId, guildId);
    },
    clearWarnings: (userId, guildId) => {
        const stmt = db.prepare('DELETE FROM warnings WHERE user_id = ? AND guild_id = ?');
        return stmt.run(userId, guildId);
    },
    removeWarning: (id) => {
        const stmt = db.prepare('DELETE FROM warnings WHERE id = ?');
        return stmt.run(id);
    },
    clearAllGuildWarnings: (guildId) => {
        const stmt = db.prepare('DELETE FROM warnings WHERE guild_id = ?');
        return stmt.run(guildId);
    },
    setTimeoutNotificationChannel: (userId, guildId, channelId) => {
        const stmt = db.prepare(`
            INSERT INTO timeout_notifications (user_id, guild_id, channel_id)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, guild_id) DO UPDATE SET
                channel_id = excluded.channel_id,
                updated_at = CURRENT_TIMESTAMP
        `);
        return stmt.run(userId, guildId, channelId);
    },
    getTimeoutNotificationChannel: (userId, guildId) => {
        const stmt = db.prepare('SELECT channel_id FROM timeout_notifications WHERE user_id = ? AND guild_id = ?');
        return stmt.get(userId, guildId);
    },
    clearTimeoutNotificationChannel: (userId, guildId) => {
        const stmt = db.prepare('DELETE FROM timeout_notifications WHERE user_id = ? AND guild_id = ?');
        return stmt.run(userId, guildId);
    }
};
