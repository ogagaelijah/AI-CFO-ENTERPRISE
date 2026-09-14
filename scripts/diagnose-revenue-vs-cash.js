// scripts/diagnose-revenue-vs-cash.js
require('dotenv').config();
const { getPool, closePool } = require('../src/infrastructure/database/sqlite/connection');

(async () => {
    try {
        const biz = 1;

        console.log('=== SALES (2026-08-31 to 2026-09-14) ===');
        const sales = await getPool().query(
            `SELECT id, total_price, amount_paid, balance_remaining, payment_status, sale_date
             FROM sales
             WHERE business_id = $1
               AND DATE(sale_date) BETWEEN $2 AND $3
             ORDER BY id`,
            [biz, '2026-08-31', '2026-09-14']
        );
        console.table(sales.rows);

        console.log('\n=== TOTALS FROM SALES ===');
        const salesTotals = await getPool().query(
            `SELECT
                COALESCE(SUM(total_price), 0)::numeric AS total_revenue,
                COALESCE(SUM(amount_paid), 0)::numeric AS total_paid,
                COALESCE(SUM(balance_remaining), 0)::numeric AS total_outstanding
             FROM sales
             WHERE business_id = $1
               AND DATE(sale_date) BETWEEN $2 AND $3`,
            [biz, '2026-08-31', '2026-09-14']
        );
        console.log(salesTotals.rows[0]);

        console.log('\n=== INCOME (2026-08-31 to 2026-09-14) ===');
        const income = await getPool().query(
            `SELECT id, source, amount, date FROM income
             WHERE business_id = $1
               AND date BETWEEN $2 AND $3
             ORDER BY id`,
            [biz, '2026-08-31', '2026-09-14']
        );
        console.table(income.rows);

        const incomeTotal = await getPool().query(
            `SELECT COALESCE(SUM(amount), 0)::numeric AS total_income
             FROM income
             WHERE business_id = $1 AND date BETWEEN $2 AND $3`,
            [biz, '2026-08-31', '2026-09-14']
        );
        console.log('Total other income:', incomeTotal.rows[0]);

        console.log('\n=== PAYMENTS (2026-08-31 to 2026-09-14) ===');
        const payments = await getPool().query(
            `SELECT id, payment_type, amount, reference_type, reference_id, payment_date
             FROM payments
             WHERE business_id = $1
               AND DATE(payment_date) BETWEEN $2 AND $3
             ORDER BY id`,
            [biz, '2026-08-31', '2026-09-14']
        );
        console.table(payments.rows);

        const paymentsTotal = await getPool().query(
            `SELECT
                COALESCE(SUM(CASE WHEN payment_type = 'RECEIVED' THEN amount ELSE 0 END), 0)::numeric AS cash_in,
                COALESCE(SUM(CASE WHEN payment_type = 'MADE' THEN amount ELSE 0 END), 0)::numeric AS cash_out
             FROM payments
             WHERE business_id = $1
               AND DATE(payment_date) BETWEEN $2 AND $3`,
            [biz, '2026-08-31', '2026-09-14']
        );
        console.log(paymentsTotal.rows[0]);

        console.log('\n=== DEBTORS ===');
        const debtors = await getPool().query(
            `SELECT id, customer_name, total_owed, amount_paid, balance_remaining, status, due_date
             FROM debtors
             WHERE business_id = $1
             ORDER BY id`,
            [biz]
        );
        console.table(debtors.rows);

    } catch (e) {
        console.error('❌', e.message);
    } finally {
        await closePool();
    }
})();