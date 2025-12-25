const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/advancedAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET audit logs with filtering
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            admin_id,
            action,
            entity_type,
            entity_id,
            startDate,
            endDate,
            search,
            sortBy = 'recent'
        } = req.query;

        const offset = (page - 1) * limit;
        let whereConditions = [];
        let queryParams = [];

        // Filter by admin
        if (admin_id) {
            whereConditions.push('al.admin_id = ?');
            queryParams.push(admin_id);
        }

        // Filter by action
        if (action) {
            whereConditions.push('al.action = ?');
            queryParams.push(action);
        }

        // Filter by entity type
        if (entity_type) {
            whereConditions.push('al.entity_type = ?');
            queryParams.push(entity_type);
        }

        // Filter by entity ID
        if (entity_id) {
            whereConditions.push('al.entity_id = ?');
            queryParams.push(entity_id);
        }

        // Filter by date range
        if (startDate) {
            whereConditions.push('al.created_at >= ?');
            queryParams.push(startDate);
        }
        if (endDate) {
            whereConditions.push('al.created_at <= ?');
            queryParams.push(endDate);
        }

        // Search across action, entity_type, and details
        if (search) {
            whereConditions.push('(al.action LIKE ? OR al.entity_type LIKE ? OR al.details LIKE ? OR a.username LIKE ?)');
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';

        // Determine sort order
        let orderBy;
        switch (sortBy) {
            case 'recent':
                orderBy = 'al.created_at DESC';
                break;
            case 'oldest':
                orderBy = 'al.created_at ASC';
                break;
            case 'admin':
                orderBy = 'a.username ASC';
                break;
            case 'action':
                orderBy = 'al.action ASC';
                break;
            default:
                orderBy = 'al.created_at DESC';
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM audit_logs al
            LEFT JOIN admins a ON al.admin_id = a.id
            ${whereClause}
        `;
        const [countResult] = await db.query(countQuery, queryParams);
        const total = countResult[0].total;

        // Get logs
        const logsQuery = `
            SELECT 
                al.*,
                a.username,
                a.email,
                a.role
            FROM audit_logs al
            LEFT JOIN admins a ON al.admin_id = a.id
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        const [logs] = await db.query(logsQuery, [...queryParams, parseInt(limit), offset]);

        res.json({
            success: true,
            logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch audit logs',
            error: error.message 
        });
    }
});

// GET audit log statistics
router.get('/stats', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        let dateFilter;
        switch (period) {
            case '24h':
                dateFilter = 'DATE_SUB(NOW(), INTERVAL 24 HOUR)';
                break;
            case '7d':
                dateFilter = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
                break;
            case '30d':
                dateFilter = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
                break;
            case '90d':
                dateFilter = 'DATE_SUB(NOW(), INTERVAL 90 DAY)';
                break;
            default:
                dateFilter = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
        }

        // Total logs count
        const [totalLogs] = await db.query(`
            SELECT COUNT(*) as total
            FROM audit_logs
            WHERE created_at >= ${dateFilter}
        `);

        // Actions breakdown
        const [actionStats] = await db.query(`
            SELECT 
                action,
                COUNT(*) as count
            FROM audit_logs
            WHERE created_at >= ${dateFilter}
            GROUP BY action
            ORDER BY count DESC
        `);

        // Entity types breakdown
        const [entityStats] = await db.query(`
            SELECT 
                entity_type,
                COUNT(*) as count
            FROM audit_logs
            WHERE created_at >= ${dateFilter}
            GROUP BY entity_type
            ORDER BY count DESC
        `);

        // Admin activity
        const [adminStats] = await db.query(`
            SELECT 
                a.username,
                a.role,
                COUNT(al.id) as action_count
            FROM admins a
            LEFT JOIN audit_logs al ON a.id = al.admin_id AND al.created_at >= ${dateFilter}
            GROUP BY a.id, a.username, a.role
            ORDER BY action_count DESC
            LIMIT 10
        `);

        // Recent critical actions
        const [criticalActions] = await db.query(`
            SELECT 
                al.*,
                a.username,
                a.role
            FROM audit_logs al
            LEFT JOIN admins a ON al.admin_id = a.id
            WHERE al.action IN ('delete', 'block', 'terminate', 'refund')
            AND al.created_at >= ${dateFilter}
            ORDER BY al.created_at DESC
            LIMIT 10
        `);

        // Activity timeline
        const [timeline] = await db.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM audit_logs
            WHERE created_at >= ${dateFilter}
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        res.json({
            success: true,
            totalLogs: totalLogs[0].total,
            actionStats,
            entityStats,
            adminStats,
            criticalActions,
            timeline
        });
    } catch (error) {
        console.error('Error fetching audit log stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch audit log statistics',
            error: error.message 
        });
    }
});

// GET single audit log details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [logs] = await db.query(`
            SELECT 
                al.*,
                a.username,
                a.email,
                a.role
            FROM audit_logs al
            LEFT JOIN admins a ON al.admin_id = a.id
            WHERE al.id = ?
        `, [id]);

        if (logs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Audit log not found'
            });
        }

        res.json({
            success: true,
            log: logs[0]
        });
    } catch (error) {
        console.error('Error fetching audit log:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch audit log',
            error: error.message 
        });
    }
});

// GET logs for specific entity
router.get('/entity/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;

        const [logs] = await db.query(`
            SELECT 
                al.*,
                a.username,
                a.email,
                a.role
            FROM audit_logs al
            LEFT JOIN admins a ON al.admin_id = a.id
            WHERE al.entity_type = ? AND al.entity_id = ?
            ORDER BY al.created_at DESC
        `, [type, id]);

        res.json({
            success: true,
            logs
        });
    } catch (error) {
        console.error('Error fetching entity logs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch entity logs',
            error: error.message 
        });
    }
});

// GET logs for specific admin
router.get('/admin/:adminId', async (req, res) => {
    try {
        const { adminId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        // Get admin info
        const [admins] = await db.query(`
            SELECT id, username, email, role
            FROM admins
            WHERE id = ?
        `, [adminId]);

        if (admins.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Get total count
        const [countResult] = await db.query(`
            SELECT COUNT(*) as total
            FROM audit_logs
            WHERE admin_id = ?
        `, [adminId]);

        // Get logs
        const [logs] = await db.query(`
            SELECT *
            FROM audit_logs
            WHERE admin_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [adminId, parseInt(limit), offset]);

        res.json({
            success: true,
            admin: admins[0],
            logs,
            pagination: {
                total: countResult[0].total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching admin logs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch admin logs',
            error: error.message 
        });
    }
});

// Export audit logs to CSV
router.get('/export/csv', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const { startDate, endDate, admin_id, action, entity_type } = req.query;

        let whereConditions = [];
        let queryParams = [];

        if (admin_id) {
            whereConditions.push('al.admin_id = ?');
            queryParams.push(admin_id);
        }
        if (action) {
            whereConditions.push('al.action = ?');
            queryParams.push(action);
        }
        if (entity_type) {
            whereConditions.push('al.entity_type = ?');
            queryParams.push(entity_type);
        }
        if (startDate) {
            whereConditions.push('al.created_at >= ?');
            queryParams.push(startDate);
        }
        if (endDate) {
            whereConditions.push('al.created_at <= ?');
            queryParams.push(endDate);
        }

        const whereClause = whereConditions.length > 0 
            ? `WHERE ${whereConditions.join(' AND ')}` 
            : '';

        const [logs] = await db.query(`
            SELECT 
                al.id,
                al.admin_id,
                a.username,
                a.role as admin_role,
                al.action,
                al.entity_type,
                al.entity_id,
                al.details,
                al.ip_address,
                al.created_at
            FROM audit_logs al
            LEFT JOIN admins a ON al.admin_id = a.id
            ${whereClause}
            ORDER BY al.created_at DESC
        `, queryParams);

        // Create CSV content
        const headers = ['ID', 'Admin ID', 'Username', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address', 'Timestamp'];
        const csvRows = [headers.join(',')];

        logs.forEach(log => {
            const row = [
                log.id,
                log.admin_id,
                log.username || 'N/A',
                log.admin_role || 'N/A',
                log.action,
                log.entity_type,
                log.entity_id || 'N/A',
                `"${(log.details || '').replace(/"/g, '""')}"`,
                log.ip_address || 'N/A',
                log.created_at
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${Date.now()}.csv"`);
        res.send(csvContent);

    } catch (error) {
        console.error('Error exporting audit logs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to export audit logs',
            error: error.message 
        });
    }
});

// DELETE old audit logs (super_admin only)
router.delete('/cleanup', roleMiddleware(['super_admin']), async (req, res) => {
    try {
        const { days = 90 } = req.query;

        const [result] = await db.query(`
            DELETE FROM audit_logs
            WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        `, [parseInt(days)]);

        // Log the cleanup action
        await db.query(`
            INSERT INTO audit_logs (admin_id, action, entity_type, details, ip_address)
            VALUES (?, 'cleanup', 'audit_logs', ?, ?)
        `, [
            req.admin.id,
            `Deleted audit logs older than ${days} days. ${result.affectedRows} records removed.`,
            req.ip || req.connection.remoteAddress
        ]);

        res.json({
            success: true,
            message: `Deleted ${result.affectedRows} audit log entries older than ${days} days`
        });
    } catch (error) {
        console.error('Error cleaning up audit logs:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to cleanup audit logs',
            error: error.message 
        });
    }
});

module.exports = router;
