// frontend/src/services/paymentService.js
import api from './api';

export const paymentApi = {
    initialize: (data) => api.post('/payment/initialize', data),

    verify: (reference) => {
        if (!reference) {
            return Promise.reject(new Error('No reference provided'));
        }
        return api.get(`/payment/verify/${reference}`);
    },

    getStatus: (reference) => api.get(`/payment/status/${reference}`),
};

export const openFlutterwaveCheckout = (paymentLink) => {
    if (!paymentLink) {
        console.error('No payment link provided');
        return;
    }
    window.location.href = paymentLink;
};