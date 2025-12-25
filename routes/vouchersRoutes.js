const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/advancedAuth');
const crypto = require('crypto');

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET all vouchers with filters
router.get('/', async (req, res) => {
    try {
        const { status, search, limit = 100, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM vouchers WHERE 1=1';
        const params = [];
        
        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }
        
        if (search) {
            query += ' AND (voucher_code LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [vouchers] = await db.query(query, params);
        
        res.json({ 
            success: true, 
            vouchers,
            count: vouchers.length
        });
    } catch (error) {
        console.error('Error fetching vouchers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch vouchers',
            error: error.message 
        });
    }
});

// GET voucher statistics
router.get('/stats', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as used,
                SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
                SUM(CASE WHEN status = 'used' THEN amount ELSE 0 END) as total_value_redeemed
            FROM vouchers
        `;
        
        const [stats] = await db.query(query);
        
        res.json({
            success: true,
            total: stats[0].total || 0,
            active: stats[0].active || 0,
            used: stats[0].used || 0,
            expired: stats[0].expired || 0,
            totalValueRedeemed: parseFloat(stats[0].total_value_redeemed) || 0
        });
    } catch (error) {
        console.error('Error fetching voucher stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch statistics',
            error: error.message 
        });
    }
});

// GET single voucher details
router.get('/:id', async (req, res) => {
    try {
        const [vouchers] = await db.query('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
        
        if (vouchers.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Voucher not found' 
            });
        }
        
        res.json({ 
            success: true, 
            voucher: vouchers[0]
        });
    } catch (error) {
        console.error('Error fetching voucher:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch voucher details',
            error: error.message 
        });
    }
});

// POST generate vouchers
router.post('/generate', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const { count, amount, duration_minutes, speed_limit, description, expires_in_days } = req.body;
        
        // Validation
        if (!count || !amount || !duration_minutes) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        if (count > 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'Maximum 100 vouchers can be generated at once' 
            });
        }
        
        const generatedVouchers = [];
        const expiresAt = expires_in_days ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000) : null;
        
        for (let i = 0; i < count; i++) {
            // Generate unique voucher code
            const voucherCode = `WIFI-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
            
            try {
                const [result] = await db.query(
                    `INSERT INTO vouchers (voucher_code, amount, duration_minutes, speed_limit, description, status, expires_at, created_by, created_at) 
                     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, NOW())`,
                    [voucherCode, amount, duration_minutes, speed_limit || '5M', description || null, expiresAt, req.user.id]
                );
                
                generatedVouchers.push({
                    id: result.insertId,
                    voucher_code: voucherCode,
                    amount,
                    duration_minutes,
                    speed_limit: speed_limit || '5M'
                });
            } catch (err) {
                console.error('Error generating voucher:', err);
            }
        }
        
        // Log audit
        await db.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address) 
             VALUES (?, 'generate_vouchers', 'voucher', ?, ?, ?)`,
            [req.user.id, generatedVouchers[0]?.id || 0, `Generated ${generatedVouchers.length} vouchers worth Ksh ${amount} each`, req.ip]
        );
        
        res.json({ 
            success: true, 
            message: `Generated ${generatedVouchers.length} vouchers successfully`,
            vouchers: generatedVouchers
        });
    } catch (error) {
        console.error('Error generating vouchers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate vouchers',
            error: error.message 
        });
    }
});

// POST redeem voucher (public endpoint for users)
router.post('/redeem', async (req, res) => {
    try {
        const { voucher_code, phone, mac_address } = req.body;
        
        if (!voucher_code || !phone || !mac_address) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        // Find voucher
        const [vouchers] = await db.query(
            'SELECT * FROM vouchers WHERE voucher_code = ?',
            [voucher_code.toUpperCase()]
        );
        
        if (vouchers.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Invalid voucher code' 
            });
        }
        
        const voucher = vouchers[0];
        
        // Check if already used
        if (voucher.status === 'used') {
            return res.status(400).json({ 
                success: false, 
                message: 'Voucher has already been used' 
            });
        }
        
        // Check if expired
        if (voucher.status === 'expired' || (voucher.expires_at && new Date(voucher.expires_at) < new Date())) {
            await db.query('UPDATE vouchers SET status = ? WHERE id = ?', ['expired', voucher.id]);
            return res.status(400).json({ 
                success: false, 
                message: 'Voucher has expired' 
            });
        }
        
        // Mark voucher as used
        await db.query(
            `UPDATE vouchers 
             SET status = 'used', used_by_phone = ?, used_by_mac = ?, used_at = NOW()
             WHERE id = ?`,
            [phone, mac_address, voucher.id]
        );
        
        // Create a payment record
        const transactionId = `VOUCHER_${voucher.voucher_code}`;
        await db.query(
            `INSERT INTO payments (phone, amount, transaction_id, mac_address, status, mpesa_receipt_number, time_purchased, confirmed_at, created_at) 
             VALUES (?, ?, ?, ?, 'confirmed', ?, ?, NOW(), NOW())`,
            [phone, voucher.amount, transactionId, mac_address, voucher.voucher_code, `${voucher.duration_minutes} minutes`]
        );
        
        // Get payment ID
        const [payments] = await db.query('SELECT id FROM payments WHERE transaction_id = ?', [transactionId]);
        const paymentId = payments[0]?.id;
        
        // Register or update device
        await db.query(
            `INSERT INTO devices (mac_address, phone, status, last_seen) 
             VALUES (?, ?, 'active', NOW())
             ON DUPLICATE KEY UPDATE 
                 phone = VALUES(phone),
                 status = 'active',
                 last_seen = NOW()`,
            [mac_address, phone]
        );
        
        // Get device_id
        const [devices] = await db.query('SELECT id FROM devices WHERE mac_address = ?', [mac_address]);
        const deviceId = devices[0]?.id;
        
        // Create session
        await db.query(
            `INSERT INTO sessions (
                payment_id, device_id, mac_address, phone, 
                duration_minutes, speed_limit, status, session_start, session_end
            ) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
            [paymentId, deviceId, mac_address, phone, voucher.duration_minutes, voucher.speed_limit, voucher.duration_minutes]
        );
        
        res.json({ 
            success: true, 
            message: 'Voucher redeemed successfully',
            session: {
                duration_minutes: voucher.duration_minutes,
                speed_limit: voucher.speed_limit,
                amount: voucher.amount
            }
        });
    } catch (error) {
        console.error('Error redeeming voucher:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to redeem voucher',
            error: error.message 
        });
    }
});

// PUT deactivate voucher
router.put('/:id/deactivate', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const [vouchers] = await db.query('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
        
        if (vouchers.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Voucher not found' 
            });
        }
        
        if (vouchers[0].status === 'used') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot deactivate used voucher' 
            });
        }
        
        await db.query('UPDATE vouchers SET status = ? WHERE id = ?', ['expired', req.params.id]);
        
        // Log audit
        await db.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address) 
             VALUES (?, 'deactivate_voucher', 'voucher', ?, ?, ?)`,
            [req.user.id, req.params.id, `Deactivated voucher: ${vouchers[0].voucher_code}`, req.ip]
        );
        
        res.json({ 
            success: true, 
            message: 'Voucher deactivated successfully' 
        });
    } catch (error) {
        console.error('Error deactivating voucher:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to deactivate voucher',
            error: error.message 
        });
    }
});

// DELETE voucher
router.delete('/:id', roleMiddleware(['super_admin']), async (req, res) => {
    try {
        const [vouchers] = await db.query('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
        
        if (vouchers.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Voucher not found' 
            });
        }
        
        if (vouchers[0].status === 'used') {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete used voucher' 
            });
        }
        
        await db.query('DELETE FROM vouchers WHERE id = ?', [req.params.id]);
        
        // Log audit
        await db.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address) 
             VALUES (?, 'delete_voucher', 'voucher', ?, ?, ?)`,
            [req.user.id, req.params.id, `Deleted voucher: ${vouchers[0].voucher_code}`, req.ip]
        );
        
        res.json({ 
            success: true, 
            message: 'Voucher deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting voucher:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete voucher',
            error: error.message 
        });
    }
});

// GET export vouchers to CSV
router.get('/export/csv', async (req, res) => {
    try {
        const { status } = req.query;
        
        let query = 'SELECT * FROM vouchers WHERE 1=1';
        const params = [];
        
        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [vouchers] = await db.query(query, params);
        
        // Generate CSV
        const headers = ['Code', 'Amount', 'Duration (min)', 'Speed', 'Status', 'Created', 'Expires', 'Used By', 'Used At'];
        const csvRows = [headers.join(',')];
        
        vouchers.forEach(voucher => {
            const row = [
                voucher.voucher_code,
                voucher.amount,
                voucher.duration_minutes,
                voucher.speed_limit,
                voucher.status,
                voucher.created_at,
                voucher.expires_at || 'Never',
                voucher.used_by_phone || 'N/A',
                voucher.used_at || 'N/A'
            ];
            csvRows.push(row.join(','));
        });
        
        const csv = csvRows.join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=vouchers_${Date.now()}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Error exporting vouchers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to export vouchers',
            error: error.message 
        });
    }
});

module.exports = router;
