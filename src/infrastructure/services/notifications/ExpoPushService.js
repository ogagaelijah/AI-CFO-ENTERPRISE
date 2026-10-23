// src/infrastructure/services/notifications/ExpoPushService.js
// v1.0.0-prod — Centralized service for sending Expo push notifications.

const axios = require('axios');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to a specific Expo push token.
 */
async function sendPushNotification(expoPushToken, title, body, data = {}) {
    if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken')) {
        console.log('[ExpoPushService] Invalid or missing push token. Skipping.');
        return;
    }

    const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
    };

    try {
        const response = await axios.post(EXPO_PUSH_URL, message, {
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            timeout: 10000, 
        });

        const receipt = response.data?.data;
        if (receipt && receipt.status === 'error') {
            console.error(`[ExpoPushService] Expo error for token ${expoPushToken}:`, receipt.message);
        }
    } catch (error) {
        console.error('[ExpoPushService] Failed to send push notification:', error.message);
    }
}

/**
 * Send push notifications to multiple tokens at once.
 */
async function sendBulkPushNotifications(expoPushTokens, title, body, data = {}) {
    const validTokens = (expoPushTokens || []).filter(t => t && t.startsWith('ExponentPushToken'));
    if (validTokens.length === 0) return;

    const chunks = [];
    for (let i = 0; i < validTokens.length; i += 100) {
        chunks.push(validTokens.slice(i, i + 100));
    }

    for (const chunk of chunks) {
        const messages = chunk.map(token => ({
            to: token,
            sound: 'default',
            title,
            body,
            data,
        }));

        try {
            await axios.post(EXPO_PUSH_URL, messages, {
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
        } catch (error) {
            console.error('[ExpoPushService] Failed to send bulk push notifications:', error.message);
        }
    }
}

module.exports = {
    sendPushNotification,
    sendBulkPushNotifications,
};