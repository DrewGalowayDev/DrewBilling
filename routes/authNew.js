const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { supabase } = require("../config/db");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    throw new Error("Missing JWT_SECRET in environment variables");
}

// Helper function to log admin activity
const logActivity = async (adminId, tenantId, action, description, status, metadata = {}, req) => {
    try {
        await supabase.from('admin_activity_logs').insert({
            admin_id: adminId,
            tenant_id: tenantId,
            action,
            description,
            status,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            metadata
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
};

// ===============================================
// 1. ADMIN LOGIN
// ===============================================
router.post("/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Get admin by email
        const { data: admins, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !admins) {
            // Log failed attempt (without admin_id since user not found)
            await logActivity(null, null, 'login', `Failed login attempt for ${email}`, 'failed', { reason: 'user_not_found' }, req);
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const admin = admins;

        // Check if account is locked
        if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
            const minutesRemaining = Math.ceil((new Date(admin.locked_until) - new Date()) / 60000);
            await logActivity(admin.id, admin.tenant_id, 'login', 'Login attempt on locked account', 'blocked', { minutes_remaining: minutesRemaining }, req);
            return res.status(403).json({ 
                error: "Account is locked due to too many failed login attempts", 
                locked_until: admin.locked_until,
                minutes_remaining: minutesRemaining
            });
        }

        // Check if account is active
        if (admin.status !== 'active') {
            await logActivity(admin.id, admin.tenant_id, 'login', `Login attempt on ${admin.status} account`, 'blocked', {}, req);
            return res.status(403).json({ error: `Account is ${admin.status}` });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            // Increment login attempts
            const newAttempts = (admin.login_attempts || 0) + 1;
            const updateData = { login_attempts: newAttempts };

            // Lock account after 5 failed attempts
            if (newAttempts >= 5) {
                updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
                await logActivity(admin.id, admin.tenant_id, 'login', 'Account locked due to failed attempts', 'blocked', { attempts: newAttempts }, req);
            } else {
                await logActivity(admin.id, admin.tenant_id, 'login', 'Failed login - invalid password', 'failed', { attempts: newAttempts }, req);
            }

            await supabase.from('admins').update(updateData).eq('id', admin.id);

            return res.status(401).json({ 
                error: "Invalid email or password",
                attempts_remaining: Math.max(0, 5 - newAttempts)
            });
        }

        // Successful login - reset attempts and update last login
        await supabase.from('admins').update({
            login_attempts: 0,
            locked_until: null,
            last_login: new Date().toISOString()
        }).eq('id', admin.id);

        // Log successful login
        await logActivity(admin.id, admin.tenant_id, 'login', 'Successful login', 'success', { role: admin.role }, req);

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: admin.id, 
                email: admin.email,
                role: admin.role,
                tenant_id: admin.tenant_id,
                permissions: admin.permissions
            }, 
            SECRET_KEY, 
            { expiresIn: "24h" }
        );

        // Set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // Return user info (without password)
        const { password: _, ...adminData } = admin;

        res.json({ 
            message: "Login successful", 
            token,
            admin: {
                ...adminData,
                login_attempts: 0,
                locked_until: null
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ===============================================
// 2. FORGOT PASSWORD - REQUEST RESET
// ===============================================
router.post("/admin/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        // Get admin by email
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        // Always return success to prevent email enumeration
        if (error || !admin) {
            return res.json({ 
                message: "If an account exists with this email, a password reset link has been sent" 
            });
        }

        // Check if account is active
        if (admin.status !== 'active') {
            await logActivity(admin.id, admin.tenant_id, 'password_reset_request', `Reset requested on ${admin.status} account`, 'blocked', {}, req);
            return res.json({ 
                message: "If an account exists with this email, a password reset link has been sent" 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Save token to database
        await supabase.from('password_reset_tokens').insert({
            admin_id: admin.id,
            token: hashedToken,
            expires_at: expiresAt.toISOString(),
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent']
        });

        // Update admin table with reset token
        await supabase.from('admins').update({
            reset_token: hashedToken,
            reset_token_expires: expiresAt.toISOString()
        }).eq('id', admin.id);

        // Log activity
        await logActivity(admin.id, admin.tenant_id, 'password_reset_request', 'Password reset requested', 'success', {}, req);

        // In production, send email with reset link
        // For now, return the token (REMOVE THIS IN PRODUCTION!)
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
        
        console.log('🔐 PASSWORD RESET LINK:', resetLink);
        console.log('📧 Email:', email);
        console.log('⏰ Expires:', expiresAt);

        // TODO: Send email here
        // await sendResetEmail(admin.email, resetLink);

        res.json({ 
            message: "If an account exists with this email, a password reset link has been sent",
            // REMOVE THESE IN PRODUCTION:
            debug: {
                reset_link: resetLink,
                expires_in: '1 hour'
            }
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ===============================================
// 3. RESET PASSWORD - VERIFY TOKEN & SET NEW PASSWORD
// ===============================================
router.post("/admin/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: "Token and new password are required" });
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters long" });
        }

        // Hash the token to match database
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Get admin with this token
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('reset_token', hashedToken)
            .single();

        if (error || !admin) {
            return res.status(400).json({ error: "Invalid or expired reset token" });
        }

        // Check if token is expired
        if (!admin.reset_token_expires || new Date(admin.reset_token_expires) < new Date()) {
            await logActivity(admin.id, admin.tenant_id, 'password_reset', 'Failed - token expired', 'failed', {}, req);
            return res.status(400).json({ error: "Reset token has expired. Please request a new one." });
        }

        // Check if token was already used
        const { data: tokenRecord } = await supabase
            .from('password_reset_tokens')
            .select('*')
            .eq('token', hashedToken)
            .single();

        if (tokenRecord && tokenRecord.used) {
            await logActivity(admin.id, admin.tenant_id, 'password_reset', 'Failed - token already used', 'failed', {}, req);
            return res.status(400).json({ error: "Reset token has already been used. Please request a new one." });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear reset token
        await supabase.from('admins').update({
            password: hashedPassword,
            reset_token: null,
            reset_token_expires: null,
            login_attempts: 0,
            locked_until: null
        }).eq('id', admin.id);

        // Mark token as used
        await supabase.from('password_reset_tokens').update({
            used: true,
            used_at: new Date().toISOString()
        }).eq('token', hashedToken);

        // Log activity
        await logActivity(admin.id, admin.tenant_id, 'password_reset', 'Password successfully reset', 'success', {}, req);

        res.json({ message: "Password has been reset successfully. You can now login with your new password." });

    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ===============================================
// 4. CHANGE PASSWORD (Authenticated)
// ===============================================
router.post("/admin/change-password", async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;

        if (!token) {
            return res.status(401).json({ error: "Authentication required" });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current password and new password are required" });
        }

        // Validate new password
        if (newPassword.length < 8) {
            return res.status(400).json({ error: "New password must be at least 8 characters long" });
        }

        // Verify token and get admin
        const decoded = jwt.verify(token, SECRET_KEY);
        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('id', decoded.id)
            .single();

        if (error || !admin) {
            return res.status(401).json({ error: "Invalid authentication" });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            await logActivity(admin.id, admin.tenant_id, 'password_change', 'Failed - incorrect current password', 'failed', {}, req);
            return res.status(400).json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await supabase.from('admins').update({
            password: hashedPassword
        }).eq('id', admin.id);

        // Log activity
        await logActivity(admin.id, admin.tenant_id, 'password_change', 'Password successfully changed', 'success', {}, req);

        res.json({ message: "Password changed successfully" });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid authentication token" });
        }
        console.error("Change Password Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ===============================================
// 5. LOGOUT
// ===============================================
router.post("/admin/logout", async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;
        
        if (token) {
            try {
                const decoded = jwt.verify(token, SECRET_KEY);
                await logActivity(decoded.id, decoded.tenant_id, 'logout', 'User logged out', 'success', {}, req);
            } catch (error) {
                // Token invalid, continue with logout anyway
            }
        }

        res.clearCookie("token");
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ===============================================
// 6. GET CURRENT ADMIN INFO
// ===============================================
router.get("/admin/me", async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;

        if (!token) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        const { data: admin, error } = await supabase
            .from('admins')
            .select(`
                *,
                tenants (
                    id,
                    tenant_code,
                    business_name,
                    logo_url,
                    primary_color,
                    secondary_color,
                    status,
                    subscription_tier
                )
            `)
            .eq('id', decoded.id)
            .single();

        if (error || !admin) {
            return res.status(401).json({ error: "Invalid authentication" });
        }

        const { password: _, reset_token: __, ...adminData } = admin;

        res.json({ admin: adminData });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: "Invalid authentication token" });
        }
        console.error("Get Admin Info Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ===============================================
// 7. DEBUG ROUTE - List all admins (REMOVE IN PRODUCTION)
// ===============================================
router.get("/check-admin", async (req, res) => {
    try {
        const { data: admins, error } = await supabase
            .from('admins')
            .select('id, email, full_name, role, status, tenant_id, last_login');

        if (error) throw error;

        res.json({ 
            count: admins.length,
            admins 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
