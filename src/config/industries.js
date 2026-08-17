// src/config/industries.js

console.log('✅ Loading industries...');

const INDUSTRIES = {
    RETAIL: {
        id: 'RETAIL',
        name: 'Retail / Wholesale',
        icon: '🏪',
        description: 'Buying and selling products',
        features: { inventory: true, debtors: true, creditors: true },
        categories: {
            sales: ['Product Sale', 'Bulk Sale', 'Online Sale'],
            income: ['Commission', 'Interest', 'Gift', 'Rent Received'],
            purchases: ['Inventory Purchase', 'Restock', 'Bulk Order'],
            expenses: ['Rent', 'Utilities', 'Staff Salary', 'Marketing', 'Transport'],
        },
    },
    MANUFACTURING: {
        id: 'MANUFACTURING',
        name: 'Manufacturing',
        icon: '🏭',
        description: 'Production and manufacturing',
        features: { inventory: true, production: true, rawMaterials: true, finishedGoods: true, debtors: true, creditors: true },
        categories: {
            sales: ['Product Sale', 'Wholesale', 'Export'],
            income: ['Commission', 'Interest', 'Gift', 'Grant'],
            purchases: ['Raw Materials', 'Machinery', 'Packaging'],
            expenses: ['Factory Rent', 'Utilities', 'Staff Salary', 'Maintenance'],
        },
    },
    CONSTRUCTION: {
        id: 'CONSTRUCTION',
        name: 'Construction',
        icon: '🏗️',
        description: 'Construction and property development',
        features: { inventory: true, rawMaterials: true, projects: true, debtors: true, creditors: true },
        categories: {
            sales: ['Project Billing', 'Consultation', 'Contract Payment'],
            income: ['Commission', 'Interest', 'Gift'],
            purchases: ['Building Materials', 'Equipment', 'Tools'],
            expenses: ['Labor', 'Equipment Rental', 'Transport', 'Utilities'],
        },
    },
    HEALTHCARE: {
        id: 'HEALTHCARE',
        name: 'Healthcare',
        icon: '🏥',
        description: 'Medical and healthcare services',
        features: { inventory: true, services: true, patients: true, debtors: true, creditors: true },
        categories: {
            sales: ['Consultation', 'Lab Tests', 'Pharmacy', 'Procedures'],
            income: ['Grant', 'Donation', 'Interest', 'Gift'],
            purchases: ['Medical Supplies', 'Pharmaceuticals', 'Equipment'],
            expenses: ['Staff Salary', 'Rent', 'Utilities', 'Insurance'],
        },
    },
    CONSULTANCY: {
        id: 'CONSULTANCY',
        name: 'Consultancy',
        icon: '👔',
        description: 'Professional services and consulting',
        features: { services: true, projects: true, debtors: true, creditors: false },
        categories: {
            sales: ['Consulting Fee', 'Retainer', 'Project Payment', 'Hourly Billing'],
            income: ['Commission', 'Interest', 'Gift'],
            purchases: [],
            expenses: ['Software', 'Office Rent', 'Travel', 'Marketing', 'Training'],
        },
    },
    REAL_ESTATE: {
        id: 'REAL_ESTATE',
        name: 'Real Estate',
        icon: '🏠',
        description: 'Property management and rentals',
        features: { debtors: true, creditors: false },
        categories: {
            sales: ['Rent Received', 'Lease Deposit', 'Property Sale', 'Maintenance Fee'],
            income: ['Commission', 'Interest', 'Gift'],
            purchases: [],
            expenses: ['Property Maintenance', 'Property Tax', 'Insurance', 'Utilities'],
        },
    },
    EDUCATION: {
        id: 'EDUCATION',
        name: 'Education',
        icon: '📚',
        description: 'Educational institutions',
        features: { services: true, debtors: true, creditors: true },
        categories: {
            sales: ['School Fees', 'Registration', 'Tuition', 'Boarding Fees'],
            income: ['Donation', 'Grant', 'Interest', 'Gift'],
            purchases: ['Learning Materials', 'Equipment', 'Books'],
            expenses: ['Staff Salary', 'Rent', 'Utilities', 'Maintenance'],
        },
    },
    LOGISTICS: {
        id: 'LOGISTICS',
        name: 'Logistics',
        icon: '🚛',
        description: 'Transportation and delivery services',
        features: { debtors: true, creditors: false },
        categories: {
            sales: ['Trip Revenue', 'Delivery Fee', 'Charter', 'Maintenance Contract'],
            income: ['Commission', 'Interest', 'Gift'],
            purchases: [],
            expenses: ['Fuel', 'Maintenance', 'Driver Salary', 'Insurance', 'Registration'],
        },
    },
};

console.log(`✅ Loaded ${Object.keys(INDUSTRIES).length} industries:`, Object.keys(INDUSTRIES));

function getIndustryKeyboard() {
    const industryList = Object.values(INDUSTRIES);
    const rows = [];
    for (let i = 0; i < industryList.length; i += 2) {
        const row = [];
        const first = industryList[i];
        const second = industryList[i + 1];
        row.push({ text: `${first.icon} ${first.name}`, callback_data: `industry_${first.id}` });
        if (second) row.push({ text: `${second.icon} ${second.name}`, callback_data: `industry_${second.id}` });
        rows.push(row);
    }
    return { inline_keyboard: rows };
}

module.exports = { INDUSTRIES, getIndustryKeyboard };