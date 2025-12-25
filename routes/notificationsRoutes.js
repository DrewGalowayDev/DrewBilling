/**
 * Notifications Routes
 * Manages system notifications and alerts
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/advancedAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET all notifications for current admin
 */
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0, unread_only } = req.query;
        
        let query = supabase
            .from('notifications')
            .select('*')
            .or(`admin_id.eq.${req.admin.id},admin_id.is.null`)
            .order('created_at', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
        
        if (unread_only === 'true') {
            query = query.eq('is_read', false);
        }
        
        const { data: notifications, error } = await query;
        
        if (error) throw error;
        
        // Get unread count
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .or(`admin_id.eq.${req.admin.id},admin_id.is.null`)
            .eq('is_read', false);
        
        res.json({ 
            success: true, 
            notifications: notifications || [],
            unreadCount: count || 0
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * GET unread count
 */
router.get('/unread-count', async (req, res) => {
    try {
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .or(`admin_id.eq.${req.admin.id},admin_id.is.null`)
            .eq('is_read', false);
        
        res.json({ success: true, count: count || 0 });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

/**
 * PUT mark notification as read
 */
router.put('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', id);
        
        if (error) throw error;
        
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

/**
 * PUT mark all notifications as read
 */
router.put('/mark-all-read', async (req, res) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .or(`admin_id.eq.${req.admin.id},admin_id.is.null`)
            .eq('is_read', false);
        
        if (error) throw error;
        
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
});

/**
 * DELETE notification
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

/**
 * POST create notification (admin only)
 */
router.post('/', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const { title, message, type, priority, admin_id, action_url } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }
        
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                title,
                message,
                type: type || 'info',
                priority: priority || 'normal',
                admin_id: admin_id || null, // null = broadcast to all
                action_url,
                is_read: false,
                created_at: new Date().toISOString()
            })
            .select();
        
        if (error) throw error;
        
        res.json({ success: true, notification: data[0] });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

/**
 * GET system alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        const alerts = [];
        
        // Check for pending devices
        const { count: pendingDevices } = await supabase
            .from('devices')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        if (pendingDevices > 0) {
            alerts.push({
                id: 'pending-devices',
                title: 'Pending Devices',
                message: `${pendingDevices} device(s) waiting for approval`,
                type: 'warning',
                severity: 'medium',
                action: '/admin/devices?status=pending',
                time: new Date().toISOString()
            });
        }
        
        // Check for failed payments today
        const today = new Date().toISOString().split('T')[0];
        const { count: failedPayments } = await supabase
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'failed')
            .gte('created_at', today);
        
        if (failedPayments > 5) {
            alerts.push({
                id: 'failed-payments',
                title: 'Payment Issues',
                message: `${failedPayments} failed payments today - check MPesa connection`,
                type: 'error',
                severity: 'high',
                action: '/admin/payments?status=failed',
                time: new Date().toISOString()
            });
        }
        
        // Check for expiring sessions (within 30 minutes)
        const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const { count: expiringSessions } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
            .lte('session_end', thirtyMinutesFromNow)
            .gte('session_end', new Date().toISOString());
        
        if (expiringSessions > 0) {
            alerts.push({
                id: 'expiring-sessions',
                title: 'Sessions Expiring Soon',
                message: `${expiringSessions} session(s) expiring within 30 minutes`,
                type: 'info',
                severity: 'low',
                action: '/admin/sessions?filter=expiring',
                time: new Date().toISOString()
            });
        }
        
        // Check active sessions count
        const { count: activeSessions } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
            .gte('session_end', new Date().toISOString());
        
        if (activeSessions > 0) {
            alerts.push({
                id: 'active-sessions',
                title: 'Active Sessions',
                message: `${activeSessions} user(s) currently connected`,
                type: 'success',
                severity: 'info',
                action: '/admin/sessions?status=active',
                time: new Date().toISOString()
            });
        }
        
        res.json({ success: true, alerts });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

/**
 * Helper function to create system notification
 */
const createSystemNotification = async (title, message, type = 'info', priority = 'normal', adminId = null) => {
    try {
        await supabase.from('notifications').insert({
            title,
            message,
            type,
            priority,
            admin_id: adminId,
            is_read: false,
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error creating system notification:', error);
    }
};

module.exports = router;
module.exports.createSystemNotification = createSystemNotification;
