const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/advancedAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET all payments with filters
router.get('/', async (req, res) => {
    try {
        const { status, period, search, limit = 100, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                p.*,
                d.mac_address,
                s.status as session_status
            FROM payments p
            LEFT JOIN devices d ON p.phone = d.phone
            LEFT JOIN sessions s ON p.id = s.payment_id
            WHERE 1=1
        `;
        
        const params = [];
        
        // Filter by status
        if (status && status !== 'all') {
            query += ' AND p.status = ?';
            params.push(status);
        }
        
        // Filter by period
        if (period && period !== 'all') {
            switch (period) {
                case 'today':
                    query += ' AND DATE(p.created_at) = CURDATE()';
                    break;
                case 'week':
                    query += ' AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    query += ' AND p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    break;
            }
        }
        
        // Search filter
        if (search) {
            query += ' AND (p.transaction_id LIKE ? OR p.phone LIKE ? OR p.mpesa_receipt_number LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [payments] = await db.query(query, params);
        
        res.json({ success: true, payments });
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// GET payment statistics
router.get('/stats', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded,
                COALESCE(SUM(CASE WHEN status = 'confirmed' THEN CAST(amount AS DECIMAL(10,2)) ELSE 0 END), 0) as totalRevenue
            FROM payments
        `);
        
        res.json({ success: true, stats: stats[0] });
    } catch (error) {
        console.error('Get payment stats error:', error);
        res.status(500).json({ error: 'Failed to fetch payment statistics' });
    }
});

// GET single payment details
router.get('/:id', async (req, res) => {
    try {
        const [payments] = await db.query(
            `SELECT 
                p.*,
                d.mac_address,
                d.ip_address,
                s.id as session_id,
                s.status as session_status,
                s.session_start,
                s.session_end
            FROM payments p
            LEFT JOIN devices d ON p.phone = d.phone
            LEFT JOIN sessions s ON p.id = s.payment_id
            WHERE p.id = ?`,
            [req.params.id]
        );
        
        if (payments.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json({ success: true, payment: payments[0] });
    } catch (error) {
        console.error('Get payment error:', error);
        res.status(500).json({ error: 'Failed to fetch payment details' });
    }
});

// POST refund request
router.post('/:id/refund', roleMiddleware(['super_admin', 'admin']), async (req, res) => {
    try {
        const { reason } = req.body;
        
        if (!reason || reason.trim() === '') {
            return res.status(400).json({ error: 'Refund reason is required' });
        }
        
        // Get payment details
        const [payments] = await db.query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
        
        if (payments.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        const payment = payments[0];
        
        if (payment.status !== 'confirmed') {
            return res.status(400).json({ error: 'Only confirmed payments can be refunded' });
        }
        
        // Create refund record
        await db.query(
            `INSERT INTO refunds (payment_id, amount, reason, requested_by, status) 
             VALUES (?, ?, ?, ?, 'pending')`,
            [payment.id, payment.amount, reason, req.admin.id]
        );
        
        // Update payment status
        await db.query(
            'UPDATE payments SET status = ? WHERE id = ?',
            ['refunded', req.params.id]
        );
        
        // Log the action
        await db.query(
            'INSERT INTO audit_logs (admin_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)',
            [req.admin.id, 'REFUND_PAYMENT', 'payments', req.params.id, JSON.stringify({ reason, amount: payment.amount })]
        );
        
        res.json({ success: true, message: 'Refund request created successfully' });
    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({ error: 'Failed to process refund' });
    }
});

// GET failed payments with error analysis
router.get('/analysis/failures', async (req, res) => {
    try {
        const [failures] = await db.query(`
            SELECT 
                error_message,
                COUNT(*) as count,
                SUM(CAST(amount AS DECIMAL(10,2))) as total_amount
            FROM payments
            WHERE status = 'failed' AND error_message IS NOT NULL
            GROUP BY error_message
            ORDER BY count DESC
        `);
        
        res.json({ success: true, failures });
    } catch (error) {
        console.error('Get failure analysis error:', error);
        res.status(500).json({ error: 'Failed to fetch failure analysis' });
    }
});

// GET revenue analytics
router.get('/analytics/revenue', async (req, res) => {
    try {
        const { period = 'week' } = req.query;
        
        let dateFormat = '%Y-%m-%d';
        let interval = 7;
        
        switch (period) {
            case 'today':
                dateFormat = '%H:00';
                interval = 24;
                break;
            case 'month':
                dateFormat = '%Y-%m-%d';
                interval = 30;
                break;
            case 'year':
                dateFormat = '%Y-%m';
                interval = 12;
                break;
        }
        
        const [revenue] = await db.query(`
            SELECT 
                DATE_FORMAT(created_at, ?) as date,
                COUNT(*) as transactions,
                SUM(CAST(amount AS DECIMAL(10,2))) as revenue
            FROM payments
            WHERE status = 'confirmed' 
            AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE_FORMAT(created_at, ?)
            ORDER BY created_at ASC
        `, [dateFormat, interval, dateFormat]);
        
        res.json({ success: true, revenue });
    } catch (error) {
        console.error('Get revenue analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch revenue analytics' });
    }
});

// EXPORT payments (CSV format)
router.get('/export/csv', async (req, res) => {
    try {
        const { status, period } = req.query;
        
        let query = 'SELECT * FROM payments WHERE 1=1';
        const params = [];
        
        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }
        
        if (period && period !== 'all') {
            switch (period) {
                case 'today':
                    query += ' AND DATE(created_at) = CURDATE()';
                    break;
                case 'week':
                    query += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
                    break;
                case 'month':
                    query += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
                    break;
            }
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [payments] = await db.query(query, params);
        
        // Generate CSV
        let csv = 'ID,Transaction ID,Phone,Amount,Package,Status,MPesa Receipt,Date,Error Message\n';
        
        payments.forEach(payment => {
            csv += `${payment.id},${payment.transaction_id},${payment.phone},${payment.amount},${payment.time_purchased},${payment.status},${payment.mpesa_receipt || ''},${payment.created_at},${payment.error_message || ''}\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=payments_${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export payments' });
    }
});

// GET recent transactions
router.get('/recent/transactions', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const [transactions] = await db.query(
            'SELECT * FROM payments ORDER BY created_at DESC LIMIT ?',
            [parseInt(limit)]
        );
        
        res.json({ success: true, transactions });
    } catch (error) {
        console.error('Get recent transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch recent transactions' });
    }
});

module.exports = router;
