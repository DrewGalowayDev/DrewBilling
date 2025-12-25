const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/advancedAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET all devices with statistics
router.get('/', async (req, res) => {
    try {
        const { status, search } = req.query;
        
        let query = `
            SELECT 
                d.*,
                COUNT(DISTINCT s.id) as total_sessions,
                SUM(CAST(p.amount AS DECIMAL(10,2))) as total_spent
            FROM devices d
            LEFT JOIN sessions s ON d.mac_address = s.mac_address
            LEFT JOIN payments p ON d.phone = p.phone AND p.status = 'confirmed'
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            query += ' AND d.status = ?';
            params.push(status);
        }
        
        if (search) {
            query += ' AND (d.mac_address LIKE ? OR d.ip_address LIKE ? OR d.phone LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ' GROUP BY d.id ORDER BY d.last_seen DESC';
        
        const [devices] = await db.query(query, params);
        
        res.json({ success: true, devices });
    } catch (error) {
        console.error('Get devices error:', error);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// GET single device details
router.get('/:id', async (req, res) => {
    try {
        const [devices] = await db.query(
            `SELECT 
                d.*,
                COUNT(DISTINCT s.id) as total_sessions,
                SUM(CAST(p.amount AS DECIMAL(10,2))) as total_spent
            FROM devices d
            LEFT JOIN sessions s ON d.mac_address = s.mac_address
            LEFT JOIN payments p ON d.phone = p.phone AND p.status = 'confirmed'
            WHERE d.id = ?
            GROUP BY d.id`,
            [req.params.id]
        );
        
        if (devices.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }
        
        // Get device sessions
        const [sessions] = await db.query(
            'SELECT * FROM sessions WHERE mac_address = ? ORDER BY session_start DESC LIMIT 10',
            [devices[0].mac_address]
        );
        
        res.json({ 
            success: true, 
            device: devices[0],
            sessions 
        });
    } catch (error) {
        console.error('Get device error:', error);
        res.status(500).json({ error: 'Failed to fetch device details' });
    }
});

// UPDATE device status (approve/block/unblock)
router.put('/:id/status', roleMiddleware(['super_admin', 'admin']), async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['active', 'blocked', 'pending', 'inactive'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const [result] = await db.query(
            'UPDATE devices SET status = ?, last_seen = NOW() WHERE id = ?',
            [status, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }
        
        // Log the action
        await db.query(
            'INSERT INTO audit_logs (admin_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)',
            [req.admin.id, 'UPDATE_DEVICE_STATUS', 'devices', req.params.id, JSON.stringify({ status })]
        );
        
        res.json({ success: true, message: 'Device status updated' });
    } catch (error) {
        console.error('Update device status error:', error);
        res.status(500).json({ error: 'Failed to update device status' });
    }
});

// APPROVE device (bulk)
router.post('/bulk-approve', roleMiddleware(['super_admin', 'admin']), async (req, res) => {
    try {
        const { deviceIds } = req.body;
        
        if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
            return res.status(400).json({ error: 'Device IDs array is required' });
        }
        
        const placeholders = deviceIds.map(() => '?').join(',');
        await db.query(
            `UPDATE devices SET status = 'active', last_seen = NOW() WHERE id IN (${placeholders})`,
            deviceIds
        );
        
        // Log the action
        await db.query(
            'INSERT INTO audit_logs (admin_id, action, table_affected, details) VALUES (?, ?, ?, ?)',
            [req.admin.id, 'BULK_APPROVE_DEVICES', 'devices', JSON.stringify({ deviceIds })]
        );
        
        res.json({ success: true, message: `${deviceIds.length} devices approved` });
    } catch (error) {
        console.error('Bulk approve error:', error);
        res.status(500).json({ error: 'Failed to approve devices' });
    }
});

// DELETE device
router.delete('/:id', roleMiddleware(['super_admin', 'admin']), async (req, res) => {
    try {
        // Get device info before deletion
        const [devices] = await db.query('SELECT * FROM devices WHERE id = ?', [req.params.id]);
        
        if (devices.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }
        
        // Delete device
        await db.query('DELETE FROM devices WHERE id = ?', [req.params.id]);
        
        // Log the action
        await db.query(
            'INSERT INTO audit_logs (admin_id, action, table_affected, record_id, details) VALUES (?, ?, ?, ?, ?)',
            [req.admin.id, 'DELETE_DEVICE', 'devices', req.params.id, JSON.stringify(devices[0])]
        );
        
        res.json({ success: true, message: 'Device deleted successfully' });
    } catch (error) {
        console.error('Delete device error:', error);
        res.status(500).json({ error: 'Failed to delete device' });
    }
});

// GET device statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const [stats] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
                SUM(CASE WHEN last_seen > DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 1 ELSE 0 END) as online_now
            FROM devices
        `);
        
        res.json({ success: true, stats: stats[0] });
    } catch (error) {
        console.error('Get device stats error:', error);
        res.status(500).json({ error: 'Failed to fetch device statistics' });
    }
});

module.exports = router;
