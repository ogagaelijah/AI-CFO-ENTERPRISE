// src/interfaces/http/server.js
// v2.1.0-prod — Sentry v8+, structured logging, plan gating in correct order

const { initSentry, Sentry } = require('../../shared/utils/sentry');
initSentry();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
require('dotenv').config();

const logger = require('../../shared/utils/logger');

const app = express();
const PORT = process.env.HTTP_PORT || 5000;

const {
  strictLimiter,
  standardLimiter,
  generousLimiter,
} = require('./middleware/rateLimiter');

const { authMiddleware } = require('./middleware/authMiddleware');
const { planGuard } = require('./middleware/planGuard');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use(pinoHttp({
  logger,
  genReqId: (req) =>
    req.headers['x-request-id'] ||
    `srv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} ${res.statusCode} — ${err.message}`,
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}));

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const businessRoutes = require('./routes/businessRoutes');
const reportRoutes = require('./routes/reportRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const salesRoutes = require('./routes/salesRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const debtorRoutes = require('./routes/debtorRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const creditorRoutes = require('./routes/creditorRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const customerRoutes = require('./routes/customerRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const riskRoutes = require('./routes/riskRoutes');
const decisionRoutes = require('./routes/decisionRoutes');
const advisorRoutes = require('./routes/advisorRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/register', strictLimiter);
app.use('/api/auth/forgot-password', strictLimiter);
app.use('/api/auth/reset-password', strictLimiter);

app.use('/api/auth', authRoutes);

app.use('/api/subscription', standardLimiter, subscriptionRoutes);
app.use('/api/payment', standardLimiter, paymentRoutes);

app.use('/api/users', standardLimiter, authMiddleware, userRoutes);
app.use('/api/business', standardLimiter, authMiddleware, businessRoutes);

app.use('/api/sales', standardLimiter, authMiddleware, planGuard({ feature: 'sales' }), salesRoutes);
app.use('/api/inventory', standardLimiter, authMiddleware, planGuard({ feature: 'inventory' }), inventoryRoutes);
app.use('/api/debtors', standardLimiter, authMiddleware, planGuard({ feature: 'debtors' }), debtorRoutes);
app.use('/api/income', standardLimiter, authMiddleware, planGuard({ feature: 'income' }), incomeRoutes);
app.use('/api/expenses', standardLimiter, authMiddleware, planGuard({ feature: 'expenses' }), expenseRoutes);
app.use('/api/purchases', standardLimiter, authMiddleware, planGuard({ feature: 'purchases' }), purchaseRoutes);
app.use('/api/creditors', standardLimiter, authMiddleware, planGuard({ feature: 'creditors' }), creditorRoutes);
app.use('/api/suppliers', standardLimiter, authMiddleware, planGuard({ feature: 'suppliers' }), supplierRoutes);
app.use('/api/customers', standardLimiter, authMiddleware, planGuard({ feature: 'customers' }), customerRoutes);

app.use('/api/reports', generousLimiter, authMiddleware, planGuard({ feature: 'reports_basic' }), reportRoutes);

app.use('/api/analytics', generousLimiter, authMiddleware, planGuard({ feature: 'analytics' }), analyticsRoutes);
app.use('/api/forecast', generousLimiter, authMiddleware, planGuard({ feature: 'forecast' }), forecastRoutes);
app.use('/api/risk', generousLimiter, authMiddleware, planGuard({ feature: 'risk' }), riskRoutes);
app.use('/api/decision', generousLimiter, authMiddleware, planGuard({ feature: 'decisions' }), decisionRoutes);
app.use('/api/advisor', generousLimiter, authMiddleware, planGuard({ feature: 'ai_advisor' }), advisorRoutes);

app.use('/api/dashboard', generousLimiter, authMiddleware, planGuard({ feature: 'sales' }), dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'AI CFO ENTERPRISE API is running',
  });
});

app.use((req, res) => {
  logger.warn({ method: req.method, url: req.originalUrl }, 'http: 404');
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, _next) => {
  logger.error(
    { err: err.message, stack: err.stack, url: req.originalUrl },
    'http: unhandled error'
  );
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'http: server started');
  logger.info('rate limiting: strict=auth, standard=writes, generous=reads');
  logger.info('plan gating: active (authMiddleware → planGuard)');
  logger.info(
    process.env.SENTRY_DSN ? 'sentry: enabled' : 'sentry: disabled (no SENTRY_DSN)'
  );
});

module.exports = { app, server };