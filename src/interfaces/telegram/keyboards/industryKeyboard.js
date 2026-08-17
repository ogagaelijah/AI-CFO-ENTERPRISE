// src/interfaces/telegram/keyboards/industryKeyboard.js

const { Markup } = require('telegraf');
const { INDUSTRIES } = require('../../../config/industries');

function getIndustryKeyboard() {
    const industryList = Object.values(INDUSTRIES);
    const rows = [];
    
    for (let i = 0; i < industryList.length; i += 2) {
        const row = [];
        const first = industryList[i];
        const second = industryList[i + 1];
        
        row.push(Markup.button.callback(
            `${first.icon} ${first.name}`,
            `industry_${first.id}`
        ));
        
        if (second) {
            row.push(Markup.button.callback(
                `${second.icon} ${second.name}`,
                `industry_${second.id}`
            ));
        }
        
        rows.push(row);
    }
    
    return Markup.inlineKeyboard(rows);
}

module.exports = { getIndustryKeyboard };