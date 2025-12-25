const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const { authMiddleware } = require('../middleware/advancedAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Helper function to get date filter
const getDateRange = (period) => {
    const now = new Date();
    let days;
    switch (period) {
        case '7d': days = 7; break;
        case '30d': days = 30; break;
        case '90d': days = 90; break;
        case 'year': days = 365; break;
        default: days = 30;
    }
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return startDate.toISOString();
};

// GET comprehensive dashboard analytics
router.get('/dashboard', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const startDate = getDateRange(period);
        
        // Fetch all payments in period
        const { data: payments, error: payError } = await supabase
            .from('payments')
            .select('amount, status, phone, created_at')
            .gte('created_at', startDate);

        if (payError) throw payError;

        // Revenue analytics
        const totalTransactions = payments?.length || 0;
        const confirmedPayments = payments?.filter(p => p.status === 'confirmed') || [];
        const totalRevenue = confirmedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const avgTransaction = confirmedPayments.length > 0 ? totalRevenue / confirmedPayments.length : 0;
        const failedTransactions = payments?.filter(p => p.status === 'failed').length || 0;
        const successfulTransactions = confirmedPayments.length;

        // Customer analytics
        const uniquePhones = new Set(confirmedPayments.map(p => p.phone));
        const totalCustomers = uniquePhones.size;
        
        // Device analytics
        const { data: devices, error: devError } = await supabase
            .from('devices')
            .select('status');

        const deviceStats = {
            total_devices: devices?.length || 0,
            active_devices: devices?.filter(d => d.status === 'active').length || 0,
            pending_devices: devices?.filter(d => d.status === 'pending').length || 0,
            blocked_devices: devices?.filter(d => d.status === 'blocked').length || 0
        };
        
        // Session analytics
        const { data: sessions, error: sessError } = await supabase
            .from('sessions')
            .select('status, duration_minutes, session_start, session_end')
            .gte('session_start', startDate);

        const activeSessions = sessions?.filter(s => s.status === 'active').length || 0;
        const totalSessionMinutes = sessions?.reduce((sum, s) => sum + parseFloat(s.duration_minutes || 0), 0) || 0;
        const avgSessionDuration = sessions?.length > 0 ? totalSessionMinutes / sessions.length : 0;

        // Package popularity
        const packageCounts = {};
        confirmedPayments.forEach(p => {
            const amount = parseFloat(p.amount);
            if (!packageCounts[amount]) {
                packageCounts[amount] = { amount, purchase_count: 0, revenue: 0 };
            }
            packageCounts[amount].purchase_count++;
            packageCounts[amount].revenue += amount;
        });

        const topPackages = Object.values(packageCounts)
            .sort((a, b) => b.purchase_count - a.purchase_count)
            .slice(0, 5);

        res.json({
            success: true,
            period,
            revenue: {
                total_transactions: totalTransactions,
                total_revenue: totalRevenue,
                avg_transaction: avgTransaction,
                failed_transactions: failedTransactions,
                successful_transactions: successfulTransactions
            },
            customers: {
                total_customers: totalCustomers,
                new_customers: totalCustomers
            },
            devices: deviceStats,
            sessions: {
                total_sessions: sessions?.length || 0,
                active_sessions: activeSessions,
                avg_session_duration: avgSessionDuration,
                total_session_minutes: totalSessionMinutes
            },
            topPackages
        });
    } catch (error) {
        console.error('Error fetching dashboard analytics:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch analytics',
            error: error.message 
        });
    }
});

// GET revenue trends over time
router.get('/revenue/trends', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const startDate = getDateRange(period);
        
        const { data: payments, error } = await supabase
            .from('payments')
            .select('amount, status, created_at')
            .gte('created_at', startDate)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Group by date
        const groupedData = {};
        (payments || []).forEach(p => {
            const date = p.created_at?.split('T')[0];
            if (!groupedData[date]) {
                groupedData[date] = { period: date, transactions: 0, revenue: 0, successful: 0, failed: 0 };
            }
            groupedData[date].transactions++;
            if (p.status === 'confirmed') {
                groupedData[date].revenue += parseFloat(p.amount || 0);
                groupedData[date].successful++;
            } else if (p.status === 'failed') {
                groupedData[date].failed++;
            }
        });

        const trends = Object.values(groupedData).sort((a, b) => a.period.localeCompare(b.period));
        
        res.json({
            success: true,
            trends
        });
    } catch (error) {
        console.error('Error fetching revenue trends:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch trends',
            error: error.message 
        });
    }
});

// GET customer behavior analytics
router.get('/customers/behavior', async (req, res) => {
    try {
        const thirtyDaysAgo = getDateRange('30d');
        
        const { data: payments, error } = await supabase
            .from('payments')
            .select('phone, amount, status, created_at');

        if (error) throw error;

        // Calculate customer spending
        const customerStats = {};
        (payments || []).filter(p => p.status === 'confirmed').forEach(p => {
            if (!customerStats[p.phone]) {
                customerStats[p.phone] = { total_spent: 0, purchase_count: 0 };
            }
            customerStats[p.phone].total_spent += parseFloat(p.amount || 0);
            customerStats[p.phone].purchase_count++;
        });

        // Segment customers
        const segments = {
            'Low Spender': { customer_count: 0, total_spent: 0, total_purchases: 0 },
            'Medium Spender': { customer_count: 0, total_spent: 0, total_purchases: 0 },
            'High Spender': { customer_count: 0, total_spent: 0, total_purchases: 0 },
            'VIP': { customer_count: 0, total_spent: 0, total_purchases: 0 }
        };

        const retention = { one_time: 0, occasional: 0, regular: 0, loyal: 0 };

        Object.values(customerStats).forEach(stats => {
            let segment;
            if (stats.total_spent < 50) segment = 'Low Spender';
            else if (stats.total_spent <= 200) segment = 'Medium Spender';
            else if (stats.total_spent <= 500) segment = 'High Spender';
            else segment = 'VIP';

            segments[segment].customer_count++;
            segments[segment].total_spent += stats.total_spent;
            segments[segment].total_purchases += stats.purchase_count;

            // Retention
            if (stats.purchase_count === 1) retention.one_time++;
            else if (stats.purchase_count <= 5) retention.occasional++;
            else if (stats.purchase_count <= 10) retention.regular++;
            else retention.loyal++;
        });

        const segmentArray = Object.entries(segments).map(([name, data]) => ({
            segment: name,
            customer_count: data.customer_count,
            avg_spent: data.customer_count > 0 ? data.total_spent / data.customer_count : 0,
            avg_purchases: data.customer_count > 0 ? data.total_purchases / data.customer_count : 0
        }));

        // Peak hours
        const hourlyStats = {};
        for (let i = 0; i < 24; i++) {
            hourlyStats[i] = { hour: i, transaction_count: 0, revenue: 0 };
        }

        (payments || []).filter(p => p.created_at && new Date(p.created_at) >= new Date(thirtyDaysAgo))
            .forEach(p => {
                const hour = new Date(p.created_at).getHours();
                hourlyStats[hour].transaction_count++;
                if (p.status === 'confirmed') {
                    hourlyStats[hour].revenue += parseFloat(p.amount || 0);
                }
            });

        const peakHours = Object.values(hourlyStats);
        
        res.json({
            success: true,
            segments: segmentArray,
            retention,
            peakHours
        });
    } catch (error) {
        console.error('Error fetching customer behavior:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch customer behavior',
            error: error.message 
        });
    }
});

// GET device analytics
router.get('/devices/stats', async (req, res) => {
    try {
        const thirtyDaysAgo = getDateRange('30d');
        
        // Device status distribution
        const { data: devices, error: devError } = await supabase
            .from('devices')
            .select('id, mac_address, phone, status, created_at, last_seen');

        if (devError) throw devError;

        const statusDist = {};
        (devices || []).forEach(d => {
            if (!statusDist[d.status]) statusDist[d.status] = 0;
            statusDist[d.status]++;
        });

        const statusDistribution = Object.entries(statusDist).map(([status, count]) => ({
            status,
            count
        }));

        // Registration trends
        const registrationCounts = {};
        (devices || []).filter(d => d.created_at && new Date(d.created_at) >= new Date(thirtyDaysAgo))
            .forEach(d => {
                const date = d.created_at.split('T')[0];
                if (!registrationCounts[date]) registrationCounts[date] = 0;
                registrationCounts[date]++;
            });

        const registrationTrend = Object.entries(registrationCounts)
            .map(([date, new_devices]) => ({ date, new_devices }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Top devices (simplified - just by last seen)
        const topDevices = (devices || [])
            .filter(d => d.status === 'active')
            .sort((a, b) => (b.last_seen || '').localeCompare(a.last_seen || ''))
            .slice(0, 10)
            .map(d => ({
                mac_address: d.mac_address,
                phone: d.phone,
                last_seen: d.last_seen
            }));
        
        res.json({
            success: true,
            statusDistribution,
            topDevices,
            registrationTrend
        });
    } catch (error) {
        console.error('Error fetching device analytics:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch device analytics',
            error: error.message 
        });
    }
});

// GET session analytics
router.get('/sessions/stats', async (req, res) => {
    try {
        const thirtyDaysAgo = getDateRange('30d');
        
        const { data: sessions, error } = await supabase
            .from('sessions')
            .select('id, status, duration_minutes, session_start, session_end')
            .gte('session_start', thirtyDaysAgo);

        if (error) throw error;

        // Duration distribution
        const durationRanges = {
            '< 1 hour': { count: 0, total: 0 },
            '1-6 hours': { count: 0, total: 0 },
            '6-24 hours': { count: 0, total: 0 },
            '1-7 days': { count: 0, total: 0 },
            '> 7 days': { count: 0, total: 0 }
        };

        (sessions || []).forEach(s => {
            const mins = parseFloat(s.duration_minutes || 0);
            let range;
            if (mins < 60) range = '< 1 hour';
            else if (mins <= 360) range = '1-6 hours';
            else if (mins <= 1440) range = '6-24 hours';
            else if (mins <= 10080) range = '1-7 days';
            else range = '> 7 days';

            durationRanges[range].count++;
            durationRanges[range].total += mins;
        });

        const durationDistribution = Object.entries(durationRanges).map(([range, data]) => ({
            duration_range: range,
            count: data.count,
            avg_duration: data.count > 0 ? data.total / data.count : 0
        }));

        // Status trend by date
        const statusByDate = {};
        (sessions || []).forEach(s => {
            const date = s.session_start?.split('T')[0];
            if (date) {
                if (!statusByDate[date]) {
                    statusByDate[date] = { date, active: 0, completed: 0, terminated: 0 };
                }
                if (s.status === 'active') statusByDate[date].active++;
                else if (s.status === 'completed') statusByDate[date].completed++;
                else if (s.status === 'terminated') statusByDate[date].terminated++;
            }
        });

        const statusTrend = Object.values(statusByDate).sort((a, b) => a.date.localeCompare(b.date));
        
        res.json({
            success: true,
            durationDistribution,
            statusTrend
        });
    } catch (error) {
        console.error('Error fetching session analytics:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch session analytics',
            error: error.message 
        });
    }
});

// GET performance metrics
router.get('/performance', async (req, res) => {
    try {
        const thirtyDaysAgo = getDateRange('30d');
        
        const { data: payments, error: payError } = await supabase
            .from('payments')
            .select('status, amount, created_at, confirmed_at')
            .gte('created_at', thirtyDaysAgo);

        if (payError) throw payError;

        const total = payments?.length || 0;
        const successful = payments?.filter(p => p.status === 'confirmed').length || 0;
        const failed = payments?.filter(p => p.status === 'failed').length || 0;
        const pending = payments?.filter(p => p.status === 'pending').length || 0;
        const successRate = total > 0 ? (successful / total * 100) : 0;

        // Calculate average confirmation time (if confirmed_at exists)
        const confirmedWithTime = payments?.filter(p => p.status === 'confirmed' && p.confirmed_at && p.created_at) || [];
        let avgConfirmationTime = 0;
        if (confirmedWithTime.length > 0) {
            const totalTime = confirmedWithTime.reduce((sum, p) => {
                const created = new Date(p.created_at).getTime();
                const confirmed = new Date(p.confirmed_at).getTime();
                return sum + (confirmed - created) / 1000; // seconds
            }, 0);
            avgConfirmationTime = totalTime / confirmedWithTime.length;
        }

        // Session uptime
        const { data: sessions, error: sessError } = await supabase
            .from('sessions')
            .select('session_start, duration_minutes')
            .gte('session_start', thirtyDaysAgo);

        const activeDays = new Set((sessions || []).map(s => s.session_start?.split('T')[0])).size;
        const totalSessions = sessions?.length || 0;
        const totalUptimeMinutes = sessions?.reduce((sum, s) => sum + parseFloat(s.duration_minutes || 0), 0) || 0;
        
        res.json({
            success: true,
            paymentMetrics: {
                total,
                successful,
                failed,
                pending,
                success_rate: successRate
            },
            avgResponseTime: avgConfirmationTime,
            uptime: {
                active_days: activeDays,
                total_sessions: totalSessions,
                total_uptime_minutes: totalUptimeMinutes
            }
        });
    } catch (error) {
        console.error('Error fetching performance metrics:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch performance metrics',
            error: error.message 
        });
    }
});

module.exports = router;
