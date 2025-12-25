const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/advancedAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET all packages
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        
        let query = 'SELECT * FROM packages WHERE 1=1';
        const params = [];
        
        if (status && status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY amount ASC';
        
        const [packages] = await db.query(query, params);
        
        res.json({ 
            success: true, 
            packages 
        });
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch packages',
            error: error.message 
        });
    }
});

// GET package statistics
router.get('/stats', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
                (SELECT COUNT(*) FROM payments WHERE status = 'confirmed' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as purchases_this_month,
                (SELECT SUM(amount) FROM payments WHERE status = 'confirmed' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as revenue_this_month
            FROM packages
        `;
        
        const [stats] = await db.query(query);
        
        res.json({
            success: true,
            total: stats[0].total || 0,
            active: stats[0].active || 0,
            inactive: stats[0].inactive || 0,
            purchasesThisMonth: stats[0].purchases_this_month || 0,
            revenueThisMonth: parseFloat(stats[0].revenue_this_month) || 0
        });
    } catch (error) {
        console.error('Error fetching package stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch statistics',
            error: error.message 
        });
    }
});

// GET single package details
router.get('/:id', async (req, res) => {
    try {
        const [packages] = await db.query('SELECT * FROM packages WHERE id = ?', [req.params.id]);
        
        if (packages.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Package not found' 
            });
        }
        
        // Get purchase statistics for this package
        const [stats] = await db.query(
            `SELECT 
                COUNT(*) as total_purchases,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_purchases,
                SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as total_revenue
            FROM payments 
            WHERE amount = ?`,
            [packages[0].amount]
        );
        
        const packageData = {
            ...packages[0],
            total_purchases: stats[0].total_purchases || 0,
            confirmed_purchases: stats[0].confirmed_purchases || 0,
            total_revenue: parseFloat(stats[0].total_revenue) || 0
        };
        
        res.json({ 
            success: true, 
            package: packageData 
        });
    } catch (error) {
        console.error('Error fetching package:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch package details',
            error: error.message 
        });
    }
});

// POST create new package
router.post('/', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const { name, amount, duration, duration_minutes, speed_limit, description, status } = req.body;
        
        // Validation
        if (!name || !amount || !duration || !duration_minutes || !speed_limit) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        // Check if package with same amount already exists
        const [existing] = await db.query('SELECT id FROM packages WHERE amount = ?', [amount]);
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Package with this amount already exists' 
            });
        }
        
        const [result] = await db.query(
            `INSERT INTO packages (name, amount, duration, duration_minutes, speed_limit, description, status, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [name, amount, duration, duration_minutes, speed_limit, description || null, status || 'active']
        );
        
        // Log audit
        await db.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address) 
             VALUES (?, 'create_package', 'package', ?, ?, ?)`,
            [req.user.id, result.insertId, `Created package: ${name} - Ksh ${amount}`, req.ip]
        );
        
        res.json({ 
            success: true, 
            message: 'Package created successfully',
            packageId: result.insertId
        });
    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create package',
            error: error.message 
        });
    }
});

// PUT update package
router.put('/:id', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const { name, amount, duration, duration_minutes, speed_limit, description, status } = req.body;
        
        // Check if package exists
        const [existing] = await db.query('SELECT * FROM packages WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Package not found' 
            });
        }
        
        await db.query(
            `UPDATE packages 
             SET name = ?, amount = ?, duration = ?, duration_minutes = ?, speed_limit = ?, description = ?, status = ?, updated_at = NOW()
             WHERE id = ?`,
            [name, amount, duration, duration_minutes, speed_limit, description, status, req.params.id]
        );
        
        // Log audit
        await db.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address) 
             VALUES (?, 'update_package', 'package', ?, ?, ?)`,
            [req.user.id, req.params.id, `Updated package: ${name}`, req.ip]
        );
        
        res.json({ 
            success: true, 
            message: 'Package updated successfully' 
        });
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update package',
            error: error.message 
        });
    }
});

// DELETE package
router.delete('/:id', roleMiddleware(['super_admin']), async (req, res) => {
    try {
        // Check if package exists
        const [existing] = await db.query('SELECT * FROM packages WHERE id = ?', [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Package not found' 
            });
        }
        
        await db.query('DELETE FROM packages WHERE id = ?', [req.params.id]);
        
        // Log audit
        await db.query(
            `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address) 
             VALUES (?, 'delete_package', 'package', ?, ?, ?)`,
            [req.user.id, req.params.id, `Deleted package: ${existing[0].name}`, req.ip]
        );
        
        res.json({ 
            success: true, 
            message: 'Package deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting package:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete package',
            error: error.message 
        });
    }
});

// POST initialize default packages
router.post('/initialize', roleMiddleware(['super_admin']), async (req, res) => {
    try {
        const defaultPackages = [
            { name: '30 Minutes', amount: 1, duration: '30m', duration_minutes: 30, speed_limit: '2M', description: 'Quick browsing package' },
            { name: '1 Hour', amount: 10, duration: '1h', duration_minutes: 60, speed_limit: '2M', description: 'Standard hourly package' },
            { name: '3 Hours', amount: 15, duration: '3h', duration_minutes: 180, speed_limit: '3M', description: 'Extended browsing' },
            { name: '6 Hours', amount: 20, duration: '6h', duration_minutes: 360, speed_limit: '4M', description: 'Half day package' },
            { name: '12 Hours', amount: 25, duration: '12h', duration_minutes: 720, speed_limit: '5M', description: 'Half day with higher speed' },
            { name: '24 Hours', amount: 30, duration: '24h', duration_minutes: 1440, speed_limit: '5M', description: 'Full day package' },
            { name: '2 Days', amount: 50, duration: '48h', duration_minutes: 2880, speed_limit: '6M', description: 'Two day package' },
            { name: '3 Days', amount: 80, duration: '72h', duration_minutes: 4320, speed_limit: '6M', description: 'Three day package' },
            { name: '1 Week', amount: 200, duration: '168h', duration_minutes: 10080, speed_limit: '6M', description: 'Weekly package' },
            { name: '2 Weeks', amount: 300, duration: '336h', duration_minutes: 20160, speed_limit: '10M', description: 'Bi-weekly package' },
            { name: '1 Month', amount: 500, duration: '720h', duration_minutes: 43200, speed_limit: '10M', description: 'Monthly unlimited' }
        ];
        
        let inserted = 0;
        for (const pkg of defaultPackages) {
            try {
                await db.query(
                    `INSERT INTO packages (name, amount, duration, duration_minutes, speed_limit, description, status, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
                    [pkg.name, pkg.amount, pkg.duration, pkg.duration_minutes, pkg.speed_limit, pkg.description]
                );
                inserted++;
            } catch (err) {
                // Skip if already exists
                if (err.code !== 'ER_DUP_ENTRY') {
                    console.error('Error inserting package:', err);
                }
            }
        }
        
        res.json({ 
            success: true, 
            message: `Initialized ${inserted} default packages` 
        });
    } catch (error) {
        console.error('Error initializing packages:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to initialize packages',
            error: error.message 
        });
    }
});

module.exports = router;
