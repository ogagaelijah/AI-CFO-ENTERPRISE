// src/servers/index.js
console.log('🚀 Starting AI CFO ENTERPRISE Servers...');

// =============================================
// START HTTP SERVER (for website)
// =============================================
try {
    require('./http');
    console.log('🌐 HTTP API Server is running');
} catch (error) {
    console.error('❌ HTTP Server failed to start:', error.message);
    process.exit(1);
}

// =============================================
// START TELEGRAM BOT (optional, with error tolerance)
// =============================================
try {
    const { startTelegramBot } = require('./telegram');
    startTelegramBot();
} catch (error) {
    console.warn('⚠️ Telegram Bot not available:', error.message);
    console.log('📡 HTTP Server is still running');
}

console.log('✅ All servers initialized');