// src/application/services/ReportService.js
const ReportGenerator = require('./report/ReportGenerator');
const ExecutiveSummaryGenerator = require('./report/ExecutiveSummaryGenerator');

class ReportService {
    constructor(repositories) {
        this.repos = repositories;
        this.generator = new ReportGenerator(repositories);
        this.executive = new ExecutiveSummaryGenerator(this.generator);
    }

    async generateReport(userId, startDate, endDate, options = {}) {
        return this.generator.generate(userId, startDate, endDate, options);
    }

    async generateDailyReport(userId, date = new Date()) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        return this.generator.generate(userId, start, end, { includeInventory: true });
    }

    async generateWeeklyReport(userId, date = new Date()) {
        const start = new Date(date);
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return this.generator.generate(userId, start, end, { includeInventory: true });
    }

    async generateMonthlyReport(userId, date = new Date()) {
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        return this.generator.generate(userId, start, end, { includeInventory: true });
    }

    async generateYearlyReport(userId, date = new Date()) {
        const start = new Date(date.getFullYear(), 0, 1);
        const end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
        return this.generator.generate(userId, start, end, { includeInventory: true });
    }

    async generateExecutiveSummary(userId, date = new Date()) {
        return this.executive.generate(userId, date);
    }
}

module.exports = ReportService;