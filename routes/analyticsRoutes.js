const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/advancedAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET comprehensive dashboard analytics
router.get('/dashboard', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        let dateFilter;
        switch (period) {
            case '7d':
                dateFilter = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
                break;
            case '30d':
                dateFilter = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
                break;
            case '90d':
                dateFilter = 'DATE_SUB(NOW(), INTERVAL 90 DAY)';
                break;
            case 'year':
                dateFilter = 'DATE_SUB(NOW(), INTERVAL 1 YEAR)';
                break;
            default:
                dateFilter = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
        }
        
        // Revenue analytics
        const [revenue] = await db.query(`
            SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as total_revenue,
                AVG(CASE WHEN status = 'confirmed' THEN amount ELSE NULL END) as avg_transaction,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_transactions,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as successful_transactions
            FROM payments
            WHERE created_at >= ${dateFilter}
        `);
        
        // Customer analytics
        const [customers] = await db.query(`
            SELECT 
                COUNT(DISTINCT phone) as total_customers,
                COUNT(DISTINCT CASE WHEN created_at >= ${dateFilter} THEN phone END) as new_customers,
                AVG(purchase_count) as avg_purchases_per_customer
            FROM (
                SELECT phone, COUNT(*) as purchase_count
                FROM payments
                WHERE status = 'confirmed'
                GROUP BY phone
            ) as customer_stats
        `);
        
        // Device analytics
        const [devices] = await db.query(`
            SELECT 
                COUNT(*) as total_devices,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_devices,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_devices,
                SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_devices
            FROM devices
        `);
        
        // Session analytics
        const [sessions] = await db.query(`
            SELECT 
                COUNT(*) as total_sessions,
                SUM(CASE WHEN status = 'active' AND session_end > NOW() THEN 1 ELSE 0 END) as active_sessions,
                AVG(duration_minutes) as avg_session_duration,
                SUM(duration_minutes) as total_session_minutes
            FROM sessions
            WHERE session_start >= ${dateFilter}
        `);
        
        // Package popularity
        const [packages] = await db.query(`
            SELECT 
                p.amount,
                p.time_purchased as package_name,
                COUNT(*) as purchase_count,
                SUM(p.amount) as revenue
            FROM payments p
            WHERE p.status = 'confirmed'
            AND p.created_at >= ${dateFilter}
            GROUP BY p.amount, p.time_purchased
            ORDER BY purchase_count DESC
            LIMIT 5
        `);
        
        res.json({
            success: true,
            period,
            revenue: revenue[0],
            customers: customers[0],
            devices: devices[0],
            sessions: sessions[0],
            topPackages: packages
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
        const { period = '30d', groupBy = 'day' } = req.query;
        
        let dateFilter, dateFormat;
        switch (period) {
            case '7d':
                dateFilter = 'INTERVAL 7 DAY';
                dateFormat = '%Y-%m-%d';
                break;
            case '30d':
                dateFilter = 'INTERVAL 30 DAY';
                dateFormat = '%Y-%m-%d';
                break;
            case '90d':
                dateFilter = 'INTERVAL 90 DAY';
                dateFormat = groupBy === 'week' ? '%Y-%u' : '%Y-%m-%d';
                break;
            case 'year':
                dateFilter = 'INTERVAL 1 YEAR';
                dateFormat = '%Y-%m';
                break;
            default:
                dateFilter = 'INTERVAL 30 DAY';
                dateFormat = '%Y-%m-%d';
        }
        
        const [trends] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, '${dateFormat}') as period,
                COUNT(*) as transactions,
                SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as revenue,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM payments
            WHERE created_at >= DATE_SUB(NOW(), ${dateFilter})
            GROUP BY DATE_FORMAT(created_at, '${dateFormat}')
            ORDER BY period ASC
        `);
        
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
        // Customer segmentation by spending
        const [segments] = await db.query(`
            SELECT 
                CASE 
                    WHEN total_spent < 50 THEN 'Low Spender'
                    WHEN total_spent BETWEEN 50 AND 200 THEN 'Medium Spender'
                    WHEN total_spent BETWEEN 201 AND 500 THEN 'High Spender'
                    ELSE 'VIP'
                END as segment,
                COUNT(*) as customer_count,
                AVG(total_spent) as avg_spent,
                AVG(purchase_count) as avg_purchases
            FROM (
                SELECT 
                    phone,
                    SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as total_spent,
                    COUNT(*) as purchase_count
                FROM payments
                GROUP BY phone
            ) as customer_stats
            GROUP BY segment
        `);
        
        // Retention analysis
        const [retention] = await db.query(`
            SELECT 
                COUNT(DISTINCT CASE WHEN purchase_count = 1 THEN phone END) as one_time,
                COUNT(DISTINCT CASE WHEN purchase_count BETWEEN 2 AND 5 THEN phone END) as occasional,
                COUNT(DISTINCT CASE WHEN purchase_count BETWEEN 6 AND 10 THEN phone END) as regular,
                COUNT(DISTINCT CASE WHEN purchase_count > 10 THEN phone END) as loyal
            FROM (
                SELECT phone, COUNT(*) as purchase_count
                FROM payments
                WHERE status = 'confirmed'
                GROUP BY phone
            ) as customer_frequency
        `);
        
        // Peak hours analysis
        const [peakHours] = await db.query(`
            SELECT 
                HOUR(created_at) as hour,
                COUNT(*) as transaction_count,
                SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as revenue
            FROM payments
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY HOUR(created_at)
            ORDER BY hour ASC
        `);
        
        res.json({
            success: true,
            segments,
            retention: retention[0],
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
        // Device status distribution
        const [statusDist] = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM devices
            GROUP BY status
        `);
        
        // Most active devices
        const [topDevices] = await db.query(`
            SELECT 
                d.mac_address,
                d.phone,
                COUNT(s.id) as session_count,
                SUM(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END) as total_spent,
                MAX(d.last_seen) as last_seen
            FROM devices d
            LEFT JOIN sessions s ON d.id = s.device_id
            LEFT JOIN payments p ON s.payment_id = p.id
            GROUP BY d.id, d.mac_address, d.phone
            ORDER BY session_count DESC
            LIMIT 10
        `);
        
        // Device registration trends
        const [registrationTrend] = await db.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_devices
            FROM devices
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);
        
        res.json({
            success: true,
            statusDistribution: statusDist,
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
        // Session duration distribution
        const [durationDist] = await db.query(`
            SELECT 
                CASE 
                    WHEN duration_minutes < 60 THEN '< 1 hour'
                    WHEN duration_minutes BETWEEN 60 AND 360 THEN '1-6 hours'
                    WHEN duration_minutes BETWEEN 361 AND 1440 THEN '6-24 hours'
                    WHEN duration_minutes BETWEEN 1441 AND 10080 THEN '1-7 days'
                    ELSE '> 7 days'
                END as duration_range,
                COUNT(*) as count,
                AVG(duration_minutes) as avg_duration
            FROM sessions
            GROUP BY duration_range
            ORDER BY avg_duration ASC
        `);
        
        // Session status over time
        const [statusTrend] = await db.query(`
            SELECT 
                DATE(session_start) as date,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as terminated
            FROM sessions
            WHERE session_start >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(session_start)
            ORDER BY date ASC
        `);
        
        res.json({
            success: true,
            durationDistribution: durationDist,
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
        // Payment success rate
        const [paymentMetrics] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                (SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) / COUNT(*) * 100) as success_rate
            FROM payments
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        // Average response time (simulated based on payment processing)
        const [avgResponseTime] = await db.query(`
            SELECT 
                AVG(TIMESTAMPDIFF(SECOND, created_at, confirmed_at)) as avg_confirmation_time
            FROM payments
            WHERE status = 'confirmed'
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            AND confirmed_at IS NOT NULL
        `);
        
        // System uptime (active sessions)
        const [uptime] = await db.query(`
            SELECT 
                COUNT(DISTINCT DATE(session_start)) as active_days,
                COUNT(*) as total_sessions,
                SUM(duration_minutes) as total_uptime_minutes
            FROM sessions
            WHERE session_start >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        res.json({
            success: true,
            paymentMetrics: paymentMetrics[0],
            avgResponseTime: avgResponseTime[0].avg_confirmation_time || 0,
            uptime: uptime[0]
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
