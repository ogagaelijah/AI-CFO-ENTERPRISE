// src/interfaces/telegram/keyboards/dashboardKeyboard.js

const { Markup } = require('telegraf');

// =============================================
// MAIN DASHBOARD KEYBOARD
// =============================================
function getMainMenuKeyboard(industry) {
    const industryButtons = getIndustryButtons(industry);
    
    const coreButtons = [
        { text: '📊 Dashboard', callback_data: 'menu_dashboard' },
        { text: '📋 Reports', callback_data: 'menu_reports' },
        { text: '🤖 Ask AI', callback_data: 'menu_ai' },
        { text: '⚙️ Settings', callback_data: 'menu_settings' },
    ];

    const allButtons = [...industryButtons, ...coreButtons];
    
    const rows = [];
    for (let i = 0; i < allButtons.length; i += 2) {
        const row = [];
        row.push(Markup.button.callback(allButtons[i].text, allButtons[i].callback_data));
        if (allButtons[i + 1]) {
            row.push(Markup.button.callback(allButtons[i + 1].text, allButtons[i + 1].callback_data));
        }
        rows.push(row);
    }

    return Markup.inlineKeyboard(rows);
}

// =============================================
// INDUSTRY-SPECIFIC BUTTONS
// =============================================
function getIndustryButtons(industry) {
    const baseButtons = [
        { text: '💰 Income', callback_data: 'menu_income' },
        { text: '📉 Expense', callback_data: 'menu_expense' },
    ];

    const industrySpecific = {
        RETAIL: [
            { text: '📝 Record Sale', callback_data: 'menu_sale' },
            { text: '📦 Inventory', callback_data: 'menu_inventory' },
            { text: '👥 Debtors', callback_data: 'menu_debtors' },
            { text: '🏦 Creditors', callback_data: 'menu_creditors' },
        ],
        MANUFACTURING: [
            { text: '🏭 Production', callback_data: 'menu_production' },
            { text: '📦 Inventory', callback_data: 'menu_inventory' },
            { text: '📝 Record Sale', callback_data: 'menu_sale' },
            { text: '👥 Debtors', callback_data: 'menu_debtors' },
            { text: '🏦 Creditors', callback_data: 'menu_creditors' },
        ],
        CONSTRUCTION: [
            { text: '🏗️ Projects', callback_data: 'menu_projects' },
            { text: '📦 Materials', callback_data: 'menu_inventory' },
            { text: '📝 Record Sale', callback_data: 'menu_sale' },
            { text: '👥 Debtors', callback_data: 'menu_debtors' },
            { text: '🏦 Creditors', callback_data: 'menu_creditors' },
        ],
        HEALTHCARE: [
            { text: '🩺 Register Visit', callback_data: 'menu_visit' },
            { text: '💊 Supplies', callback_data: 'menu_inventory' },
            { text: '👥 Debtors', callback_data: 'menu_debtors' },
            { text: '🏦 Creditors', callback_data: 'menu_creditors' },
        ],
        CONSULTANCY: [
            { text: '💼 Projects', callback_data: 'menu_projects' },
            { text: '👥 Clients', callback_data: 'menu_clients' },
            { text: '📝 Log Hours', callback_data: 'menu_loghours' },
            { text: '👥 Debtors', callback_data: 'menu_debtors' },
        ],
        REAL_ESTATE: [
            { text: '🏠 Properties', callback_data: 'menu_properties' },
            { text: '👥 Tenants', callback_data: 'menu_tenants' },
            { text: '💰 Record Rent', callback_data: 'menu_rent' },
            { text: '👥 Debtors', callback_data: 'menu_debtors' },
        ],
        EDUCATION: [
            { text: '📚 Students', callback_data: 'menu_students' },
            { text: '💰 Record Fees', callback_data: 'menu_fees' },
            { text: '👥 Debtors', callback_data: 'menu_debtors' },
            { text: '🏦 Creditors', callback_data: 'menu_creditors' },
        ],
        LOGISTICS: [
            { text: '🚛 Record Trip', callback_data: 'menu_trip' },
            { text: '🚗 Vehicles', callback_data: 'menu_vehicles' },
            { text: '👥 Debtors', callback_data: 'menu_debtors' },
            { text: '🏦 Creditors', callback_data: 'menu_creditors' },
        ],
    };

    const specific = industrySpecific[industry] || industrySpecific.RETAIL;
    return [...baseButtons, ...specific];
}

// =============================================
// INVENTORY SUB-MENU
// =============================================
function getInventoryKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('➕ Add Stock', 'inventory_add'),
            Markup.button.callback('📋 View All', 'inventory_list'),
        ],
        [
            Markup.button.callback('⚠️ Low Stock', 'inventory_low'),
            Markup.button.callback('💰 Total Value', 'inventory_value'),
        ],
        [
            Markup.button.callback('🔙 Back to Main', 'menu_back'),
        ],
    ]);
}

// =============================================
// DEBTORS SUB-MENU
// =============================================
function getDebtorKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('➕ Add Debtor', 'debtor_add'),
            Markup.button.callback('💰 Record Payment', 'debtor_pay'),
        ],
        [
            Markup.button.callback('📋 View All', 'debtor_list'),
            Markup.button.callback('🔴 Overdue', 'debtor_overdue'),
        ],
        [
            Markup.button.callback('🔙 Back to Main', 'menu_back'),
        ],
    ]);
}

// =============================================
// CREDITORS SUB-MENU
// =============================================
function getCreditorKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('➕ Add Creditor', 'creditor_add'),
            Markup.button.callback('💰 Record Payment', 'creditor_pay'),
        ],
        [
            Markup.button.callback('📋 View All', 'creditor_list'),
            Markup.button.callback('🔴 Overdue', 'creditor_overdue'),
        ],
        [
            Markup.button.callback('🔙 Back to Main', 'menu_back'),
        ],
    ]);
}

// =============================================
// REPORTS SUB-MENU
// =============================================
function getReportKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('📊 Daily', 'report_daily'),
            Markup.button.callback('📈 Weekly', 'report_weekly'),
        ],
        [
            Markup.button.callback('📉 Monthly', 'report_monthly'),
            Markup.button.callback('📋 Executive', 'report_executive'),
        ],
        [
            Markup.button.callback('🔙 Back to Main', 'menu_back'),
        ],
    ]);
}

// =============================================
// INCOME SUB-MENU
// =============================================
function getIncomeKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('➕ Record Income', 'income_add'),
            Markup.button.callback('📋 View All', 'income_list'),
        ],
        [
            Markup.button.callback('📊 Summary', 'income_summary'),
            Markup.button.callback('📅 Today', 'income_today'),
        ],
        [
            Markup.button.callback('🔙 Back to Main', 'menu_back'),
        ],
    ]);
}

// =============================================
// EXPENSE SUB-MENU
// =============================================
function getExpenseKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('➕ Record Expense', 'expense_add'),
            Markup.button.callback('📋 View All', 'expense_list'),
        ],
        [
            Markup.button.callback('📊 Summary', 'expense_summary'),
            Markup.button.callback('📅 Today', 'expense_today'),
        ],
        [
            Markup.button.callback('🔙 Back to Main', 'menu_back'),
        ],
    ]);
}

// =============================================
// ASK AI SUB-MENU
// =============================================
function getAiKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('💬 Ask a Question', 'ai_ask'),
            Markup.button.callback('📊 Summary', 'ai_summary'),
        ],
        [
            Markup.button.callback('🔙 Back to Main', 'menu_back'),
        ],
    ]);
}

// =============================================
// SETTINGS SUB-MENU
// =============================================
function getSettingsKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('👤 Profile', 'settings_profile'),
            Markup.button.callback('🏢 Business', 'settings_business'),
        ],
        [
            Markup.button.callback('🔑 Subscription', 'settings_subscription'),
            Markup.button.callback('📋 Help', 'settings_help'),
        ],
        [
            Markup.button.callback('🔙 Back to Main', 'menu_back'),
        ],
    ]);
}

// =============================================
// BACK TO MAIN KEYBOARD
// =============================================
function getBackKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback('🔙 Back to Main', 'menu_back'),
        ],
    ]);
}

module.exports = {
    getMainMenuKeyboard,
    getIndustryButtons,
    getInventoryKeyboard,
    getDebtorKeyboard,
    getCreditorKeyboard,
    getReportKeyboard,
    getIncomeKeyboard,
    getExpenseKeyboard,
    getAiKeyboard,
    getSettingsKeyboard,
    getBackKeyboard,
};