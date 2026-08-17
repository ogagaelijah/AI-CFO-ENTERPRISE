// src/config/index.js
require('dotenv').config();

module.exports = {
    botToken: process.env.BOT_TOKEN,
    databasePath: process.env.DATABASE_PATH || './ai-cfo.db',
    env: process.env.NODE_ENV || 'development',
};