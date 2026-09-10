// src/interfaces/http/server.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.HTTP_PORT || 5000;

// ===== Rate Limiters =====
const {
  strictLimiter,
  standardLimiter,
  generousLimiter,
} = require('./middleware/rateLimiter');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Routes
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

// ===== Strict rate limiting for auth =====
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/register', strictLimiter);
app.use('/api/auth/forgot-password', strictLimiter);
app.use('/api/auth/reset-password', strictLimiter);

// ===== Auth routes (already rate-limited above) =====
app.use('/api/auth', authRoutes);

// ===== Standard rate limiting (write/transaction endpoints) =====
app.use('/api/users', standardLimiter, userRoutes);
app.use('/api/business', standardLimiter, businessRoutes);
app.use('/api/payment', standardLimiter, paymentRoutes);
app.use('/api/subscription', standardLimiter, subscriptionRoutes);
app.use('/api/sales', standardLimiter, salesRoutes);
app.use('/api/inventory', standardLimiter, inventoryRoutes);
app.use('/api/debtors', standardLimiter, debtorRoutes);
app.use('/api/income', standardLimiter, incomeRoutes);
app.use('/api/expenses', standardLimiter, expenseRoutes);
app.use('/api/purchases', standardLimiter, purchaseRoutes);
app.use('/api/creditors', standardLimiter, creditorRoutes);
app.use('/api/suppliers', standardLimiter, supplierRoutes);
app.use('/api/customers', standardLimiter, customerRoutes);

// ===== Generous rate limiting (read-heavy intelligence endpoints) =====
app.use('/api/reports', generousLimiter, reportRoutes);
app.use('/api/analytics', generousLimiter, analyticsRoutes);
app.use('/api/forecast', generousLimiter, forecastRoutes);
app.use('/api/risk', generousLimiter, riskRoutes);
app.use('/api/decision', generousLimiter, decisionRoutes);
app.use('/api/advisor', generousLimiter, advisorRoutes);
app.use('/api/dashboard', generousLimiter, dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'AI CFO ENTERPRISE API is running',
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ HTTP Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🌐 HTTP Server running on http://localhost:${PORT}`);
  console.log(`⚡ Rate limiting: strict=auth, standard=writes, generous=reads`);
});

module.exports = { app, server };