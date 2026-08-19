// src/interfaces/telegram/keyboards/dashboardKeyboard.js

const { INDUSTRIES } = require('../../../config/industries');

// =============================================
// HELPERS
// =============================================
function hasFeature(industryId, feature) {
    const industry = INDUSTRIES[industryId];
    if (!industry) return false;
    return industry.features && industry.features[feature] === true;
}

function getIndustryConfig(industryId) {
    return INDUSTRIES[industryId] || INDUSTRIES.RETAIL;
}

// =============================================
// MAIN MENU KEYBOARD (3 Columns, Industry-Aware)
// =============================================
function getMainMenuKeyboard(industry = 'RETAIL') {
    const config = getIndustryConfig(industry);
    
    // =============================================
    // SECTION 1: TRANSACTIONS (Core Financial Actions)
    // =============================================
    const transactions = [
        [
            { text: '💰 Sale', callback_data: 'menu_sale' },
            { text: '💰 Income', callback_data: 'menu_income' },
            { text: '📉 Expense', callback_data: 'menu_expense' },
        ],
        [
            { text: '🛒 Purchase', callback_data: 'menu_purchase' },
            { text: '📦 Inventory', callback_data: 'menu_inventory' },
            { text: '👥 Debtors', callback_data: 'menu_debtors' },
        ],
        [
            { text: '🏦 Creditors', callback_data: 'menu_creditors' },
            { text: '👤 Customers', callback_data: 'menu_customers' },
            { text: '🏢 Suppliers', callback_data: 'menu_suppliers' },
        ],
    ];

    // =============================================
    // SECTION 2: PROJECTS (Industry-Specific)
    // =============================================
    const projects = [];
    if (hasFeature(industry, 'projects')) {
        projects.push([
            { text: '🏗️ Projects', callback_data: 'menu_projects' },
            { text: '📊 Dashboard', callback_data: 'menu_dashboard' },
            { text: '📋 Reports', callback_data: 'menu_reports' },
        ]);
    } else {
        projects.push([
            { text: '📊 Dashboard', callback_data: 'menu_dashboard' },
            { text: '📋 Reports', callback_data: 'menu_reports' },
            { text: '⚙️ Settings', callback_data: 'menu_settings' },
        ]);
    }

    // =============================================
    // SECTION 3: AI & INSIGHTS
    // =============================================
    const insights = [
        [
            { text: '📈 Forecast', callback_data: 'menu_forecast' },
            { text: '💡 Recommendations', callback_data: 'menu_recommendations' },
            { text: '🧠 Ask AI', callback_data: 'menu_ai' },
        ],
    ];

    // =============================================
    // SECTION 4: ACCOUNT & SUBSCRIPTION
    // =============================================
    const account = [
        [
            { text: '📋 Subscription', callback_data: 'menu_subscription' },
            { text: '⚙️ Settings', callback_data: 'menu_settings' },
        ],
    ];

    // =============================================
    // BUILD FINAL KEYBOARD
    // =============================================
    const keyboard = [];

    // Add Transaction Section
    keyboard.push([{ text: '━━━ 💰 TRANSACTIONS ━━━', callback_data: 'noop' }]);
    for (const row of transactions) {
        keyboard.push(row);
    }

    // Add Management Section
    keyboard.push([{ text: '━━━ 📊 MANAGEMENT ━━━', callback_data: 'noop' }]);
    for (const row of projects) {
        keyboard.push(row);
    }

    // Add AI & Insights Section
    keyboard.push([{ text: '━━━ 🧠 INSIGHTS ━━━', callback_data: 'noop' }]);
    for (const row of insights) {
        keyboard.push(row);
    }

    // Add Account Section
    keyboard.push([{ text: '━━━ ⚙️ ACCOUNT ━━━', callback_data: 'noop' }]);
    for (const row of account) {
        keyboard.push(row);
    }

    return {
        reply_markup: {
            inline_keyboard: keyboard,
        },
    };
}

// =============================================
// INVENTORY KEYBOARD
// =============================================
function getInventoryKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📦 Add Stock', callback_data: 'inventory_add' },
                    { text: '✏️ Edit Item', callback_data: 'inventory_edit' },
                ],
                [
                    { text: '📊 Adjust Stock', callback_data: 'inventory_adjust' },
                    { text: '📋 List All', callback_data: 'inventory_list' },
                ],
                [
                    { text: '⚠️ Low Stock', callback_data: 'inventory_low' },
                    { text: '💰 Total Value', callback_data: 'inventory_value' },
                ],
                [
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// DEBTOR KEYBOARD (UPDATED with Total Owed)
// =============================================
function getDebtorKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '➕ Add Debtor', callback_data: 'debtor_add' },
                    { text: '💰 Record Payment', callback_data: 'debtor_pay' },
                ],
                [
                    { text: '📋 List All', callback_data: 'debtor_list' },
                    { text: '📊 Total Owed', callback_data: 'debtor_total' },
                ],
                [
                    { text: '⚠️ Overdue', callback_data: 'debtor_overdue' },
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// CREDITOR KEYBOARD
// =============================================
function getCreditorKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '➕ Add Creditor', callback_data: 'creditor_add' },
                    { text: '💰 Make Payment', callback_data: 'creditor_pay' },
                ],
                [
                    { text: '📋 List All', callback_data: 'creditor_list' },
                    { text: '📊 Total Owed', callback_data: 'creditor_total' },
                ],
                [
                    { text: '⚠️ Overdue', callback_data: 'creditor_overdue' },
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// PURCHASE KEYBOARD
// =============================================
function getPurchaseKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🛒 Record Purchase', callback_data: 'purchase_add' },
                    { text: '📋 List All', callback_data: 'purchase_list' },
                ],
                [
                    { text: '📊 Summary', callback_data: 'purchase_summary' },
                    { text: '📈 Today', callback_data: 'purchase_today' },
                ],
                [
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// INCOME KEYBOARD
// =============================================
function getIncomeKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '💰 Record Income', callback_data: 'income_add' },
                    { text: '📋 List All', callback_data: 'income_list' },
                ],
                [
                    { text: '📊 Summary', callback_data: 'income_summary' },
                    { text: '📈 Today', callback_data: 'income_today' },
                ],
                [
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// EXPENSE KEYBOARD
// =============================================
function getExpenseKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📉 Record Expense', callback_data: 'expense_add' },
                    { text: '📋 List All', callback_data: 'expense_list' },
                ],
                [
                    { text: '📊 Summary', callback_data: 'expense_summary' },
                    { text: '📈 Today', callback_data: 'expense_today' },
                ],
                [
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// REPORT KEYBOARD
// =============================================
function getReportKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📊 Executive', callback_data: 'report_executive' },
                    { text: '📈 Daily', callback_data: 'report_daily' },
                ],
                [
                    { text: '📈 Weekly', callback_data: 'report_weekly' },
                    { text: '📈 Monthly', callback_data: 'report_monthly' },
                ],
                [
                    { text: '📄 Export PDF', callback_data: 'report_pdf' },
                    { text: '📊 Export Excel', callback_data: 'report_excel' },
                ],
                [
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// AI KEYBOARD
// =============================================
function getAiKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '❓ Ask Question', callback_data: 'ai_ask' },
                    { text: '📊 AI Summary', callback_data: 'ai_summary' },
                ],
                [
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// SETTINGS KEYBOARD
// =============================================
function getSettingsKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '👤 Profile', callback_data: 'settings_profile' },
                    { text: '🏢 Business', callback_data: 'settings_business' },
                ],
                [
                    { text: '📋 Subscription', callback_data: 'menu_subscription' },
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// CUSTOMER KEYBOARD
// =============================================
function getCustomerKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '➕ Add', callback_data: 'customer_create' },
                    { text: '👤 View', callback_data: 'customer_view' },
                ],
                [
                    { text: '📋 List All', callback_data: 'customer_list' },
                    { text: '📊 History', callback_data: 'customer_history' },
                ],
                [
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// SUPPLIER KEYBOARD
// =============================================
function getSupplierKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '➕ Add', callback_data: 'supplier_create' },
                    { text: '👤 View', callback_data: 'supplier_view' },
                ],
                [
                    { text: '📋 List All', callback_data: 'supplier_list' },
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// PROJECT KEYBOARD
// =============================================
function getProjectKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '➕ Create', callback_data: 'project_create' },
                    { text: '👤 View', callback_data: 'project_view' },
                ],
                [
                    { text: '📋 List All', callback_data: 'project_list' },
                    { text: '💰 Financials', callback_data: 'project_financials' },
                ],
                [
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// FORECAST KEYBOARD
// =============================================
function getForecastKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📈 3 Months', callback_data: 'forecast_3' },
                    { text: '📈 6 Months', callback_data: 'forecast_6' },
                ],
                [
                    { text: '📈 12 Months', callback_data: 'forecast_12' },
                    { text: '📊 Seasonality', callback_data: 'forecast_seasonality' },
                ],
                [
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// SUBSCRIPTION KEYBOARD
// =============================================
function getSubscriptionKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📊 View Plan', callback_data: 'subscription_view' },
                    { text: '⬆️ Upgrade', callback_data: 'subscription_upgrade' },
                ],
                [
                    { text: '📊 Features', callback_data: 'subscription_features' },
                    { text: '❌ Cancel', callback_data: 'subscription_cancel' },
                ],
                [
                    { text: '🔙 Back', callback_data: 'menu_back' },
                ],
            ],
        },
    };
}

// =============================================
// BACK KEYBOARD
// =============================================
function getBackKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔙 Back', callback_data: 'menu_back' }],
            ],
        },
    };
}

module.exports = {
    getMainMenuKeyboard,
    getInventoryKeyboard,
    getDebtorKeyboard,
    getCreditorKeyboard,
    getPurchaseKeyboard,
    getIncomeKeyboard,
    getExpenseKeyboard,
    getReportKeyboard,
    getAiKeyboard,
    getSettingsKeyboard,
    getForecastKeyboard,
    getSubscriptionKeyboard,
    getCustomerKeyboard,
    getSupplierKeyboard,
    getProjectKeyboard,
    getBackKeyboard,
};