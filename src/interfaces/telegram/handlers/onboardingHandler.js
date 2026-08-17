// src/interfaces/telegram/handlers/onboardingHandler.js

const { getSessionManager } = require('../sessionManager');
const { getIndustryKeyboard } = require('../keyboards/industryKeyboard');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SetupBusinessUseCase = require('../../../application/useCases/onboarding/SetupBusinessUseCase');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const setupUseCase = new SetupBusinessUseCase(userRepo, businessRepo);

async function onboardingHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const text = ctx.message.text.trim();
        const session = sessionManager.getSession(telegramId);

        if (!session) {
            await ctx.reply('Please /start to begin.');
            return;
        }

        const state = session.state;
        const data = session.data || {};

        switch (state) {
            case 'WAITING_FOR_NAME':
                await handleName(ctx, telegramId, text, data);
                break;
            case 'WAITING_FOR_EMAIL':
                await handleEmail(ctx, telegramId, text, data);
                break;
            case 'WAITING_FOR_PHONE':
                await handlePhone(ctx, telegramId, text, data);
                break;
            case 'WAITING_FOR_PASSWORD':
                await handlePassword(ctx, telegramId, text, data);
                break;
            case 'WAITING_FOR_BUSINESS':
                await handleBusiness(ctx, telegramId, text, data);
                break;
            default:
                await ctx.reply('Type /start to begin.');
        }

    } catch (error) {
        logger.error('Onboarding error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function handleName(ctx, telegramId, text, data) {
    if (!text || text.length < 2) {
        await ctx.reply('Please enter your full name (at least 2 characters).');
        return;
    }
    sessionManager.setData(telegramId, { ...data, fullName: text });
    sessionManager.setState(telegramId, 'WAITING_FOR_EMAIL');
    await ctx.reply(`✅ Name saved.\n\n📧 Now, please enter your **email address**.`);
}

async function handleEmail(ctx, telegramId, text, data) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) {
        await ctx.reply('⚠️ Please enter a valid email address.');
        return;
    }
    sessionManager.setData(telegramId, { ...data, email: text });
    sessionManager.setState(telegramId, 'WAITING_FOR_PHONE');
    await ctx.reply(`✅ Email saved.\n\n📱 Now, please enter your **phone number**.`);
}

async function handlePhone(ctx, telegramId, text, data) {
    const cleaned = text.replace(/[^0-9+]/g, '');
    let formatted = cleaned;
    let valid = false;

    if (cleaned.startsWith('+234') && cleaned.length === 14) valid = true;
    else if (cleaned.startsWith('234') && cleaned.length === 13) { formatted = '+' + cleaned; valid = true; }
    else if (cleaned.startsWith('0') && cleaned.length === 11) { formatted = '+234' + cleaned.substring(1); valid = true; }
    else if (cleaned.length === 10 && !cleaned.startsWith('0')) { formatted = '+234' + cleaned; valid = true; }

    if (!valid) {
        await ctx.reply('⚠️ Please enter a valid Nigerian phone number.');
        return;
    }
    sessionManager.setData(telegramId, { ...data, phone: formatted });
    sessionManager.setState(telegramId, 'WAITING_FOR_PASSWORD');
    await ctx.reply(`✅ Phone saved.\n\n🔐 Create a **password** (min 8 chars, 1 number).`);
}

async function handlePassword(ctx, telegramId, text, data) {
    if (text.length < 8) {
        await ctx.reply('⚠️ Password must be at least 8 characters.');
        return;
    }
    if (!/\d/.test(text)) {
        await ctx.reply('⚠️ Password must contain at least one number.');
        return;
    }
    sessionManager.setData(telegramId, { ...data, password: text });
    sessionManager.setState(telegramId, 'WAITING_FOR_BUSINESS');
    await ctx.reply(`✅ Password set.\n\n🏢 What is your **business name**?`);
}

async function handleBusiness(ctx, telegramId, text, data) {
    if (!text || text.length < 2) {
        await ctx.reply('Please enter your business name.');
        return;
    }
    sessionManager.setData(telegramId, { ...data, businessName: text });
    sessionManager.setState(telegramId, 'WAITING_FOR_INDUSTRY');
    
    const keyboard = getIndustryKeyboard();
    await ctx.reply(
        `✅ Business name saved.\n\n🏭 Select your **industry**:`,
        keyboard
    );
}

module.exports = onboardingHandler;