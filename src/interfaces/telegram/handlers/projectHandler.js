// src/interfaces/telegram/handlers/projectHandler.js

const { getSessionManager } = require('../sessionManager');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const ProjectRepository = require('../../../infrastructure/database/sqlite/repositories/ProjectRepository');
const SaleRepository = require('../../../infrastructure/database/sqlite/repositories/SaleRepository');
const PurchaseRepository = require('../../../infrastructure/database/sqlite/repositories/PurchaseRepository');
const ExpenseRepository = require('../../../infrastructure/database/sqlite/repositories/ExpenseRepository');
const CreateProjectUseCase = require('../../../application/useCases/projects/CreateProjectUseCase');
const GetProjectUseCase = require('../../../application/useCases/projects/GetProjectUseCase');
const GetProjectFinancialsUseCase = require('../../../application/useCases/projects/GetProjectFinancialsUseCase');
const { getMainMenuKeyboard, getProjectKeyboard } = require('../keyboards/dashboardKeyboard');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const projectRepo = new ProjectRepository();
const saleRepo = new SaleRepository();
const purchaseRepo = new PurchaseRepository();
const expenseRepo = new ExpenseRepository();

const createProjectUseCase = new CreateProjectUseCase({
    projectRepository: projectRepo,
});

const getProjectUseCase = new GetProjectUseCase({
    projectRepository: projectRepo,
});

const getProjectFinancialsUseCase = new GetProjectFinancialsUseCase({
    projectRepository: projectRepo,
    saleRepository: saleRepo,
    purchaseRepository: purchaseRepo,
    expenseRepository: expenseRepo,
});

async function projectHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        const session = sessionManager.getSession(telegramId);
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

        const state = session ? session.state : null;

        if (state === 'PROJECT_CREATE_NAME') {
            await handleCreateProject(ctx, business.id);
            return;
        }

        if (state === 'PROJECT_VIEW_ID') {
            await handleViewProject(ctx, business.id);
            return;
        }

        if (state === 'PROJECT_FINANCIALS_ID') {
            await handleViewProjectFinancials(ctx, business.id);
            return;
        }

        if (ctx.callbackQuery) {
            await handleButtonClick(ctx, business.id);
            return;
        }

        await showProjectMenu(ctx);

    } catch (error) {
        logger.error('Project handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

async function showProjectMenu(ctx) {
    const telegramId = ctx.from.id;
    sessionManager.setState(telegramId, 'PROJECT_MENU');

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '➕ Create Project', callback_data: 'project_create' }],
                [{ text: '👤 View Project', callback_data: 'project_view' }],
                [{ text: '📋 List All Projects', callback_data: 'project_list' }],
                [{ text: '💰 Project Financials', callback_data: 'project_financials' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'back_main' }],
            ],
        },
    };

    await ctx.reply(
        `🏗️ **Project Management**

Manage your construction, consultancy, or service projects.

• **Create Project** — Start a new project
• **View Project** — View project details
• **List All** — See all projects
• **Project Financials** — View revenue, costs, and profit

Select an option below:`,
        { parse_mode: 'Markdown', ...keyboard }
    );
}

async function handleCreateProject(ctx, businessId) {
    const text = ctx.message?.text;
    const telegramId = ctx.from.id;

    if (!text) {
        sessionManager.setState(telegramId, 'PROJECT_CREATE_NAME');
        await ctx.reply(
            `📝 **Create New Project**

Enter the project name:`
        );
        return;
    }

    try {
        // For simplicity, create with default values
        const result = await createProjectUseCase.execute({
            businessId,
            name: text,
            description: '',
            budget: 0,
            startDate: new Date(),
        });

        if (!result.success) {
            await ctx.reply(`❌ ${result.message}`);
            return;
        }

        sessionManager.clearSession(telegramId);

        const project = result.project;
        await ctx.reply(
            `✅ **Project Created Successfully!**

📋 **Details:**
• Name: ${project.name}
• ID: ${project.id}
• Status: ${project.status}
• Budget: ₦${(project.budget || 0).toLocaleString()}

What would you like to do next?`,
            { parse_mode: 'Markdown' }
        );

        await showProjectMenu(ctx);

    } catch (error) {
        logger.error('Create project error:', error);
        await ctx.reply(`❌ Failed to create project: ${error.message}`);
        sessionManager.clearSession(telegramId);
    }
}

async function handleViewProject(ctx, businessId) {
    const text = ctx.message?.text;
    const telegramId = ctx.from.id;

    if (!text) {
        sessionManager.setState(telegramId, 'PROJECT_VIEW_ID');
        await ctx.reply(
            `👤 **View Project**

Enter the project ID or name:`
        );
        return;
    }

    try {
        let project;
        const id = parseInt(text);
        if (!isNaN(id) && id > 0) {
            const result = await getProjectUseCase.execute({
                projectId: id,
                businessId,
            });
            if (result.success) {
                project = result.project;
            }
        } else {
            const projects = await projectRepo.search(businessId, text, { limit: 1 });
            if (projects && projects.length > 0) {
                project = projects[0];
            }
        }

        if (!project) {
            await ctx.reply(`❌ Project "${text}" not found.`);
            sessionManager.clearSession(telegramId);
            await showProjectMenu(ctx);
            return;
        }

        sessionManager.clearSession(telegramId);

        let message = `🏗️ **Project Details**\n\n`;
        message += `📋 **ID:** ${project.id}\n`;
        message += `📛 **Name:** ${project.name}\n`;
        message += `📝 **Description:** ${project.description || 'None'}\n`;
        message += `📊 **Status:** ${project.status}\n`;
        message += `💰 **Budget:** ₦${(project.budget || 0).toLocaleString()}\n`;
        message += `📅 **Start Date:** ${new Date(project.startDate).toLocaleDateString()}\n`;
        if (project.endDate) {
            message += `📅 **End Date:** ${new Date(project.endDate).toLocaleDateString()}\n`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

        await ctx.reply('Select an option:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '💰 View Financials', callback_data: `project_financials_${project.id}` }],
                    [{ text: '🔙 Back to Projects', callback_data: 'project_back' }],
                ],
            },
        });

    } catch (error) {
        logger.error('View project error:', error);
        await ctx.reply(`❌ Failed to view project: ${error.message}`);
        sessionManager.clearSession(telegramId);
    }
}

async function handleViewProjectFinancials(ctx, businessId) {
    const text = ctx.message?.text;
    const telegramId = ctx.from.id;

    if (!text) {
        sessionManager.setState(telegramId, 'PROJECT_FINANCIALS_ID');
        await ctx.reply(
            `💰 **Project Financials**

Enter the project ID or name:`
        );
        return;
    }

    try {
        let projectId;
        const id = parseInt(text);
        if (!isNaN(id) && id > 0) {
            projectId = id;
        } else {
            const projects = await projectRepo.search(businessId, text, { limit: 1 });
            if (projects && projects.length > 0) {
                projectId = projects[0].id;
            }
        }

        if (!projectId) {
            await ctx.reply(`❌ Project "${text}" not found.`);
            sessionManager.clearSession(telegramId);
            await showProjectMenu(ctx);
            return;
        }

        sessionManager.clearSession(telegramId);

        await ctx.reply('⏳ Loading project financials...');

        const result = await getProjectFinancialsUseCase.execute({
            projectId,
            businessId,
        });

        if (!result.success) {
            await ctx.reply(`❌ ${result.message}`);
            return;
        }

        const financials = result.financials;
        let message = `💰 **Project Financials: ${result.project.name}**\n\n`;
        message += `📊 **Budget:** ₦${(financials.budget || 0).toLocaleString()}\n`;
        message += `📈 **Revenue:** ₦${financials.totalRevenue.toLocaleString()}\n`;
        message += `📉 **Costs:** ₦${financials.totalCosts.toLocaleString()}\n`;
        message += `✅ **Profit:** ₦${financials.totalProfit.toLocaleString()}\n`;
        message += `📊 **Margin:** ${financials.profitMargin}%\n`;
        message += `📊 **Progress:** ${financials.progress}\n\n`;

        message += `**Sales:** ${financials.sales.total} transactions (₦${financials.sales.totalAmount.toLocaleString()})\n`;
        message += `• Paid: ₦${financials.sales.paid.toLocaleString()}\n`;
        message += `• Unpaid: ₦${financials.sales.unpaid.toLocaleString()}\n\n`;

        message += `**Purchases:** ${financials.purchases.total} transactions (₦${financials.purchases.totalAmount.toLocaleString()})\n`;
        message += `• Paid: ₦${financials.purchases.paid.toLocaleString()}\n`;
        message += `• Unpaid: ₦${financials.purchases.unpaid.toLocaleString()}\n\n`;

        message += `**Expenses:** ${financials.expenses.total} transactions (₦${financials.expenses.totalAmount.toLocaleString()})`;

        await ctx.reply(message, { parse_mode: 'Markdown' });

        await showProjectMenu(ctx);

    } catch (error) {
        logger.error('Project financials error:', error);
        await ctx.reply(`❌ Failed to load financials: ${error.message}`);
        sessionManager.clearSession(telegramId);
    }
}

async function listProjects(ctx, businessId) {
    try {
        const projects = await projectRepo.findByBusinessId(businessId, { limit: 50 });

        if (projects.length === 0) {
            await ctx.reply('📋 **No projects found.**\n\nCreate your first project using the Create Project button.');
            return;
        }

        let message = `📋 **Project List (${projects.length})**\n\n`;

        for (const project of projects.slice(0, 20)) {
            const statusEmoji = {
                ACTIVE: '🟢',
                COMPLETED: '✅',
                ON_HOLD: '🟡',
                CANCELLED: '❌',
            };
            const emoji = statusEmoji[project.status] || '⚪';
            message += `${emoji} **${project.name}**\n`;
            message += `   📋 ID: ${project.id}\n`;
            message += `   📊 Status: ${project.status}\n`;
            message += `   💰 Budget: ₦${(project.budget || 0).toLocaleString()}\n`;
            message += `   📅 Started: ${new Date(project.startDate).toLocaleDateString()}\n\n`;
        }

        if (projects.length > 20) {
            message += `... and ${projects.length - 20} more projects.\n`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

        await ctx.reply('Select an option:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '➕ Create Project', callback_data: 'project_create' }],
                    [{ text: '🔙 Back to Projects', callback_data: 'project_back' }],
                ],
            },
        });

    } catch (error) {
        logger.error('List projects error:', error);
        await ctx.reply(`❌ Failed to list projects: ${error.message}`);
    }
}

async function handleButtonClick(ctx, businessId) {
    const data = ctx.callbackQuery?.data;
    const telegramId = ctx.from.id;

    await ctx.answerCallbackQuery();

    if (data === 'project_create') {
        sessionManager.setState(telegramId, 'PROJECT_CREATE_NAME');
        await ctx.reply(
            `📝 **Create New Project**

Enter the project name:`
        );
        return;
    }

    if (data === 'project_view') {
        sessionManager.setState(telegramId, 'PROJECT_VIEW_ID');
        await ctx.reply(
            `👤 **View Project**

Enter the project ID or name:`
        );
        return;
    }

    if (data === 'project_list') {
        await listProjects(ctx, businessId);
        return;
    }

    if (data === 'project_financials') {
        sessionManager.setState(telegramId, 'PROJECT_FINANCIALS_ID');
        await ctx.reply(
            `💰 **Project Financials**

Enter the project ID or name:`
        );
        return;
    }

    if (data === 'project_back') {
        await showProjectMenu(ctx);
        return;
    }

    if (data === 'back_main') {
        const { startHandler } = require('./startHandler');
        await startHandler(ctx);
        return;
    }

    // Handle financials from inline button
    if (data && data.startsWith('project_financials_')) {
        const projectId = parseInt(data.replace('project_financials_', ''));
        if (!isNaN(projectId)) {
            await ctx.reply('⏳ Loading project financials...');

            const result = await getProjectFinancialsUseCase.execute({
                projectId,
                businessId,
            });

            if (!result.success) {
                await ctx.reply(`❌ ${result.message}`);
                return;
            }

            const financials = result.financials;
            let message = `💰 **Project Financials: ${result.project.name}**\n\n`;
            message += `📊 **Budget:** ₦${(financials.budget || 0).toLocaleString()}\n`;
            message += `📈 **Revenue:** ₦${financials.totalRevenue.toLocaleString()}\n`;
            message += `📉 **Costs:** ₦${financials.totalCosts.toLocaleString()}\n`;
            message += `✅ **Profit:** ₦${financials.totalProfit.toLocaleString()}\n`;
            message += `📊 **Margin:** ${financials.profitMargin}%\n`;
            message += `📊 **Progress:** ${financials.progress}\n\n`;

            message += `**Sales:** ${financials.sales.total} transactions (₦${financials.sales.totalAmount.toLocaleString()})\n`;
            message += `• Paid: ₦${financials.sales.paid.toLocaleString()}\n`;
            message += `• Unpaid: ₦${financials.sales.unpaid.toLocaleString()}\n\n`;

            message += `**Purchases:** ${financials.purchases.total} transactions (₦${financials.purchases.totalAmount.toLocaleString()})\n`;
            message += `• Paid: ₦${financials.purchases.paid.toLocaleString()}\n`;
            message += `• Unpaid: ₦${financials.purchases.unpaid.toLocaleString()}\n\n`;

            message += `**Expenses:** ${financials.expenses.total} transactions (₦${financials.expenses.totalAmount.toLocaleString()})`;

            await ctx.reply(message, { parse_mode: 'Markdown' });
            await showProjectMenu(ctx);
        }
    }
}

module.exports = {
    projectHandler,
    showProjectMenu,
    handleCreateProject,
    handleViewProject,
    handleViewProjectFinancials,
    listProjects,
};