/**
 * API Service - Centralized API calls with authentication
 */

import axios from 'axios';
import config from '../config/config';

// Token key - use consistent key across the app
const TOKEN_KEY = 'adminToken';
const USER_KEY = 'adminUser';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: config.API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 second timeout
});

// Request interceptor - add auth token to all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token && token !== 'null' && token !== 'undefined') {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            
            // Redirect to login if not already there
            if (!window.location.pathname.includes('/admin/login')) {
                window.location.href = '/admin/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/api/v2/auth/login', credentials),
    logout: () => api.post('/api/v2/auth/logout'),
    refreshToken: (token) => api.post('/api/v2/auth/refresh-token', { token }),
    changePassword: (data) => api.post('/api/v2/auth/change-password', data),
    getProfile: () => api.get('/api/v2/auth/profile')
};

// Dashboard API
export const dashboardAPI = {
    getStats: () => api.get('/api/v2/dashboard/stats'),
    getRevenueChart: (period = 'week') => api.get(`/api/v2/dashboard/revenue-chart?period=${period}`),
    getActiveSessions: () => api.get('/api/v2/dashboard/active-sessions'),
    getRecentTransactions: (limit = 10) => api.get(`/api/v2/dashboard/recent-transactions?limit=${limit}`),
    getAlerts: () => api.get('/api/v2/dashboard/alerts'),
    getPackageStats: () => api.get('/api/v2/dashboard/package-stats'),
    getPeakHours: () => api.get('/api/v2/dashboard/peak-hours')
};

// Payments API
export const paymentsAPI = {
    getAll: (params = {}) => api.get('/api/admin/payments', { params }),
    getStats: () => api.get('/api/admin/payments/stats'),
    getById: (id) => api.get(`/api/admin/payments/${id}`),
    refund: (id, reason) => api.post(`/api/admin/payments/${id}/refund`, { reason }),
    export: (format = 'csv', params = {}) => api.get(`/api/admin/payments/export/${format}`, { 
        params,
        responseType: 'blob' 
    })
};

// Devices API
export const devicesAPI = {
    getAll: (params = {}) => api.get('/api/admin/devices', { params }),
    getStats: () => api.get('/api/admin/devices/stats/overview'),
    getById: (id) => api.get(`/api/admin/devices/${id}`),
    updateStatus: (id, status) => api.put(`/api/admin/devices/${id}/status`, { status }),
    bulkApprove: (deviceIds) => api.post('/api/admin/devices/bulk-approve', { deviceIds }),
    delete: (id) => api.delete(`/api/admin/devices/${id}`)
};

// Customers API
export const customersAPI = {
    getAll: (params = {}) => api.get('/api/admin/customers', { params }),
    getStats: () => api.get('/api/admin/customers/stats'),
    getByPhone: (phone) => api.get(`/api/admin/customers/${phone}`),
    update: (phone, data) => api.put(`/api/admin/customers/${phone}`, data),
    block: (phone, reason) => api.post(`/api/admin/customers/${phone}/block`, { reason }),
    unblock: (phone) => api.post(`/api/admin/customers/${phone}/unblock`)
};

// Packages API
export const packagesAPI = {
    getAll: (params = {}) => api.get('/api/admin/packages', { params }),
    getStats: () => api.get('/api/admin/packages/stats'),
    getById: (id) => api.get(`/api/admin/packages/${id}`),
    create: (data) => api.post('/api/admin/packages', data),
    update: (id, data) => api.put(`/api/admin/packages/${id}`, data),
    delete: (id) => api.delete(`/api/admin/packages/${id}`),
    initialize: () => api.post('/api/admin/packages/initialize')
};

// Vouchers API
export const vouchersAPI = {
    getAll: (params = {}) => api.get('/api/admin/vouchers', { params }),
    getStats: () => api.get('/api/admin/vouchers/stats'),
    getById: (id) => api.get(`/api/admin/vouchers/${id}`),
    generate: (data) => api.post('/api/admin/vouchers/generate', data),
    deactivate: (id) => api.put(`/api/admin/vouchers/${id}/deactivate`),
    delete: (id) => api.delete(`/api/admin/vouchers/${id}`),
    export: (format = 'csv') => api.get(`/api/admin/vouchers/export/${format}`, { responseType: 'blob' })
};

// Sessions API
export const sessionsAPI = {
    getAll: (params = {}) => api.get('/api/admin/sessions', { params }),
    getStats: () => api.get('/api/admin/sessions/stats'),
    getById: (id) => api.get(`/api/admin/sessions/${id}`),
    terminate: (id) => api.put(`/api/admin/sessions/${id}/terminate`),
    extend: (id, additionalMinutes) => api.put(`/api/admin/sessions/${id}/extend`, { additionalMinutes }),
    export: (format = 'csv', params = {}) => api.get(`/api/admin/sessions/export/${format}`, { 
        params,
        responseType: 'blob' 
    })
};

// Analytics API
export const analyticsAPI = {
    getDashboard: (period = '30d') => api.get(`/api/admin/analytics/dashboard?period=${period}`),
    getRevenueTrends: (period = '30d', groupBy = 'day') => 
        api.get(`/api/admin/analytics/revenue/trends?period=${period}&groupBy=${groupBy}`),
    getCustomerBehavior: () => api.get('/api/admin/analytics/customers/behavior'),
    getDeviceStats: () => api.get('/api/admin/analytics/devices/stats'),
    getSessionStats: () => api.get('/api/admin/analytics/sessions/stats'),
    getPerformance: () => api.get('/api/admin/analytics/performance'),
    getPackageAnalytics: () => api.get('/api/admin/analytics/packages')
};

// Audit Logs API
export const auditLogsAPI = {
    getAll: (params = {}) => api.get('/api/admin/audit-logs', { params }),
    getStats: (period = '30d') => api.get(`/api/admin/audit-logs/stats?period=${period}`),
    export: (params = {}) => api.get('/api/admin/audit-logs/export', { 
        params,
        responseType: 'blob' 
    })
};

// Settings API
export const settingsAPI = {
    getAll: () => api.get('/api/admin/settings'),
    getByCategory: (category) => api.get(`/api/admin/settings/category/${category}`),
    update: (settings, category) => api.put('/api/admin/settings', { settings, category }),
    getMpesa: () => api.get('/api/admin/settings/mpesa'),
    updateMpesa: (data) => api.put('/api/admin/settings/mpesa', data),
    getMikrotik: () => api.get('/api/admin/settings/mikrotik'),
    updateMikrotik: (data) => api.put('/api/admin/settings/mikrotik', data),
    testMikrotik: () => api.post('/api/admin/settings/mikrotik/test'),
    getSystemInfo: () => api.get('/api/admin/settings/system-info'),
    updateNotifications: (data) => api.put('/api/admin/settings/notifications', data)
};

// Notifications API
export const notificationsAPI = {
    getAll: (params = {}) => api.get('/api/admin/notifications', { params }),
    getUnreadCount: () => api.get('/api/admin/notifications/unread-count'),
    markAsRead: (id) => api.put(`/api/admin/notifications/${id}/read`),
    markAllRead: () => api.put('/api/admin/notifications/mark-all-read'),
    delete: (id) => api.delete(`/api/admin/notifications/${id}`),
    create: (data) => api.post('/api/admin/notifications', data),
    getAlerts: () => api.get('/api/admin/notifications/alerts')
};

// Router API
export const routerAPI = {
    testConnection: () => api.post('/api/admin/settings/mikrotik/test'),
    getActiveUsers: () => api.get('/api/router/active-users'),
    getProfiles: () => api.get('/api/router/profiles'),
    disconnectUser: (macAddress) => api.post('/api/router/disconnect', { macAddress }),
    blockMac: (macAddress, reason) => api.post('/api/router/block', { macAddress, reason }),
    unblockMac: (macAddress) => api.post('/api/router/unblock', { macAddress })
};

// Helper functions
export const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const formatCurrency = (amount, currency = 'KSH') => {
    return `${currency} ${parseFloat(amount || 0).toLocaleString()}`;
};

export const formatDate = (dateString, options = {}) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...options
    });
};

export const formatTimeAgo = (dateString) => {
    if (!dateString) return '-';
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

export default api;
