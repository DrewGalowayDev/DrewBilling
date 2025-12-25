const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/advancedAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const [[stats]] = await db.query('SELECT * FROM v_dashboard_stats');
        
        // Get hourly revenue for today
        const [hourlyRevenue] = await db.query(`
            SELECT 
                HOUR(created_at) as hour,
                COUNT(*) as transactions,
                SUM(CAST(amount AS DECIMAL(10,2))) as revenue
            FROM payments
            WHERE DATE(created_at) = CURDATE() AND status = 'confirmed'
            GROUP BY HOUR(created_at)
            ORDER BY hour
        `);

        res.json({
            success: true,
            stats,
            hourlyRevenue
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// Get revenue chart data
router.get('/revenue-chart', async (req, res) => {
    try {
        const { period = 'week', startDate, endDate } = req.query;
        
        let dateFilter = '';
        let groupBy = 'DATE(created_at)';
        
        if (period === 'day') {
            dateFilter = 'AND created_at >= CURDATE()';
            groupBy = 'HOUR(created_at)';
        } else if (period === 'week') {
            dateFilter = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        } else if (period === 'month') {
            dateFilter = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        } else if (period === 'year') {
            dateFilter = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
            groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
        } else if (startDate && endDate) {
            dateFilter = `AND DATE(created_at) BETWEEN '${startDate}' AND '${endDate}'`;
        }

        const query = `
            SELECT 
                ${groupBy} as period,
                COUNT(*) as transactions,
                SUM(CAST(amount AS DECIMAL(10,2))) as revenue,
                COUNT(DISTINCT phone) as unique_customers
            FROM payments
            WHERE status = 'confirmed' ${dateFilter}
            GROUP BY ${groupBy}
            ORDER BY period ASC
        `;

        const [data] = await db.query(query);
        
        res.json({ success: true, data });
    } catch (error) {
        console.error('Revenue chart error:', error);
        res.status(500).json({ error: 'Failed to fetch revenue chart' });
    }
});

// Get active sessions
router.get('/active-sessions', async (req, res) => {
    try {
        const [sessions] = await db.query('SELECT * FROM v_active_sessions_detail ORDER BY session_start DESC');
        
        res.json({ success: true, sessions });
    } catch (error) {
        console.error('Active sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch active sessions' });
    }
});

// Get recent transactions
router.get('/recent-transactions', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const [transactions] = await db.query(`
            SELECT 
                p.id,
                p.phone,
                p.amount,
                p.transaction_id,
                p.mpesa_receipt_number,
                p.status,
                p.created_at,
                p.mac_address,
                c.name as customer_name
            FROM payments p
            LEFT JOIN customers c ON p.phone = c.phone
            ORDER BY p.created_at DESC
            LIMIT ?
        `, [limit]);
        
        res.json({ success: true, transactions });
    } catch (error) {
        console.error('Recent transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch recent transactions' });
    }
});

// Get package statistics
router.get('/package-stats', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                pkg.id,
                pkg.name,
                pkg.price,
                COUNT(p.id) as total_sales,
                SUM(CAST(p.amount AS DECIMAL(10,2))) as total_revenue,
                AVG(CAST(p.amount AS DECIMAL(10,2))) as avg_sale
            FROM packages pkg
            LEFT JOIN payments p ON CAST(p.amount AS DECIMAL(10,2)) = pkg.price 
                AND p.status = 'confirmed'
                AND p.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            WHERE pkg.is_active = TRUE
            GROUP BY pkg.id, pkg.name, pkg.price
            ORDER BY total_revenue DESC
        `);
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Package stats error:', error);
        res.status(500).json({ error: 'Failed to fetch package stats' });
    }
});

// Get system alerts/notifications
router.get('/alerts', async (req, res) => {
    try {
        // Get unread notifications for this admin or global notifications
        const [notifications] = await db.query(`
            SELECT *
            FROM notifications
            WHERE (admin_id = ? OR admin_id IS NULL) AND is_read = FALSE
            ORDER BY priority DESC, created_at DESC
            LIMIT 20
        `, [req.admin.id]);
        
        // Get system alerts
        const alerts = [];
        
        // Check for pending devices
        const [[{ pending_count }]] = await db.query(
            'SELECT COUNT(*) as pending_count FROM devices WHERE status = "pending"'
        );
        if (pending_count > 0) {
            alerts.push({
                type: 'warning',
                message: `${pending_count} device(s) pending approval`,
                action: '/admin/devices?status=pending'
            });
        }
        
        // Check for failed payments today
        const [[{ failed_count }]] = await db.query(
            'SELECT COUNT(*) as failed_count FROM payments WHERE DATE(created_at) = CURDATE() AND status = "failed"'
        );
        if (failed_count > 5) {
            alerts.push({
                type: 'error',
                message: `${failed_count} failed payments today - check MPesa connection`,
                action: '/admin/payments?status=failed'
            });
        }
        
        res.json({ success: true, notifications, alerts });
    } catch (error) {
        console.error('Alerts error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// Get customer segments
router.get('/customer-segments', async (req, res) => {
    try {
        const [segments] = await db.query(`
            SELECT 
                customer_segment,
                COUNT(*) as count,
                SUM(total_spent) as total_revenue,
                AVG(total_spent) as avg_spent
            FROM v_customer_analytics
            GROUP BY customer_segment
        `);
        
        res.json({ success: true, segments });
    } catch (error) {
        console.error('Customer segments error:', error);
        res.status(500).json({ error: 'Failed to fetch customer segments' });
    }
});

// Get peak usage hours
router.get('/peak-hours', async (req, res) => {
    try {
        const [peakHours] = await db.query(`
            SELECT 
                HOUR(session_start) as hour,
                COUNT(*) as session_count,
                AVG(duration_minutes) as avg_duration,
                SUM(data_used_mb) as total_data
            FROM sessions
            WHERE session_start >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY HOUR(session_start)
            ORDER BY hour
        `);
        
        res.json({ success: true, peakHours });
    } catch (error) {
        console.error('Peak hours error:', error);
        res.status(500).json({ error: 'Failed to fetch peak hours' });
    }
});

module.exports = router;
