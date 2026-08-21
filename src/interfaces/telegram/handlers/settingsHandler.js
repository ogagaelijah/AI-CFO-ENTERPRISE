// src/interfaces/telegram/handlers/settingsHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const { getSettingsKeyboard, getMainMenuKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();

async function settingsHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const businesses = await businessRepo.findByUserId(user.id);
        const business = Array.isArray(businesses) && businesses.length > 0 ? businesses[0] : null;
        const industry = business ? business.industry : 'RETAIL';

        // Handle callback queries
        if (ctx.callbackQuery && ctx.callbackQuery.data) {
            const data = ctx.callbackQuery.data;
            await ctx.answerCbQuery();

            if (data === 'settings_profile') {
                await showProfile(ctx, user);
                return;
            }

            if (data === 'settings_business') {
                await showBusiness(ctx, business);
                return;
            }

            if (data === 'menu_subscription') {
                const { subscriptionHandler } = require('./subscriptionHandler');
                await subscriptionHandler(ctx);
                return;
            }

            if (data === 'menu_back' || data === 'back_main') {
                await ctx.editMessageText(
                    `📊 **Main Menu**\n\nSelect an option below:`,
                    { parse_mode: 'Markdown', ...getMainMenuKeyboard(industry) }
                );
                return;
            }

            if (data === 'settings_back') {
                await showSettingsMenu(ctx, business);
                return;
            }
        }

        // Show settings menu (first time or direct call)
        await showSettingsMenu(ctx, business);

    } catch (error) {
        logger.error('Settings handler error:', error);
        console.error('Settings handler error details:', error.message, error.stack);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function showSettingsMenu(ctx, business) {
    const telegramId = ctx.from.id;
    sessionManager.setState(telegramId, 'SETTINGS_MENU');

    const keyboard = getSettingsKeyboard();

    await ctx.editMessageText(
        `⚙️ **Settings**

Manage your account and business preferences.

👤 **Profile** — Update your personal information
🏢 **Business** — Update business details
📋 **Subscription** — Manage your plan

Select an option below:`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}

async function showProfile(ctx, user) {
    let message = `👤 **Profile Settings**\n\n`;
    message += `📛 Name: ${user.fullName || 'Not set'}\n`;
    message += `📧 Email: ${user.email || 'Not set'}\n`;
    message += `📱 Phone: ${user.phoneNumber || 'Not set'}\n`;
    message += `🆔 User ID: ${user.id}\n`;
    message += `📅 Joined: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}\n\n`;

    message += `To update your profile, contact support.`;

    await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...{
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Back to Settings', callback_data: 'settings_back' }],
                    [{ text: '🔙 Back to Main Menu', callback_data: 'back_main' }],
                ],
            },
        },
    });
}

async function showBusiness(ctx, business) {
    if (!business) {
        await ctx.reply('⚠️ No business found. Please set up your business first.');
        return;
    }

    let message = `🏢 **Business Settings**\n\n`;
    message += `📛 Name: ${business.name || 'Not set'}\n`;
    message += `🏭 Industry: ${business.industry || 'Not set'}\n`;
    message += `🆔 Business ID: ${business.id}\n`;
    message += `📅 Created: ${business.createdAt ? new Date(business.createdAt).toLocaleDateString() : 'N/A'}\n\n`;

    message += `To update your business details, contact support.`;

    await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...{
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Back to Settings', callback_data: 'settings_back' }],
                    [{ text: '🔙 Back to Main Menu', callback_data: 'back_main' }],
                ],
            },
        },
    });
}

module.exports = {
    settingsHandler,
    showSettingsMenu,
    showProfile,
    showBusiness,
};