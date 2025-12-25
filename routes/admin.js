const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ Get Admin Dashboard Data (Protected)
router.get("/dashboard", authMiddleware, async (req, res) => {
    try {
        // Get summary statistics
        const summaryQuery = `
            SELECT 
                (SELECT COUNT(DISTINCT phone) FROM payments WHERE status = 'confirmed') AS totalUsers,
                (SELECT COALESCE(SUM(CAST(amount AS DECIMAL(10,2))), 0) FROM payments WHERE status = 'confirmed') AS totalRevenue,
                (SELECT COUNT(*) FROM sessions WHERE status = 'active') AS activeSessions,
                (SELECT COUNT(*) FROM payments WHERE status = 'pending') AS pendingPayments
        `;

        const [summaryResults] = await db.query(summaryQuery);
        const summary = summaryResults[0];

        // Get recent payments
        const paymentsQuery = `
            SELECT 
                id,
                phone as user,
                CAST(amount AS CHAR) as amount,
                transaction_id,
                mac_address,
                status,
                time_purchased,
                mpesa_receipt_number,
                created_at,
                confirmed_at
            FROM payments 
            ORDER BY created_at DESC 
            LIMIT 100
        `;

        const [payments] = await db.query(paymentsQuery);

        res.json({
            summary: summary,
            payments: payments
        });
    } catch (error) {
        console.error("❌ Dashboard error:", error);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
});

// ✅ Get All Payments (Protected)
router.get("/payments", authMiddleware, async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT 
                id,
                phone,
                CAST(amount AS CHAR) as amount,
                transaction_id,
                mac_address,
                status,
                time_purchased,
                mpesa_receipt_number,
                created_at,
                updated_at
            FROM payments 
            ORDER BY created_at DESC`
        );
        res.json(results);
    } catch (error) {
        console.error("❌ Error fetching payments:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// ✅ Get Active Sessions (Protected)
router.get("/sessions", authMiddleware, async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT 
                s.id,
                s.mac_address,
                s.phone,
                s.ip_address,
                s.session_start,
                s.session_end,
                s.duration_minutes,
                s.speed_limit,
                s.status,
                s.data_used_mb,
                p.amount,
                p.time_purchased,
                d.device_name,
                TIMESTAMPDIFF(MINUTE, s.session_start, NOW()) as elapsed_minutes,
                (s.duration_minutes - TIMESTAMPDIFF(MINUTE, s.session_start, NOW())) as remaining_minutes
            FROM sessions s
            LEFT JOIN payments p ON s.payment_id = p.id
            LEFT JOIN devices d ON s.device_id = d.id
            WHERE s.status = 'active'
            ORDER BY s.session_start DESC`
        );
        res.json(results);
    } catch (error) {
        console.error("❌ Error fetching sessions:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// ✅ Get All Devices (Protected)
router.get("/devices", authMiddleware, async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT 
                id,
                mac_address,
                ip_address,
                device_name,
                status,
                last_seen,
                created_at
            FROM devices 
            ORDER BY last_seen DESC`
        );
        res.json(results);
    } catch (error) {
        console.error("❌ Error fetching devices:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// ✅ Terminate Session (Protected)
router.post("/sessions/:id/terminate", authMiddleware, async (req, res) => {
    try {
        const sessionId = req.params.id;
        
        await db.query(
            "UPDATE sessions SET status = 'terminated', session_end = NOW() WHERE id = ?",
            [sessionId]
        );
        
        res.json({ success: true, message: "Session terminated successfully" });
    } catch (error) {
        console.error("❌ Error terminating session:", error);
        res.status(500).json({ error: "Failed to terminate session" });
    }
});

module.exports = router;
