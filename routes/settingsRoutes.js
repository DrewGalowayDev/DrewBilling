/**
 * System Settings Routes
 * Manages system configuration, MPesa settings, MikroTik router settings
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/advancedAuth');

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET all system settings
 */
router.get('/', async (req, res) => {
    try {
        const { data: settings, error } = await supabase
            .from('system_settings')
            .select('*');
        
        if (error) throw error;
        
        // Convert array to object for easier access
        const settingsObject = {};
        (settings || []).forEach(s => {
            settingsObject[s.key] = s.value;
        });
        
        res.json({ success: true, settings: settingsObject });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * GET settings by category
 */
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        
        const { data: settings, error } = await supabase
            .from('system_settings')
            .select('*')
            .eq('category', category);
        
        if (error) throw error;
        
        const settingsObject = {};
        (settings || []).forEach(s => {
            settingsObject[s.key] = s.value;
        });
        
        res.json({ success: true, settings: settingsObject });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * PUT update settings (bulk update)
 */
router.put('/', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const { settings, category } = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Invalid settings data' });
        }
        
        const updates = [];
        
        for (const [key, value] of Object.entries(settings)) {
            // Upsert each setting
            const { error } = await supabase
                .from('system_settings')
                .upsert({
                    key,
                    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                    category: category || 'general',
                    updated_at: new Date().toISOString(),
                    updated_by: req.admin.id
                }, { onConflict: 'key' });
            
            if (error) throw error;
            updates.push(key);
        }
        
        // Log audit
        await supabase.from('audit_logs').insert({
            admin_id: req.admin.id,
            action: 'update_settings',
            entity_type: 'settings',
            details: JSON.stringify({ category, keys: updates }),
            ip_address: req.ip
        });
        
        res.json({ success: true, message: 'Settings updated successfully', updated: updates });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

/**
 * GET MPesa settings
 */
router.get('/mpesa', async (req, res) => {
    try {
        const { data: settings, error } = await supabase
            .from('system_settings')
            .select('*')
            .eq('category', 'mpesa');
        
        if (error) throw error;
        
        const mpesaSettings = {};
        (settings || []).forEach(s => {
            // Mask sensitive values
            if (['consumer_secret', 'passkey'].includes(s.key)) {
                mpesaSettings[s.key] = s.value ? '********' : '';
            } else {
                mpesaSettings[s.key] = s.value;
            }
        });
        
        res.json({ success: true, settings: mpesaSettings });
    } catch (error) {
        console.error('Error fetching MPesa settings:', error);
        res.status(500).json({ error: 'Failed to fetch MPesa settings' });
    }
});

/**
 * PUT update MPesa settings
 */
router.put('/mpesa', roleMiddleware(['super_admin']), async (req, res) => {
    try {
        const { consumer_key, consumer_secret, shortcode, passkey, callback_url, environment } = req.body;
        
        const settingsToUpdate = {
            consumer_key,
            shortcode,
            callback_url,
            environment
        };
        
        // Only update secrets if provided (not masked value)
        if (consumer_secret && consumer_secret !== '********') {
            settingsToUpdate.consumer_secret = consumer_secret;
        }
        if (passkey && passkey !== '********') {
            settingsToUpdate.passkey = passkey;
        }
        
        for (const [key, value] of Object.entries(settingsToUpdate)) {
            if (value !== undefined) {
                await supabase
                    .from('system_settings')
                    .upsert({
                        key,
                        value: String(value),
                        category: 'mpesa',
                        updated_at: new Date().toISOString(),
                        updated_by: req.admin.id
                    }, { onConflict: 'key' });
            }
        }
        
        // Log audit
        await supabase.from('audit_logs').insert({
            admin_id: req.admin.id,
            action: 'update_mpesa_settings',
            entity_type: 'settings',
            details: 'MPesa settings updated',
            ip_address: req.ip
        });
        
        res.json({ success: true, message: 'MPesa settings updated successfully' });
    } catch (error) {
        console.error('Error updating MPesa settings:', error);
        res.status(500).json({ error: 'Failed to update MPesa settings' });
    }
});

/**
 * GET MikroTik router settings
 */
router.get('/mikrotik', async (req, res) => {
    try {
        const { data: settings, error } = await supabase
            .from('system_settings')
            .select('*')
            .eq('category', 'mikrotik');
        
        if (error) throw error;
        
        const mikrotikSettings = {};
        (settings || []).forEach(s => {
            // Mask password
            if (s.key === 'router_password') {
                mikrotikSettings[s.key] = s.value ? '********' : '';
            } else {
                mikrotikSettings[s.key] = s.value;
            }
        });
        
        res.json({ success: true, settings: mikrotikSettings });
    } catch (error) {
        console.error('Error fetching MikroTik settings:', error);
        res.status(500).json({ error: 'Failed to fetch MikroTik settings' });
    }
});

/**
 * PUT update MikroTik settings
 */
router.put('/mikrotik', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const { host, port, username, password, use_ssl } = req.body;
        
        const settingsToUpdate = {
            router_host: host,
            router_port: port,
            router_username: username,
            router_use_ssl: use_ssl ? 'true' : 'false'
        };
        
        // Only update password if provided
        if (password && password !== '********') {
            settingsToUpdate.router_password = password;
        }
        
        for (const [key, value] of Object.entries(settingsToUpdate)) {
            if (value !== undefined) {
                await supabase
                    .from('system_settings')
                    .upsert({
                        key,
                        value: String(value),
                        category: 'mikrotik',
                        updated_at: new Date().toISOString(),
                        updated_by: req.admin.id
                    }, { onConflict: 'key' });
            }
        }
        
        // Log audit
        await supabase.from('audit_logs').insert({
            admin_id: req.admin.id,
            action: 'update_mikrotik_settings',
            entity_type: 'settings',
            details: 'MikroTik router settings updated',
            ip_address: req.ip
        });
        
        res.json({ success: true, message: 'MikroTik settings updated successfully' });
    } catch (error) {
        console.error('Error updating MikroTik settings:', error);
        res.status(500).json({ error: 'Failed to update MikroTik settings' });
    }
});

/**
 * POST test MikroTik connection
 */
router.post('/mikrotik/test', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const routerService = require('../services/routerService');
        const result = await routerService.testConnection();
        
        res.json({ 
            success: result.connected, 
            message: result.message,
            details: result.details 
        });
    } catch (error) {
        console.error('Error testing MikroTik connection:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Connection test failed',
            message: error.message 
        });
    }
});

/**
 * GET system info (for dashboard)
 */
router.get('/system-info', async (req, res) => {
    try {
        const info = {
            serverTime: new Date().toISOString(),
            timezone: process.env.TZ || 'Africa/Nairobi',
            nodeVersion: process.version,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development'
        };
        
        res.json({ success: true, info });
    } catch (error) {
        console.error('Error fetching system info:', error);
        res.status(500).json({ error: 'Failed to fetch system info' });
    }
});

/**
 * PUT update notification settings
 */
router.put('/notifications', roleMiddleware(['admin', 'super_admin']), async (req, res) => {
    try {
        const { enable_email, enable_sms, email_recipients, sms_recipients } = req.body;
        
        const settings = {
            notification_email_enabled: enable_email ? 'true' : 'false',
            notification_sms_enabled: enable_sms ? 'true' : 'false',
            notification_email_recipients: email_recipients || '',
            notification_sms_recipients: sms_recipients || ''
        };
        
        for (const [key, value] of Object.entries(settings)) {
            await supabase
                .from('system_settings')
                .upsert({
                    key,
                    value: String(value),
                    category: 'notifications',
                    updated_at: new Date().toISOString(),
                    updated_by: req.admin.id
                }, { onConflict: 'key' });
        }
        
        res.json({ success: true, message: 'Notification settings updated' });
    } catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({ error: 'Failed to update notification settings' });
    }
});

module.exports = router;
