const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const { authMiddleware } = require('../middleware/advancedAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Helper function to get date filter
const getDateFilter = (period) => {
    const now = new Date();
    switch (period) {
        case 'day':
            return new Date(now.setDate(now.getDate() - 1)).toISOString();
        case 'week':
            return new Date(now.setDate(now.getDate() - 7)).toISOString();
        case 'month':
            return new Date(now.setDate(now.getDate() - 30)).toISOString();
        case 'year':
            return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
        default:
            return new Date(now.setDate(now.getDate() - 7)).toISOString();
    }
};

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        // Get payment stats
        const { data: payments, error: payError } = await supabase
            .from('payments')
            .select('amount, status, created_at, phone');

        if (payError) throw payError;

        const confirmedPayments = payments?.filter(p => p.status === 'confirmed') || [];
        const totalRevenue = confirmedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const totalTransactions = payments?.length || 0;
        const uniqueCustomers = new Set(confirmedPayments.map(p => p.phone)).size;

        // Get today's stats
        const today = new Date().toISOString().split('T')[0];
        const todayPayments = confirmedPayments.filter(p => p.created_at?.startsWith(today));
        const todayRevenue = todayPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        // Get active sessions count
        const { data: sessions, error: sessError } = await supabase
            .from('sessions')
            .select('id')
            .eq('status', 'active');

        const activeSessions = sessions?.length || 0;

        // Get active packages count
        const { data: packages, error: pkgError } = await supabase
            .from('packages')
            .select('id')
            .eq('status', 'active');

        const activePackages = packages?.length || 0;

        const stats = {
            total_revenue: totalRevenue,
            total_transactions: totalTransactions,
            unique_customers: uniqueCustomers,
            today_revenue: todayRevenue,
            today_transactions: todayPayments.length,
            active_sessions: activeSessions,
            active_packages: activePackages
        };

        res.json({
            success: true,
            stats,
            hourlyRevenue: []
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats', details: error.message });
    }
});

// Get revenue chart data
router.get('/revenue-chart', async (req, res) => {
    try {
        const { period = 'week' } = req.query;
        const dateFilter = getDateFilter(period);
        
        const { data: payments, error } = await supabase
            .from('payments')
            .select('amount, created_at, phone, status')
            .eq('status', 'confirmed')
            .gte('created_at', dateFilter)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by day
        const groupedData = {};
        (payments || []).forEach(p => {
            const date = p.created_at?.split('T')[0];
            if (!groupedData[date]) {
                groupedData[date] = { period: date, transactions: 0, revenue: 0, unique_customers: new Set() };
            }
            groupedData[date].transactions++;
            groupedData[date].revenue += parseFloat(p.amount || 0);
            groupedData[date].unique_customers.add(p.phone);
        });

        const data = Object.values(groupedData).map(d => ({
            period: d.period,
            transactions: d.transactions,
            revenue: d.revenue,
            unique_customers: d.unique_customers.size
        }));
        
        res.json({ success: true, data });
    } catch (error) {
        console.error('Revenue chart error:', error);
        res.status(500).json({ error: 'Failed to fetch revenue chart', details: error.message });
    }
});

// Get active sessions
router.get('/active-sessions', async (req, res) => {
    try {
        const { data: sessions, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('status', 'active')
            .order('session_start', { ascending: false });
        
        if (error) throw error;
        
        res.json({ success: true, sessions: sessions || [] });
    } catch (error) {
        console.error('Active sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch active sessions', details: error.message });
    }
});

// Get recent transactions
router.get('/recent-transactions', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const { data: transactions, error } = await supabase
            .from('payments')
            .select('id, phone, amount, transaction_id, mpesa_receipt_number, status, created_at, mac_address')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        
        res.json({ success: true, transactions: transactions || [] });
    } catch (error) {
        console.error('Recent transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch recent transactions', details: error.message });
    }
});

// Get package statistics
router.get('/package-stats', async (req, res) => {
    try {
        const { data: packages, error: pkgError } = await supabase
            .from('packages')
            .select('id, name, amount, status')
            .eq('status', 'active');

        if (pkgError) throw pkgError;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: payments, error: payError } = await supabase
            .from('payments')
            .select('amount, status')
            .eq('status', 'confirmed')
            .gte('created_at', thirtyDaysAgo.toISOString());

        if (payError) throw payError;

        // Calculate stats per package
        const stats = (packages || []).map(pkg => {
            const pkgPayments = (payments || []).filter(p => parseFloat(p.amount) === parseFloat(pkg.amount));
            const totalRevenue = pkgPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            return {
                id: pkg.id,
                name: pkg.name,
                price: pkg.amount,
                total_sales: pkgPayments.length,
                total_revenue: totalRevenue,
                avg_sale: pkgPayments.length > 0 ? totalRevenue / pkgPayments.length : 0
            };
        });
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Package stats error:', error);
        res.status(500).json({ error: 'Failed to fetch package stats', details: error.message });
    }
});

// Get system alerts/notifications
router.get('/alerts', async (req, res) => {
    try {
        const adminId = req.admin?.id || req.user?.id;
        
        // Get notifications - handle case where table might not exist
        let notifications = [];
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .or(`admin_id.eq.${adminId},admin_id.is.null`)
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(20);
            if (!error) notifications = data || [];
        } catch (e) {
            // Notifications table might not exist
        }

        // Build alerts from data checks
        const alerts = [];
        
        // Check for pending devices
        try {
            const { data: pendingDevices } = await supabase
                .from('devices')
                .select('id')
                .eq('status', 'pending');
            
            if (pendingDevices && pendingDevices.length > 0) {
                alerts.push({
                    type: 'warning',
                    message: `${pendingDevices.length} device(s) pending approval`,
                    action: '/admin/devices?status=pending'
                });
            }
        } catch (e) {}
        
        // Check for failed payments today
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: failedPayments } = await supabase
                .from('payments')
                .select('id')
                .eq('status', 'failed')
                .gte('created_at', today);
            
            if (failedPayments && failedPayments.length > 5) {
                alerts.push({
                    type: 'error',
                    message: `${failedPayments.length} failed payments today - check MPesa connection`,
                    action: '/admin/payments?status=failed'
                });
            }
        } catch (e) {}
        
        res.json({ success: true, notifications, alerts });
    } catch (error) {
        console.error('Alerts error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts', details: error.message });
    }
});

// Get customer segments
router.get('/customer-segments', async (req, res) => {
    try {
        const { data: payments, error } = await supabase
            .from('payments')
            .select('phone, amount, status')
            .eq('status', 'confirmed');

        if (error) throw error;

        // Group by customer
        const customerSpending = {};
        (payments || []).forEach(p => {
            if (!customerSpending[p.phone]) {
                customerSpending[p.phone] = 0;
            }
            customerSpending[p.phone] += parseFloat(p.amount || 0);
        });

        // Segment customers
        const segments = {
            'VIP': { count: 0, total_revenue: 0 },
            'Regular': { count: 0, total_revenue: 0 },
            'Occasional': { count: 0, total_revenue: 0 },
            'New': { count: 0, total_revenue: 0 }
        };

        Object.values(customerSpending).forEach(total => {
            if (total >= 1000) {
                segments['VIP'].count++;
                segments['VIP'].total_revenue += total;
            } else if (total >= 500) {
                segments['Regular'].count++;
                segments['Regular'].total_revenue += total;
            } else if (total >= 100) {
                segments['Occasional'].count++;
                segments['Occasional'].total_revenue += total;
            } else {
                segments['New'].count++;
                segments['New'].total_revenue += total;
            }
        });

        const result = Object.entries(segments).map(([name, data]) => ({
            customer_segment: name,
            count: data.count,
            total_revenue: data.total_revenue,
            avg_spent: data.count > 0 ? data.total_revenue / data.count : 0
        }));
        
        res.json({ success: true, segments: result });
    } catch (error) {
        console.error('Customer segments error:', error);
        res.status(500).json({ error: 'Failed to fetch customer segments', details: error.message });
    }
});

// Get peak usage hours
router.get('/peak-hours', async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: sessions, error } = await supabase
            .from('sessions')
            .select('session_start, duration_minutes, data_used_mb')
            .gte('session_start', sevenDaysAgo.toISOString());

        if (error) throw error;

        // Group by hour
        const hourlyStats = {};
        for (let i = 0; i < 24; i++) {
            hourlyStats[i] = { session_count: 0, total_duration: 0, total_data: 0 };
        }

        (sessions || []).forEach(s => {
            if (s.session_start) {
                const hour = new Date(s.session_start).getHours();
                hourlyStats[hour].session_count++;
                hourlyStats[hour].total_duration += parseFloat(s.duration_minutes || 0);
                hourlyStats[hour].total_data += parseFloat(s.data_used_mb || 0);
            }
        });

        const peakHours = Object.entries(hourlyStats).map(([hour, data]) => ({
            hour: parseInt(hour),
            session_count: data.session_count,
            avg_duration: data.session_count > 0 ? data.total_duration / data.session_count : 0,
            total_data: data.total_data
        }));
        
        res.json({ success: true, peakHours });
    } catch (error) {
        console.error('Peak hours error:', error);
        res.status(500).json({ error: 'Failed to fetch peak hours', details: error.message });
    }
});

module.exports = router;
