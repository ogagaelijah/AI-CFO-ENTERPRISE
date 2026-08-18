// src/interfaces/telegram/handlers/subscriptionHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');
const GetCurrentPlanUseCase = require('../../../application/useCases/subscriptions/GetCurrentPlanUseCase');
const CheckFeatureAccessUseCase = require('../../../application/useCases/subscriptions/CheckFeatureAccessUseCase');
const { getMainMenuKeyboard } = require('../keyboards/dashboardKeyboard');
const plansConfig = require('../../../config/plans');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const subscriptionRepo = new SubscriptionRepository();

const getCurrentPlanUseCase = new GetCurrentPlanUseCase({
    subscriptionRepository: subscriptionRepo,
    businessRepository: businessRepo,
    plansConfig,
});

const checkFeatureAccessUseCase = new CheckFeatureAccessUseCase({
    subscriptionRepository: subscriptionRepo,
    businessRepository: businessRepo,
    plansConfig,
});

async function subscriptionHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const user = await userRepo.findByTelegramId(telegramId);

        if (!user) {
            await ctx.reply('⚠️ Please register first. Type /start');
            return;
        }

        const business = await businessRepo.findByUserId(user.id);
        if (!business) {
            await ctx.reply('⚠️ Please set up your business first. Type /start');
            return;
        }

        await showSubscriptionMenu(ctx, business.id);

    } catch (error) {
        logger.error('Subscription handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function showSubscriptionMenu(ctx, businessId) {
    const result = await getCurrentPlanUseCase.execute({ businessId });

    if (!result.success) {
        await ctx.reply('❌ Could not retrieve subscription details.');
        return;
    }

    const plan = result.plan;
    const subscription = result.subscription;

    let message = `📋 **Subscription & Plan Details**\n\n`;
    message += `📊 **Current Plan:** ${plan.name}\n`;
    message += `📝 **Status:** ${plan.status.toUpperCase()}\n`;

    if (plan.isTrial) {
        message += `⏳ **Trial Days Remaining:** ${plan.daysRemaining}\n`;
    }

    message += `💰 **Price:** ₦${plan.price.toLocaleString()}/month\n\n`;

    message += `**✨ Features Included:**\n`;
    if (plan.features) {
        for (const [key, value] of Object.entries(plan.features)) {
            if (value) {
                message += `• ✅ ${key.replace(/_/g, ' ').toUpperCase()}\n`;
            }
        }
    }

    message += `\n**📊 Available Plans:**\n`;
    for (const p of result.availablePlans) {
        const isCurrent = p.id === plan.id ? ' ✅' : '';
        message += `• ${p.name}: ₦${p.price.toLocaleString()}/month${isCurrent}\n`;
    }

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '⬆️ Upgrade Plan', callback_data: 'subscription_upgrade' }],
                [{ text: '📊 Feature Access Check', callback_data: 'subscription_features' }],
                [{ text: '❌ Cancel Subscription', callback_data: 'subscription_cancel' }],
                [{ text: '🔙 Back to Menu', callback_data: 'back_main' }],
            ],
        },
    };

    await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
}

async function handleButtonClick(ctx, businessId) {
    const data = ctx.callbackQuery?.data;

    await ctx.answerCallbackQuery();

    switch (data) {
        case 'subscription_upgrade':
            await handleUpgrade(ctx, businessId);
            break;

        case 'subscription_features':
            await handleFeatureCheck(ctx, businessId);
            break;

        case 'subscription_cancel':
            await handleCancel(ctx, businessId);
            break;

        case 'back_main':
            const { startHandler } = require('./startHandler');
            await startHandler(ctx);
            break;

        default:
            await showSubscriptionMenu(ctx, businessId);
    }
}

async function handleUpgrade(ctx, businessId) {
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📈 Upgrade to Pro (₦5,000/mo)', callback_data: 'upgrade_pro' }],
                [{ text: '🏢 Upgrade to Business (₦15,000/mo)', callback_data: 'upgrade_business' }],
                [{ text: '🔙 Back', callback_data: 'back_subscription' }],
            ],
        },
    };

    await ctx.reply(
        `⬆️ **Upgrade Your Plan**

Choose a plan that best fits your business needs:

**Pro** — ₦5,000/month
• All standard features
• Unlimited transactions
• Priority support

**Business** — ₦15,000/month
• All Pro features
• Multi-user access
• Advanced AI insights
• Dedicated account manager

Which plan would you like?`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}

async function handleFeatureCheck(ctx, businessId) {
    const features = ['inventory', 'debtors', 'creditors', 'reports', 'forecasting', 'ai_insights'];

    let message = `📊 **Feature Access Check**\n\n`;

    for (const feature of features) {
        const result = await checkFeatureAccessUseCase.execute({
            businessId,
            feature,
        });

        const status = result.hasAccess ? '✅' : '❌';
        message += `${status} ${feature.replace(/_/g, ' ').toUpperCase()}: ${result.message}\n`;
    }

    await ctx.reply(message);

    await ctx.reply('Select an option:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Back to Subscription', callback_data: 'back_subscription' }],
            ],
        },
    });
}

async function handleCancel(ctx, businessId) {
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '✅ Yes, Cancel Subscription', callback_data: 'cancel_confirm' }],
                [{ text: '🔙 No, Go Back', callback_data: 'back_subscription' }],
            ],
        },
    };

    await ctx.reply(
        `⚠️ **Cancel Subscription**

Are you sure you want to cancel your subscription?

• You will lose access to premium features
• Your data will remain safe
• You can reactivate anytime

Please confirm:`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}

module.exports = {
    subscriptionHandler,
    showSubscriptionMenu,
};