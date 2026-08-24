// src/servers/http.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.HTTP_PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Routes
console.log('📡 Loading HTTP routes...');
try {
    const authRoutes = require('../interfaces/http/routes/authRoutes');
    const userRoutes = require('../interfaces/http/routes/userRoutes');
    const businessRoutes = require('../interfaces/http/routes/businessRoutes');
    
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/business', businessRoutes);
    console.log('✅ HTTP routes loaded');
} catch (error) {
    console.error('❌ Failed to load routes:', error.message);
}

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
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// Error handler
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
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 HTTP Server shutting down...');
    server.close(() => {
        console.log('✅ HTTP Server closed');
        process.exit(0);
    });
});

module.exports = { app, server };