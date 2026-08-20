// src/application/useCases/reports/GenerateDailyReportUseCase.js

class GenerateDailyReportUseCase {
    constructor(reportService) {
        this.reportService = reportService;
    }

    async execute(userId, date = new Date()) {
        try {
            const report = await this.reportService.generateDailyReport(userId, date);
            return {
                success: true,
                report,
            };
        } catch (error) {
            console.error('Daily report error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}

module.exports = GenerateDailyReportUseCase;