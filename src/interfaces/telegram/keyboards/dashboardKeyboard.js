// src/interfaces/telegram/keyboards/dashboardKeyboard.js

// FIXED PATH: ../../../config/industries (was ../../config/industries)
const { INDUSTRIES } = require('../../../config/industries');

// =============================================
// MAIN MENU KEYBOARD
// =============================================
function getMainMenuKeyboard(industry = 'RETAIL') {
    const industryConfig = INDUSTRIES[industry] || INDUSTRIES.RETAIL;
    const features = industryConfig.features || {};

    const buttons = [];

    // Core Financial Modules
    buttons.push([{ text: '💰 Record Sale', callback_data: 'menu_sale' }]);
    
    if (features.inventory) {
        buttons.push([{ text: '📦 Inventory', callback_data: 'menu_inventory' }]);
    }
    
    buttons.push([
        { text: '💰 Income', callback_data: 'menu_income' },
        { text: '📉 Expenses', callback_data: 'menu_expense' }
    ]);
    
    if (features.debtors) {
        buttons.push([{ text: '👥 Debtors', callback_data: 'menu_debtors' }]);
    }
    
    if (features.creditors) {
        buttons.push([{ text: '🏦 Creditors', callback_data: 'menu_creditors' }]);
    }
    
    buttons.push([{ text: '🛒 Purchases', callback_data: 'menu_purchase' }]);
    buttons.push([{ text: '📊 Dashboard', callback_data: 'menu_dashboard' }]);
    buttons.push([{ text: '📋 Reports', callback_data: 'menu_reports' }]);
    
    // New Modules
    buttons.push([{ text: '📈 Forecast', callback_data: 'menu_forecast' }]);
    buttons.push([{ text: '💡 Recommendations', callback_data: 'menu_recommendations' }]);
    buttons.push([{ text: '🧠 Ask AI', callback_data: 'menu_ai' }]);
    buttons.push([{ text: '📋 Subscription', callback_data: 'menu_subscription' }]);
    
    // Customers, Suppliers, Projects
    buttons.push([
        { text: '👤 Customers', callback_data: 'menu_customers' },
        { text: '🏢 Suppliers', callback_data: 'menu_suppliers' }
    ]);
    buttons.push([{ text: '🏗️ Projects', callback_data: 'menu_projects' }]);
    
    buttons.push([{ text: '⚙️ Settings', callback_data: 'menu_settings' }]);

    return {
        reply_markup: {
            inline_keyboard: buttons,
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
                [{ text: '📦 Add Stock', callback_data: 'inventory_add' }],
                [{ text: '✏️ Edit Item', callback_data: 'inventory_edit' }],
                [{ text: '📊 Adjust Stock', callback_data: 'inventory_adjust' }],
                [{ text: '📋 List All', callback_data: 'inventory_list' }],
                [{ text: '⚠️ Low Stock Alerts', callback_data: 'inventory_low' }],
                [{ text: '💰 Total Value', callback_data: 'inventory_value' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
            ],
        },
    };
}

// =============================================
// DEBTOR KEYBOARD
// =============================================
function getDebtorKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '➕ Add Debtor', callback_data: 'debtor_add' }],
                [{ text: '💰 Record Payment', callback_data: 'debtor_pay' }],
                [{ text: '📋 List All Debtors', callback_data: 'debtor_list' }],
                [{ text: '⚠️ Overdue Debtors', callback_data: 'debtor_overdue' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
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
                [{ text: '➕ Add Creditor', callback_data: 'creditor_add' }],
                [{ text: '💰 Make Payment', callback_data: 'creditor_pay' }],
                [{ text: '📋 List All Creditors', callback_data: 'creditor_list' }],
                [{ text: '⚠️ Overdue Creditors', callback_data: 'creditor_overdue' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
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
                [{ text: '🛒 Record Purchase', callback_data: 'purchase_add' }],
                [{ text: '📋 List Purchases', callback_data: 'purchase_list' }],
                [{ text: '📊 Purchase Summary', callback_data: 'purchase_summary' }],
                [{ text: '📈 Today\'s Purchases', callback_data: 'purchase_today' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
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
                [{ text: '💰 Record Income', callback_data: 'income_add' }],
                [{ text: '📋 List Income', callback_data: 'income_list' }],
                [{ text: '📊 Income Summary', callback_data: 'income_summary' }],
                [{ text: '📈 Today\'s Income', callback_data: 'income_today' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
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
                [{ text: '📉 Record Expense', callback_data: 'expense_add' }],
                [{ text: '📋 List Expenses', callback_data: 'expense_list' }],
                [{ text: '📊 Expense Summary', callback_data: 'expense_summary' }],
                [{ text: '📈 Today\'s Expenses', callback_data: 'expense_today' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
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
                [{ text: '📊 Executive Summary', callback_data: 'report_executive' }],
                [{ text: '📈 Daily Report', callback_data: 'report_daily' }],
                [{ text: '📈 Weekly Report', callback_data: 'report_weekly' }],
                [{ text: '📈 Monthly Report', callback_data: 'report_monthly' }],
                [{ text: '📄 Export PDF', callback_data: 'report_pdf' }],
                [{ text: '📊 Export Excel', callback_data: 'report_excel' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
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
                [{ text: '❓ Ask a Question', callback_data: 'ai_ask' }],
                [{ text: '📊 AI Summary', callback_data: 'ai_summary' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
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
                [{ text: '👤 Profile', callback_data: 'settings_profile' }],
                [{ text: '🏢 Business', callback_data: 'settings_business' }],
                [{ text: '📋 Subscription', callback_data: 'menu_subscription' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
            ],
        },
    };
}

// =============================================
// NEW KEYBOARDS
// =============================================

// FORECAST KEYBOARD
function getForecastKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📈 3-Month Forecast', callback_data: 'forecast_3' }],
                [{ text: '📈 6-Month Forecast', callback_data: 'forecast_6' }],
                [{ text: '📈 12-Month Forecast', callback_data: 'forecast_12' }],
                [{ text: '📊 Seasonality Analysis', callback_data: 'forecast_seasonality' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
            ],
        },
    };
}

// SUBSCRIPTION KEYBOARD
function getSubscriptionKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📊 View Current Plan', callback_data: 'subscription_view' }],
                [{ text: '⬆️ Upgrade Plan', callback_data: 'subscription_upgrade' }],
                [{ text: '📊 Feature Access Check', callback_data: 'subscription_features' }],
                [{ text: '❌ Cancel Subscription', callback_data: 'subscription_cancel' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
            ],
        },
    };
}

// CUSTOMER KEYBOARD
function getCustomerKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '➕ Add Customer', callback_data: 'customer_create' }],
                [{ text: '👤 View Customer', callback_data: 'customer_view' }],
                [{ text: '📋 List All Customers', callback_data: 'customer_list' }],
                [{ text: '📊 Customer History', callback_data: 'customer_history' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
            ],
        },
    };
}

// SUPPLIER KEYBOARD
function getSupplierKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '➕ Add Supplier', callback_data: 'supplier_create' }],
                [{ text: '👤 View Supplier', callback_data: 'supplier_view' }],
                [{ text: '📋 List All Suppliers', callback_data: 'supplier_list' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
            ],
        },
    };
}

// PROJECT KEYBOARD
function getProjectKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '➕ Create Project', callback_data: 'project_create' }],
                [{ text: '👤 View Project', callback_data: 'project_view' }],
                [{ text: '📋 List All Projects', callback_data: 'project_list' }],
                [{ text: '💰 Project Financials', callback_data: 'project_financials' }],
                [{ text: '🔙 Back to Main Menu', callback_data: 'menu_back' }],
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