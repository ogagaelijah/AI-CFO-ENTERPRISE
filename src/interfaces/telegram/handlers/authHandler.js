// src/interfaces/telegram/handlers/authHandler.js

const { getSessionManager } = require('../sessionManager');
const { getDatabase } = require('../../../infrastructure/database/sqlite/connection');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const { INDUSTRIES } = require('../../../config/industries');
const logger = require('../../../shared/utils/logger');

const sessionManager = getSessionManager();
const db = getDatabase();
const businessRepo = new BusinessRepository();

async function loginHandler(ctx) {
    try {
        const telegramId = ctx.from.id;
        
        // Get current session
        let session = sessionManager.getSession(telegramId);
        
        // If no session or not in login flow, start fresh login
        if (!session || (session.state !== 'LOGIN_WAITING_IDENTIFIER' && session.state !== 'LOGIN_WAITING_PASSWORD')) {
            sessionManager.createSession(telegramId, 'LOGIN_WAITING_IDENTIFIER', {});
            await ctx.reply(
                `🔐 **Login**\n\n` +
                `Enter your **email** or **phone number**:`
            );
            return;
        }

        const state = session.state;
        const data = session.data || {};

        // STEP 1: Waiting for email/phone
        if (state === 'LOGIN_WAITING_IDENTIFIER') {
            const identifier = ctx.message && ctx.message.text ? ctx.message.text.trim() : null;
            
            if (!identifier || identifier.startsWith('/')) {
                await ctx.reply('Please enter your email or phone number (not a command):');
                return;
            }

            sessionManager.setData(telegramId, { ...data, identifier });
            sessionManager.setState(telegramId, 'LOGIN_WAITING_PASSWORD');
            
            await ctx.reply(`Enter your **password**:`);
            return;
        }

        // STEP 2: Waiting for password
        if (state === 'LOGIN_WAITING_PASSWORD') {
            const password = ctx.message && ctx.message.text ? ctx.message.text.trim() : null;
            
            if (!password || password.startsWith('/')) {
                await ctx.reply('Please enter your password (not a command):');
                return;
            }

            const identifier = data.identifier;

            if (!identifier) {
                sessionManager.setState(telegramId, 'LOGIN_WAITING_IDENTIFIER');
                await ctx.reply(
                    `🔐 **Login**\n\n` +
                    `Enter your **email** or **phone number**:`
                );
                return;
            }

            try {
                // Find user by email or phone
                let user = null;

                const emailStmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
                user = emailStmt.get(identifier);

                if (!user) {
                    const phoneStmt = db.prepare('SELECT * FROM users WHERE phone_number = ?');
                    user = phoneStmt.get(identifier);
                }

                if (!user) {
                    await ctx.reply(
                        `❌ No account found with this email or phone number.\n\n` +
                        `Please use the exact email or phone number you registered with.`
                    );
                    sessionManager.setState(telegramId, 'LOGIN_WAITING_IDENTIFIER');
                    return;
                }

                // Verify password
                const bcrypt = require('bcryptjs');
                const isValid = await bcrypt.compare(password, user.password_hash);

                if (!isValid) {
                    await ctx.reply(`❌ Invalid password. Please try again.`);
                    return;
                }

                // ✅ LOGIN SUCCESSFUL
                const businesses = await businessRepo.findByUserId(user.id);
                const business = businesses.length > 0 ? businesses[0] : null;
                const industry = business ? INDUSTRIES[business.industry] : null;
                const industryName = industry ? `${industry.icon} ${industry.name}` : 'N/A';

                // Calculate trial days remaining
                const createdAt = new Date(user.created_at);
                const trialEndDate = new Date(createdAt);
                trialEndDate.setDate(trialEndDate.getDate() + 30);
                const today = new Date();
                const daysRemaining = Math.ceil((trialEndDate - today) / (1000 * 60 * 60 * 24));

                sessionManager.clearSession(telegramId);

                let message =
                    `✅ **Login Successful!**\n\n` +
                    `👤 Welcome back, ${user.full_name}!\n` +
                    `🏢 Business: ${business ? business.name : 'N/A'}\n` +
                    `🏭 Industry: ${industryName}\n\n` +
                    `📋 **Account Status**\n` +
                    `─────────────────────\n`;

                if (daysRemaining > 0) {
                    message += `✅ Free Trial Active\n`;
                    message += `⏳ ${daysRemaining} days remaining\n`;
                    message += `📅 Trial ends: ${trialEndDate.toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}`;
                } else {
                    message += `⚠️ Free Trial Expired\n`;
                    message += `⏳ Please upgrade to continue\n`;
                }

                message += `\n📊 **Your Dashboard is ready!**\n`;
                message += `Type /dashboard to view your business overview.\n\n`;

                message += `📋 **Quick Actions for ${industryName}:**\n`;
                if (industry && industry.features.inventory) {
                    message += `/sale - Record a sale\n`;
                    message += `/inventory - Manage inventory\n`;
                }
                message += `/dashboard - View dashboard\n`;
                message += `/help - See all commands`;

                await ctx.reply(message);

            } catch (error) {
                logger.error('Login error:', error);
                await ctx.reply(`❌ An error occurred: ${error.message}`);
                sessionManager.setState(telegramId, 'LOGIN_WAITING_IDENTIFIER');
            }
            return;
        }

        sessionManager.setState(telegramId, 'LOGIN_WAITING_IDENTIFIER');
        await ctx.reply(
            `🔐 **Login**\n\n` +
            `Enter your **email** or **phone number**:`
        );

    } catch (error) {
        logger.error('Login handler error:', error);
        await ctx.reply('❌ Something went wrong. Please try again.');
    }
}

module.exports = { loginHandler };