const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { supabase } = require("../config/db");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
    throw new Error("Missing JWT_SECRET in environment variables");
}

// ✅ Admin Login Route - Supports both email and username
router.post("/admin/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // ✅ Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // ✅ Check if admin exists by email OR username
        let query = supabase.from('admins').select('*');
        
        // Try to match email first, then username
        if (email.includes('@')) {
            query = query.eq('email', email.toLowerCase());
        } else {
            query = query.eq('username', email);
        }
        
        const { data: admins, error } = await query.single();

        if (error || !admins) {
            console.log('Admin not found:', email);
            return res.status(401).json({ error: "Invalid email/username or password" });
        }

        const admin = admins;

        // ✅ Check if account is active
        if (admin.status && admin.status !== 'active') {
            return res.status(403).json({ error: `Account is ${admin.status}` });
        }

        // ✅ Check if account is locked
        if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
            const minutesRemaining = Math.ceil((new Date(admin.locked_until) - new Date()) / 60000);
            return res.status(403).json({ 
                error: "Account is locked due to too many failed login attempts", 
                locked_until: admin.locked_until,
                minutes_remaining: minutesRemaining
            });
        }

        // ✅ Check password
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            // Increment login attempts
            const newAttempts = (admin.login_attempts || 0) + 1;
            const updateData = { login_attempts: newAttempts };

            // Lock account after 5 failed attempts
            if (newAttempts >= 5) {
                updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
            }

            await supabase.from('admins').update(updateData).eq('id', admin.id);

            return res.status(401).json({ 
                error: "Invalid email/username or password",
                attempts_remaining: Math.max(0, 5 - newAttempts)
            });
        }

        // ✅ Successful login - reset attempts and update last login
        await supabase.from('admins').update({
            login_attempts: 0,
            locked_until: null,
            last_login: new Date().toISOString()
        }).eq('id', admin.id);

        // ✅ Generate token
        const token = jwt.sign(
            { 
                id: admin.id, 
                email: admin.email,
                username: admin.username,
                role: admin.role,
                tenant_id: admin.tenant_id
            }, 
            SECRET_KEY, 
            { expiresIn: "24h" }
        );

        // ✅ Send token in response
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Lax",
            maxAge: 24 * 60 * 60 * 1000
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

// Add this route temporarily for debugging
router.get("/check-admin", async (req, res) => {
    try {
        const { data: admins, error } = await supabase
            .from('admins')
            .select('id, username, email, full_name, role, status, tenant_id, last_login');

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
