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

module.exports = {
    addWarning: (userId, guildId, reason, moderatorId) => {
        const stmt = db.prepare('INSERT INTO warnings (user_id, guild_id, reason, moderator_id) VALUES (?, ?, ?, ?)');
        return stmt.run(userId, guildId, reason, moderatorId);
    },
    getWarnings: (userId, guildId) => {
        const stmt = db.prepare('SELECT * FROM warnings WHERE user_id = ? AND guild_id = ?');
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
    }
};
