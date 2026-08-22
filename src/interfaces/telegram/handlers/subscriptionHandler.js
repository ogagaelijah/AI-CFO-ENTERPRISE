// src/interfaces/telegram/handlers/subscriptionHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');
const GetCurrentPlanUseCase = require('../../../application/useCases/subscriptions/GetCurrentPlanUseCase');
const CheckFeatureAccessUseCase = require('../../../application/useCases/subscriptions/CheckFeatureAccessUseCase');
const { getMainMenuKeyboard, getSubscriptionKeyboard } = require('../keyboards/dashboardKeyboard');
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

        // Get business - handle both array and single object
        let business = await businessRepo.findByUserId(user.id);
        
        if (Array.isArray(business) && business.length > 0) {
            business = business[0];
        }
        
        if (!business) {
            await ctx.reply('⚠️ Please set up your business first. Type /start');
            return;
        }

        // Check if this is a callback query
        if (ctx.callbackQuery && ctx.callbackQuery.data) {
            const data = ctx.callbackQuery.data;
            
            // Handle subscription callback actions
            if (data === 'subscription_view') {
                await ctx.answerCbQuery('Loading plan details...');
                await showSubscriptionMenu(ctx, business.id);
                return;
            }
            if (data === 'subscription_upgrade') {
                await ctx.answerCbQuery('Loading upgrade options...');
                await handleUpgrade(ctx, business.id);
                return;
            }
            if (data === 'subscription_features') {
                await ctx.answerCbQuery('Checking features...');
                await handleFeatureCheck(ctx, business.id);
                return;
            }
            if (data === 'subscription_cancel') {
                await ctx.answerCbQuery('Loading cancellation...');
                await handleCancel(ctx, business.id);
                return;
            }
            if (data === 'back_subscription') {
                await ctx.answerCbQuery('Going back...');
                await showSubscriptionMenu(ctx, business.id);
                return;
            }
            if (data === 'upgrade_pro' || data === 'upgrade_business') {
                await ctx.answerCbQuery('Processing upgrade...');
                await handleUpgradeConfirm(ctx, business.id, data);
                return;
            }
            if (data === 'cancel_confirm') {
                await ctx.answerCbQuery('Cancelling subscription...');
                await handleCancelConfirm(ctx, business.id);
                return;
            }
            if (data === 'menu_back' || data === 'back_main') {
                await ctx.answerCbQuery('Going back...');
                await ctx.editMessageText(
                    `📊 Main Menu\n\nSelect an option below:`,
                    { ...getMainMenuKeyboard() }
                );
                return;
            }
        }

        // Default: Show subscription menu
        await showSubscriptionMenu(ctx, business.id);

    } catch (error) {
        logger.error('Subscription handler error:', error);
        console.error('Subscription error details:', error.message);
        
        if (ctx.callbackQuery) {
            await ctx.answerCbQuery('Something went wrong');
        }
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function showSubscriptionMenu(ctx, businessId) {
    try {
        // Try to get current plan using the use case
        let result = null;
        try {
            result = await getCurrentPlanUseCase.execute({ businessId });
        } catch (useCaseError) {
            console.error('❌ Use case error:', useCaseError.message);
        }

        // If use case fails or result is invalid, use fallback
        if (!result || !result.success || !result.plan) {
            console.log('⚠️ No valid plan found, showing fallback menu');
            await showFallbackSubscriptionMenu(ctx, businessId);
            return;
        }

        const plan = result.plan;

        // Build the subscription menu message
        let message = `📋 Subscription & Plan Details\n\n`;
        message += `📊 Current Plan: ${plan.name || 'Free'}\n`;
        message += `📝 Status: ${(plan.status || 'ACTIVE').toUpperCase()}\n`;

        if (plan.isTrial) {
            message += `⏳ Trial Days Remaining: ${plan.daysRemaining || 0}\n`;
        }

        message += `💰 Price: ₦${(plan.price || 0).toLocaleString()}/month\n\n`;

        message += `✨ Features Included:\n`;
        if (plan.features) {
            const featureMap = {
                sales: 'Sales Tracking',
                income: 'Income Management',
                expenses: 'Expense Management',
                purchases: 'Purchase Management',
                inventory: 'Inventory Management',
                debtors: 'Debtors Management',
                creditors: 'Creditors Management',
                customers: 'Customer Management',
                suppliers: 'Supplier Management',
                projects: 'Project Management',
                reports: 'Reports & Analytics',
                forecasting: 'Forecasting',
                ai_insights: 'AI Insights',
                multi_user: 'Multi-User Access',
                support: 'Priority Support'
            };
            
            let hasFeatures = false;
            for (const [key, value] of Object.entries(plan.features)) {
                if (value) {
                    const label = featureMap[key] || key.replace(/_/g, ' ').toUpperCase();
                    message += `• ✅ ${label}\n`;
                    hasFeatures = true;
                }
            }
            if (!hasFeatures) {
                message += `• Basic features included\n`;
            }
        } else {
            message += `• Basic features included\n`;
        }

        message += `\n📊 Available Plans:\n`;
        if (result.availablePlans && result.availablePlans.length > 0) {
            for (const p of result.availablePlans) {
                const isCurrent = p.id === plan.id ? ' ✅ (Current)' : '';
                message += `• ${p.name}: ₦${(p.price || 0).toLocaleString()}/month${isCurrent}\n`;
            }
        } else {
            message += `• Free: ₦0/month\n`;
            message += `• Pro: ₦5,000/month\n`;
            message += `• Business: ₦15,000/month\n`;
        }

        message += `\n💡 Upgrade to unlock more features!`;

        const keyboard = getSubscriptionKeyboard();

        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, { ...keyboard });
        } else {
            await ctx.reply(message, { ...keyboard });
        }

    } catch (error) {
        logger.error('Show subscription menu error:', error);
        console.error('Show subscription menu error:', error.message);
        await showFallbackSubscriptionMenu(ctx, businessId);
    }
}

async function showFallbackSubscriptionMenu(ctx, businessId) {
    let message = `📋 Subscription & Plan Details\n\n`;
    message += `📊 Current Plan: Free\n`;
    message += `📝 Status: ACTIVE\n`;
    message += `💰 Price: ₦0/month\n\n`;
    
    message += `✨ Features Included:\n`;
    message += `• ✅ Sales Tracking\n`;
    message += `• ✅ Income Management\n`;
    message += `• ✅ Expense Management\n`;
    message += `• ✅ Purchase Management\n`;
    message += `• ✅ Inventory Management\n`;
    message += `• ✅ Debtors & Creditors\n`;
    message += `• ✅ Customer Management\n`;
    message += `• ✅ Project Management\n`;
    message += `• ✅ Reports (Daily/Weekly/Monthly/Yearly)\n`;
    message += `• ✅ Forecasting\n`;
    message += `• ✅ AI Recommendations\n`;
    message += `• ✅ AI Assistant\n\n`;

    message += `📊 Available Plans:\n`;
    message += `• Free: ₦0/month\n`;
    message += `• Pro: ₦5,000/month\n`;
    message += `• Business: ₦15,000/month\n\n`;
    
    message += `💡 Upgrade to unlock more features!`;

    const keyboard = getSubscriptionKeyboard();

    if (ctx.callbackQuery) {
        await ctx.editMessageText(message, { ...keyboard });
    } else {
        await ctx.reply(message, { ...keyboard });
    }
}

async function handleUpgrade(ctx, businessId) {
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📈 Upgrade to Pro (₦5,000/mo)', callback_data: 'upgrade_pro' }],
                [{ text: '🏢 Upgrade to Business (₦15,000/mo)', callback_data: 'upgrade_business' }],
                [{ text: '🔙 Back to Subscription', callback_data: 'back_subscription' }],
            ],
        },
    };

    const message = `⬆️ Upgrade Your Plan

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

Which plan would you like?`;

    if (ctx.callbackQuery) {
        await ctx.editMessageText(message, { ...keyboard });
    } else {
        await ctx.reply(message, { ...keyboard });
    }
}

async function handleUpgradeConfirm(ctx, businessId, plan) {
    const planName = plan === 'upgrade_pro' ? 'Pro' : 'Business';
    const price = plan === 'upgrade_pro' ? '₦5,000' : '₦15,000';

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Back to Subscription', callback_data: 'back_subscription' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
            ],
        },
    };

    const message = `✅ Upgrade Requested!

You have requested to upgrade to **${planName}** (${price}/month).

📌 This is a demo/POC version. Payment integration is coming soon.

Next steps:
1. Our team will contact you
2. Complete payment via our website
3. Your plan will be activated

📱 @AICFOENTRISE_BOT | AI CFO ENTERPRISE`;

    if (ctx.callbackQuery) {
        await ctx.editMessageText(message, { ...keyboard });
    } else {
        await ctx.reply(message, { ...keyboard });
    }
}

async function handleFeatureCheck(ctx, businessId) {
    let message = `📊 Feature Access Check\n\n`;

    try {
        const features = ['sales', 'income', 'expenses', 'purchases', 'inventory', 
                         'debtors', 'creditors', 'customers', 'projects', 'reports', 
                         'forecasting', 'ai_insights'];

        for (const feature of features) {
            const result = await checkFeatureAccessUseCase.execute({
                businessId,
                feature,
            });
            const status = result.hasAccess ? '✅' : '❌';
            const label = feature.replace(/_/g, ' ').toUpperCase();
            message += `${status} ${label}: ${result.message || (result.hasAccess ? 'Available' : 'Upgrade to access')}\n`;
        }
    } catch (error) {
        message += `✅ SALES: Available\n`;
        message += `✅ INCOME: Available\n`;
        message += `✅ EXPENSES: Available\n`;
        message += `✅ PURCHASES: Available\n`;
        message += `✅ INVENTORY: Available\n`;
        message += `✅ DEBTORS: Available\n`;
        message += `✅ CREDITORS: Available\n`;
        message += `✅ CUSTOMERS: Available\n`;
        message += `✅ PROJECTS: Available\n`;
        message += `✅ REPORTS: Available\n`;
        message += `✅ FORECASTING: Available\n`;
        message += `✅ AI INSIGHTS: Available\n`;
    }

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Back to Subscription', callback_data: 'back_subscription' }],
            ],
        },
    };

    if (ctx.callbackQuery) {
        await ctx.editMessageText(message, { ...keyboard });
    } else {
        await ctx.reply(message, { ...keyboard });
    }
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

    const message = `⚠️ Cancel Subscription

Are you sure you want to cancel your subscription?

• You will lose access to premium features
• Your data will remain safe
• You can reactivate anytime

Please confirm:`;

    if (ctx.callbackQuery) {
        await ctx.editMessageText(message, { ...keyboard });
    } else {
        await ctx.reply(message, { ...keyboard });
    }
}

async function handleCancelConfirm(ctx, businessId) {
    try {
        const subscription = await subscriptionRepo.findActiveByBusinessId(businessId);
        
        if (subscription) {
            await subscriptionRepo.update(subscription.id, {
                status: 'cancelled',
            });
        }

        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🔙 Back to Subscription', callback_data: 'back_subscription' }],
                    [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
                ],
            },
        };

        const message = `✅ Subscription Cancelled

Your subscription has been cancelled.

• You will continue to have access until the end of your billing period
• Your data will remain safe
• You can resubscribe anytime

📱 @AICFOENTRISE_BOT | AI CFO ENTERPRISE`;

        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, { ...keyboard });
        } else {
            await ctx.reply(message, { ...keyboard });
        }

    } catch (error) {
        logger.error('Cancel confirmation error:', error);
        await ctx.reply('❌ Failed to cancel subscription. Please try again.');
    }
}

module.exports = {
    subscriptionHandler,
    showSubscriptionMenu,
};