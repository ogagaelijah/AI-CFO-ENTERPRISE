// src/interfaces/telegram/keyboards/dashboardKeyboard.js

const { Markup } = require('telegraf');

/**
 * Get industry-specific dashboard buttons
 * @param {string} industry - The industry ID (RETAIL, MANUFACTURING, etc.)
 * @returns {Object} Telegraf inline keyboard
 */
function getDashboardKeyboard(industry) {
    // Base buttons for ALL industries (Income & Expense for everyone)
    const baseButtons = [
        { text: '💰 Income', callback_data: 'menu_income' },
        { text: '📉 Expense', callback_data: 'menu_expense' },
        { text: '📊 Dashboard', callback_data: 'menu_dashboard' },
        { text: '📋 Reports', callback_data: 'menu_reports' },
        { text: '🤖 Ask AI', callback_data: 'menu_ai' },
        { text: '⚙️ Settings', callback_data: 'menu_settings' },
    ];

    // Industry-specific buttons
    const industryButtons = getIndustryButtons(industry);

    // Combine all buttons
    const allButtons = [...industryButtons, ...baseButtons];

    // Convert to rows (2 buttons per row)
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

/**
 * Get industry-specific buttons
 */
function getIndustryButtons(industry) {
    const buttons = {
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

    return buttons[industry] || buttons.RETAIL;
}

module.exports = { getDashboardKeyboard, getIndustryButtons };