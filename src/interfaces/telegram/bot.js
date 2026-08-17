// src/interfaces/telegram/bot.js

const { Telegraf } = require('telegraf');
const config = require('../../config');
const logger = require('../../shared/utils/logger');

class TelegramBot {
    constructor() {
        this.bot = null;
        this.isRunning = false;
    }

    initialize() {
        if (!config.botToken) {
            throw new Error('BOT_TOKEN is required in .env file');
        }

        this.bot = new Telegraf(config.botToken);
        
        this.bot.catch((err, ctx) => {
            logger.error('Telegram bot error:', err);
        });

        logger.info('🤖 Telegram bot initialized');
        return this.bot;
    }

    getBot() {
        if (!this.bot) {
            this.initialize();
        }
        return this.bot;
    }

    async launch() {
        if (this.isRunning) {
            logger.warn('Bot is already running');
            return;
        }

        try {
            const bot = this.getBot();
            const me = await bot.telegram.getMe();
            logger.info(`🚀 Bot launched: @${me.username}`);
            
            await bot.launch({
                dropPendingUpdates: true,
            });
            
            this.isRunning = true;
            
            process.once('SIGINT', () => this.stop('SIGINT'));
            process.once('SIGTERM', () => this.stop('SIGTERM'));
            
            console.log(`✅ Bot is running!`);
            console.log(`🤖 Connected as: @${me.username}`);
            console.log(`📱 Send /start to begin`);
            console.log('=====================================');
            
        } catch (error) {
            logger.error('Failed to launch bot:', error);
            throw error;
        }
    }

    stop(signal) {
        if (this.bot && this.isRunning) {
            logger.info(`🛑 Bot stopping (${signal})`);
            this.bot.stop(signal);
            this.isRunning = false;
        }
    }

    registerHandlers(handlers) {
        const bot = this.getBot();
        
        for (const [command, handler] of Object.entries(handlers)) {
            if (command === 'start') {
                bot.start(handler);
            } else if (command === 'help') {
                bot.help(handler);
            } else if (command.startsWith('on_')) {
                const eventName = command.replace('on_', '');
                bot.on(eventName, handler);
            } else {
                bot.command(command, handler);
            }
        }
        
        logger.info(`📋 Registered ${Object.keys(handlers).length} handlers`);
    }

    use(middleware) {
        this.getBot().use(middleware);
        return this;
    }
}

let botInstance = null;

function getBotInstance() {
    if (!botInstance) {
        botInstance = new TelegramBot();
    }
    return botInstance;
}

module.exports = { TelegramBot, getBotInstance };