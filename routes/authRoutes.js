const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('Login attempt for:', username);

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Get admin from database - check both username and email
        let queryResult;
        
        if (username.includes('@')) {
            queryResult = await supabase
                .from('admins')
                .select('*')
                .eq('email', username.toLowerCase())
                .eq('status', 'active');
        } else {
            queryResult = await supabase
                .from('admins')
                .select('*')
                .eq('username', username)
                .eq('status', 'active');
        }
        
        const { data: admins, error } = queryResult;

        console.log('Query result:', { admins: admins?.length, error });

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!admins || admins.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = admins[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, admin.password);
        console.log('Password valid:', validPassword);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await supabase.from('admins').update({
            last_login: new Date().toISOString()
        }).eq('id', admin.id);

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: admin.id, 
                username: admin.username, 
                role: admin.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION || '8h' }
        );

        // Return user data (without password)
        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                two_factor_enabled: admin.two_factor_enabled
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Refresh token endpoint
router.post('/refresh-token', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Verify old token (even if expired)
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

        // Check if admin still exists and is active using Supabase
        const { data: admins, error } = await supabase
            .from('admins')
            .select('id, username, role')
            .eq('id', decoded.id)
            .eq('status', 'active');

        if (error || !admins || admins.length === 0) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        // Generate new token
        const newToken = jwt.sign(
            { 
                id: admins[0].id, 
                username: admins[0].username, 
                role: admins[0].role 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION || '8h' }
        );

        res.json({ success: true, token: newToken });

    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Logout endpoint (client-side token removal, optionally blacklist token)
router.post('/logout', async (req, res) => {
    try {
        // In a production system, you might want to blacklist the token
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Change password endpoint
router.post('/change-password', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Both passwords are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        // Get current admin from Supabase
        const { data: admins, error: fetchError } = await supabase
            .from('admins')
            .select('*')
            .eq('id', decoded.id);

        if (fetchError || !admins || admins.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, admins[0].password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in Supabase
        const { error: updateError } = await supabase
            .from('admins')
            .update({ password: hashedPassword, updated_at: new Date().toISOString() })
            .eq('id', decoded.id);

        if (updateError) {
            throw updateError;
        }

        res.json({ success: true, message: 'Password changed successfully' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Get current admin profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { data: admins, error } = await supabase
            .from('admins')
            .select('id, username, email, role, last_login, two_factor_enabled, created_at')
            .eq('id', decoded.id);

        if (error || !admins || admins.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        res.json({ success: true, admin: admins[0] });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

module.exports = router;
