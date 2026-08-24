// src/servers/telegram.js
const { getBotInstance } = require('../interfaces/telegram/bot');

let botInstance = null;

const startTelegramBot = async () => {
    try {
        const bot = getBotInstance();
        const botInstance = bot.getBot();
        
        // Register all commands and handlers here
        // (This should be the same as your existing bot setup)
        
        await botInstance.launch();
        console.log('🤖 Telegram Bot launched successfully');
        return botInstance;
    } catch (error) {
        console.warn('⚠️ Failed to launch Telegram Bot:', error.message);
        return null;
    }
};

const stopTelegramBot = () => {
    if (botInstance) {
        botInstance.stop('SIGTERM');
        console.log('🛑 Telegram Bot stopped');
    }
};

module.exports = { startTelegramBot, stopTelegramBot };