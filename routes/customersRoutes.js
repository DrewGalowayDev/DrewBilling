const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/advancedAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET all customers with filters and sorting
router.get('/', async (req, res) => {
    try {
        const { status, sortBy, search, limit = 100, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                p.phone,
                COUNT(DISTINCT d.id) as device_count,
                SUM(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END) as total_spent,
                COUNT(p.id) as purchase_count,
                MAX(p.created_at) as last_purchase,
                MIN(p.created_at) as first_purchase,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM sessions s 
                        WHERE s.phone = p.phone 
                        AND s.status = 'active' 
                        AND s.session_end > NOW()
                    ) THEN 'active'
                    WHEN EXISTS (
                        SELECT 1 FROM devices d2 
                        WHERE d2.phone = p.phone 
                        AND d2.status = 'blocked'
                    ) THEN 'blocked'
                    ELSE 'inactive'
                END as status
            FROM payments p
            LEFT JOIN devices d ON p.phone = d.phone
            WHERE 1=1
        `;
        
        const params = [];
        
        // Search filter
        if (search) {
            query += ' AND p.phone LIKE ?';
            params.push(`%${search}%`);
        }
        
        query += ' GROUP BY p.phone';
        
        // Status filter (applied after grouping)
        let havingClause = '';
        if (status && status !== 'all') {
            if (status === 'active') {
                havingClause = ` HAVING status = 'active'`;
            } else if (status === 'blocked') {
                havingClause = ` HAVING status = 'blocked'`;
            } else if (status === 'inactive') {
                havingClause = ` HAVING status = 'inactive'`;
            }
        }
        query += havingClause;
        
        // Sorting
        switch (sortBy) {
            case 'spending':
                query += ' ORDER BY total_spent DESC';
                break;
            case 'purchases':
                query += ' ORDER BY purchase_count DESC';
                break;
            case 'name':
                query += ' ORDER BY p.phone ASC';
                break;
            case 'recent':
            default:
                query += ' ORDER BY last_purchase DESC';
                break;
        }
        
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [customers] = await db.query(query, params);
        
        res.json({ 
            success: true, 
            customers,
            count: customers.length
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch customers',
            error: error.message 
        });
    }
});

// GET customer statistics
router.get('/stats', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(DISTINCT p.phone) as total,
                COUNT(DISTINCT CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM sessions s 
                        WHERE s.phone = p.phone 
                        AND s.status = 'active' 
                        AND s.session_end > NOW()
                    ) THEN p.phone 
                END) as active,
                COUNT(DISTINCT CASE 
                    WHEN NOT EXISTS (
                        SELECT 1 FROM sessions s 
                        WHERE s.phone = p.phone 
                        AND s.status = 'active' 
                        AND s.session_end > NOW()
                    ) AND NOT EXISTS (
                        SELECT 1 FROM devices d 
                        WHERE d.phone = p.phone 
                        AND d.status = 'blocked'
                    ) THEN p.phone 
                END) as inactive,
                SUM(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END) as totalRevenue,
                AVG(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE NULL END) as averageSpend
            FROM payments p
        `;
        
        const [stats] = await db.query(query);
        
        res.json({
            success: true,
            total: stats[0].total || 0,
            active: stats[0].active || 0,
            inactive: stats[0].inactive || 0,
            totalRevenue: parseFloat(stats[0].totalRevenue) || 0,
            averageSpend: parseFloat(stats[0].averageSpend) || 0
        });
    } catch (error) {
        console.error('Error fetching customer stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch statistics',
            error: error.message 
        });
    }
});

// GET single customer details with devices, payments, and sessions
router.get('/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        
        // Get customer summary
        const customerQuery = `
            SELECT 
                p.phone,
                COUNT(DISTINCT d.id) as device_count,
                SUM(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END) as total_spent,
                COUNT(p.id) as purchase_count,
                MAX(p.created_at) as last_purchase,
                MIN(p.created_at) as first_purchase,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM sessions s 
                        WHERE s.phone = ? 
                        AND s.status = 'active' 
                        AND s.session_end > NOW()
                    ) THEN 'active'
                    WHEN EXISTS (
                        SELECT 1 FROM devices d2 
                        WHERE d2.phone = ? 
                        AND d2.status = 'blocked'
                    ) THEN 'blocked'
                    ELSE 'inactive'
                END as status
            FROM payments p
            LEFT JOIN devices d ON p.phone = d.phone
            WHERE p.phone = ?
            GROUP BY p.phone
        `;
        
        const [customers] = await db.query(customerQuery, [phone, phone, phone]);
        
        if (customers.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer not found' 
            });
        }
        
        const customer = customers[0];
        
        // Get devices
        const [devices] = await db.query(
            'SELECT mac_address, status, last_seen FROM devices WHERE phone = ? ORDER BY last_seen DESC',
            [phone]
        );
        
        // Get recent payments
        const [payments] = await db.query(
            'SELECT id, transaction_id, amount, time_purchased, status, created_at FROM payments WHERE phone = ? ORDER BY created_at DESC LIMIT 10',
            [phone]
        );
        
        // Get active sessions
        const [sessions] = await db.query(
            `SELECT duration_minutes, speed_limit, status, session_start, session_end 
             FROM sessions 
             WHERE phone = ? AND status = 'active' AND session_end > NOW()
             ORDER BY session_start DESC`,
            [phone]
        );
        
        customer.devices = devices;
        customer.payments = payments;
        customer.sessions = sessions;
        
        res.json({ 
            success: true, 
            customer 
        });
    } catch (error) {
        console.error('Error fetching customer details:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch customer details',
            error: error.message 
        });
    }
});

// PUT block customer (blocks all devices associated with phone)
router.put('/:phone/block', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const { phone } = req.params;
        
        // Block all devices for this customer
        await db.query(
            'UPDATE devices SET status = ?, blocked_at = NOW() WHERE phone = ?',
            ['blocked', phone]
        );
        
        // End all active sessions
        await db.query(
            'UPDATE sessions SET status = ?, session_end = NOW() WHERE phone = ? AND status = ?',
            ['terminated', phone, 'active']
        );
        
        // Log audit
        await db.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address) 
             VALUES (?, 'block_customer', 'customer', ?, ?, ?)`,
            [req.user.id, phone, `Blocked customer ${phone} and terminated active sessions`, req.ip]
        );
        
        res.json({ 
            success: true, 
            message: 'Customer blocked successfully' 
        });
    } catch (error) {
        console.error('Error blocking customer:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to block customer',
            error: error.message 
        });
    }
});

// PUT unblock customer (unblocks all devices associated with phone)
router.put('/:phone/unblock', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const { phone } = req.params;
        
        // Unblock all devices for this customer
        await db.query(
            'UPDATE devices SET status = ?, blocked_at = NULL WHERE phone = ? AND status = ?',
            ['inactive', phone, 'blocked']
        );
        
        // Log audit
        await db.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address) 
             VALUES (?, 'unblock_customer', 'customer', ?, ?, ?)`,
            [req.user.id, phone, `Unblocked customer ${phone}`, req.ip]
        );
        
        res.json({ 
            success: true, 
            message: 'Customer unblocked successfully' 
        });
    } catch (error) {
        console.error('Error unblocking customer:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to unblock customer',
            error: error.message 
        });
    }
});

// GET export customers to CSV
router.get('/export/csv', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.phone,
                COUNT(DISTINCT d.id) as device_count,
                SUM(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END) as total_spent,
                COUNT(p.id) as purchase_count,
                MAX(p.created_at) as last_purchase,
                MIN(p.created_at) as first_purchase,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM sessions s 
                        WHERE s.phone = p.phone 
                        AND s.status = 'active' 
                        AND s.session_end > NOW()
                    ) THEN 'active'
                    WHEN EXISTS (
                        SELECT 1 FROM devices d2 
                        WHERE d2.phone = p.phone 
                        AND d2.status = 'blocked'
                    ) THEN 'blocked'
                    ELSE 'inactive'
                END as status
            FROM payments p
            LEFT JOIN devices d ON p.phone = d.phone
            GROUP BY p.phone
            ORDER BY last_purchase DESC
        `;
        
        const [customers] = await db.query(query);
        
        // Generate CSV
        const headers = ['Phone Number', 'Devices', 'Total Spent', 'Purchases', 'First Purchase', 'Last Purchase', 'Status'];
        const csvRows = [headers.join(',')];
        
        customers.forEach(customer => {
            const row = [
                customer.phone,
                customer.device_count || 0,
                parseFloat(customer.total_spent || 0).toFixed(2),
                customer.purchase_count || 0,
                customer.first_purchase || 'N/A',
                customer.last_purchase || 'N/A',
                customer.status
            ];
            csvRows.push(row.join(','));
        });
        
        const csv = csvRows.join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=customers_${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Error exporting customers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to export customers',
            error: error.message 
        });
    }
});

module.exports = router;
