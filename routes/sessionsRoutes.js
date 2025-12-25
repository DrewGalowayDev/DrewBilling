const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/advancedAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET all sessions with filters
router.get('/', async (req, res) => {
    try {
        const { status, search, sortBy, limit = 100, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                s.*,
                d.mac_address,
                d.status as device_status,
                p.amount,
                p.transaction_id
            FROM sessions s
            LEFT JOIN devices d ON s.device_id = d.id
            LEFT JOIN payments p ON s.payment_id = p.id
            WHERE 1=1
        `;
        
        const params = [];
        
        // Filter by status
        if (status && status !== 'all') {
            query += ' AND s.status = ?';
            params.push(status);
        }
        
        // Search filter
        if (search) {
            query += ' AND (s.phone LIKE ? OR s.mac_address LIKE ? OR d.mac_address LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        // Sorting
        switch (sortBy) {
            case 'duration':
                query += ' ORDER BY s.duration_minutes DESC';
                break;
            case 'amount':
                query += ' ORDER BY p.amount DESC';
                break;
            case 'ending_soon':
                query += ' ORDER BY s.session_end ASC';
                break;
            case 'recent':
            default:
                query += ' ORDER BY s.session_start DESC';
                break;
        }
        
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [sessions] = await db.query(query, params);
        
        res.json({ 
            success: true, 
            sessions,
            count: sessions.length
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch sessions',
            error: error.message 
        });
    }
});

// GET session statistics
router.get('/stats', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' AND session_end > NOW() THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as terminated,
                SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
                AVG(duration_minutes) as avg_duration,
                SUM(duration_minutes) as total_minutes
            FROM sessions
        `;
        
        const [stats] = await db.query(query);
        
        // Get active sessions ending soon (within 1 hour)
        const [endingSoon] = await db.query(`
            SELECT COUNT(*) as count 
            FROM sessions 
            WHERE status = 'active' 
            AND session_end BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 HOUR)
        `);
        
        res.json({
            success: true,
            total: stats[0].total || 0,
            active: stats[0].active || 0,
            completed: stats[0].completed || 0,
            terminated: stats[0].terminated || 0,
            expired: stats[0].expired || 0,
            avgDuration: parseFloat(stats[0].avg_duration) || 0,
            totalMinutes: parseInt(stats[0].total_minutes) || 0,
            endingSoon: endingSoon[0].count || 0
        });
    } catch (error) {
        console.error('Error fetching session stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch statistics',
            error: error.message 
        });
    }
});

// GET single session details
router.get('/:id', async (req, res) => {
    try {
        const [sessions] = await db.query(`
            SELECT 
                s.*,
                d.mac_address,
                d.status as device_status,
                d.last_seen,
                p.amount,
                p.transaction_id,
                p.mpesa_receipt_number,
                p.status as payment_status
            FROM sessions s
            LEFT JOIN devices d ON s.device_id = d.id
            LEFT JOIN payments p ON s.payment_id = p.id
            WHERE s.id = ?
        `, [req.params.id]);
        
        if (sessions.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Session not found' 
            });
        }
        
        res.json({ 
            success: true, 
            session: sessions[0]
        });
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch session details',
            error: error.message 
        });
    }
});

// PUT terminate session
router.put('/:id/terminate', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const [sessions] = await db.query('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
        
        if (sessions.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Session not found' 
            });
        }
        
        const session = sessions[0];
        
        if (session.status !== 'active') {
            return res.status(400).json({ 
                success: false, 
                message: 'Can only terminate active sessions' 
            });
        }
        
        // Terminate session
        await db.query(
            'UPDATE sessions SET status = ?, session_end = NOW() WHERE id = ?',
            ['terminated', req.params.id]
        );
        
        // Update device status
        await db.query(
            'UPDATE devices SET status = ? WHERE id = ?',
            ['inactive', session.device_id]
        );
        
        // Log audit
        await db.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address) 
             VALUES (?, 'terminate_session', 'session', ?, ?, ?)`,
            [req.user.id, req.params.id, `Terminated session for ${session.phone}`, req.ip]
        );
        
        res.json({ 
            success: true, 
            message: 'Session terminated successfully' 
        });
    } catch (error) {
        console.error('Error terminating session:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to terminate session',
            error: error.message 
        });
    }
});

// PUT extend session
router.put('/:id/extend', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const { additional_minutes } = req.body;
        
        if (!additional_minutes || additional_minutes < 1) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid additional minutes' 
            });
        }
        
        const [sessions] = await db.query('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
        
        if (sessions.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Session not found' 
            });
        }
        
        const session = sessions[0];
        
        if (session.status !== 'active') {
            return res.status(400).json({ 
                success: false, 
                message: 'Can only extend active sessions' 
            });
        }
        
        // Extend session
        await db.query(
            `UPDATE sessions 
             SET session_end = DATE_ADD(session_end, INTERVAL ? MINUTE),
                 duration_minutes = duration_minutes + ?
             WHERE id = ?`,
            [additional_minutes, additional_minutes, req.params.id]
        );
        
        // Log audit
        await db.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address) 
             VALUES (?, 'extend_session', 'session', ?, ?, ?)`,
            [req.user.id, req.params.id, `Extended session by ${additional_minutes} minutes for ${session.phone}`, req.ip]
        );
        
        res.json({ 
            success: true, 
            message: `Session extended by ${additional_minutes} minutes` 
        });
    } catch (error) {
        console.error('Error extending session:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to extend session',
            error: error.message 
        });
    }
});

// GET export sessions to CSV
router.get('/export/csv', async (req, res) => {
    try {
        const { status } = req.query;
        
        let query = `
            SELECT 
                s.*,
                d.mac_address,
                p.amount,
                p.transaction_id
            FROM sessions s
            LEFT JOIN devices d ON s.device_id = d.id
            LEFT JOIN payments p ON s.payment_id = p.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status && status !== 'all') {
            query += ' AND s.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY s.session_start DESC';
        
        const [sessions] = await db.query(query, params);
        
        // Generate CSV
        const headers = ['Session ID', 'Phone', 'MAC Address', 'Amount', 'Duration (min)', 'Speed', 'Status', 'Start', 'End'];
        const csvRows = [headers.join(',')];
        
        sessions.forEach(session => {
            const row = [
                session.id,
                session.phone || 'N/A',
                session.mac_address || 'N/A',
                session.amount || 0,
                session.duration_minutes,
                session.speed_limit,
                session.status,
                session.session_start,
                session.session_end || 'N/A'
            ];
            csvRows.push(row.join(','));
        });
        
        const csv = csvRows.join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=sessions_${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Error exporting sessions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to export sessions',
            error: error.message 
        });
    }
});

// GET session timeline (for analytics)
router.get('/analytics/timeline', async (req, res) => {
    try {
        const { period = '7d' } = req.query;
        
        let interval;
        switch (period) {
            case '24h':
                interval = 'INTERVAL 24 HOUR';
                break;
            case '7d':
                interval = 'INTERVAL 7 DAY';
                break;
            case '30d':
                interval = 'INTERVAL 30 DAY';
                break;
            default:
                interval = 'INTERVAL 7 DAY';
        }
        
        const [timeline] = await db.query(`
            SELECT 
                DATE(session_start) as date,
                COUNT(*) as total_sessions,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(duration_minutes) as total_minutes
            FROM sessions
            WHERE session_start >= DATE_SUB(NOW(), ${interval})
            GROUP BY DATE(session_start)
            ORDER BY date ASC
        `);
        
        res.json({
            success: true,
            timeline
        });
    } catch (error) {
        console.error('Error fetching session timeline:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch timeline',
            error: error.message 
        });
    }
});

module.exports = router;
