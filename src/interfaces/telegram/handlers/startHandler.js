// src/interfaces/telegram/handlers/startHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const { getMainMenuKeyboard } = require('../keyboards/dashboardKeyboard');
const { INDUSTRIES } = require('../../../config/industries');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();

async function startHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const username = ctx.from.username || 'User';

        logger.info(`📱 /start from @${username} (${telegramId})`);

        const existingUser = await userRepo.findByTelegramId(telegramId);
        
        if (existingUser) {
            const businesses = await businessRepo.findByUserId(existingUser.id);
            const business = businesses.length > 0 ? businesses[0] : null;
            
            const industry = business ? INDUSTRIES[business.industry] : null;
            const industryName = industry ? `${industry.icon} ${industry.name}` : business?.industry || 'N/A';
            
            const fullName = existingUser.fullName || 'User';
            
            // Build welcome message
            let message =
                `👋 Welcome back, **${fullName}**!\n` +
                `🏢 Business: ${business ? business.name : 'N/A'}\n` +
                `🏭 Industry: ${industryName}\n\n` +
                `📋 **Account Status**\n` +
                `─────────────────────\n`;

            const createdAt = new Date(existingUser.createdAt);
            const trialEndDate = new Date(createdAt);
            trialEndDate.setDate(trialEndDate.getDate() + 30);
            const today = new Date();
            const daysRemaining = Math.ceil((trialEndDate - today) / (1000 * 60 * 60 * 24));

            if (daysRemaining > 0) {
                message += `✅ Free Trial Active\n`;
                message += `⏳ ${daysRemaining} days remaining\n`;
                message += `📅 Trial ends: ${trialEndDate.toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}`;
            } else {
                message += `⚠️ Free Trial Expired\n`;
                message += `⏳ Please upgrade to continue`;
            }

            message += `\n\n📊 **Select an option below to get started:**`;

            const keyboard = getMainMenuKeyboard(business ? business.industry : 'RETAIL');

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                ...keyboard,
            });
            return;
        }

        const session = sessionManager.getSession(telegramId);
        if (session && session.state !== 'IDLE') {
            await ctx.reply(
                `⏳ You have an ongoing process. Please complete it first.\n` +
                `Type /cancel to cancel.`
            );
            return;
        }

        sessionManager.createSession(telegramId, 'WAITING_FOR_NAME', { username });
        await ctx.reply(
            `🏢 Welcome to **AI CFO ENTERPRISE**!\n\n` +
            `Your all-in-one business management platform.\n` +
            `🚀 Built for African SMEs.\n\n` +
            `Let's get your business set up.\n` +
            `📝 Please provide your **full name**.`
        );

    } catch (error) {
        logger.error('Start error:', error);
        await ctx.reply('❌ Something went wrong. Please try /start again.');
    }
}

async function helpHandler(ctx) {
    const telegramId = ctx.from.id;
    const user = await userRepo.findByTelegramId(telegramId);
    const isRegistered = !!user;

    let helpMessage =
        `📚 **AI CFO ENTERPRISE Help**\n\n` +
        `/start - Start registration or show menu\n` +
        `/help - Show this message\n` +
        `/cancel - Cancel current operation\n`;

    if (isRegistered) {
        helpMessage += `\n📊 **Available Commands:**\n`;
        helpMessage += `/login - Login to your account\n`;
        helpMessage += `/dashboard - View your dashboard\n`;
        helpMessage += `/sale - Record a sale\n`;
        helpMessage += `/income - Record income\n`;
        helpMessage += `/expense - Record expense\n`;
        helpMessage += `/inventory - Manage inventory\n`;
        helpMessage += `/debtors - Manage debtors\n`;
        helpMessage += `/creditors - Manage creditors\n`;
        helpMessage += `/reports - Generate reports\n`;
        helpMessage += `/help - Show this message\n`;
    } else {
        helpMessage += `\nType /start to register your business.`;
    }

    await ctx.reply(helpMessage);
}

async function cancelHandler(ctx) {
    const telegramId = ctx.from.id;
    sessionManager.clearSession(telegramId);
    await ctx.reply(`✅ Cancelled.\nType /start to begin again.`);
}

module.exports = { startHandler, helpHandler, cancelHandler };