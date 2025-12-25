const express = require("express");
const router = express.Router();
const db = require("../db");
const { initiateSTKPush, processMpesaCallback } = require("../controllers/mpesaController");

// ✅ Handle MPesa STK Push Request
router.post("/stkpush", async (req, res) => {
    const { phone, amount } = req.body;

    try {
        const transactionId = await initiateSTKPush(phone, amount);
        res.json({ success: true, message: "STK Push sent", transactionId });
    } catch (error) {
        console.error("STK Push Error:", error);
        res.status(500).json({ success: false, message: "Failed to send STK Push" });
    }
});

// ✅ Handle MPesa Callback (Payment Confirmation)
router.post("/mpesa/callback", async (req, res) => {
    try {
        await processMpesaCallback(req.body);
        res.status(200).json({ success: true, message: "Callback processed" });
    } catch (error) {
        console.error("MPesa Callback Error:", error);
        res.status(500).json({ success: false, message: "Callback processing failed" });
    }
});

// ✅ Check Payment Status (for Real-Time Updates)
router.get("/status/:transactionId", async (req, res) => {
    const { transactionId } = req.params;

    db.query("SELECT status FROM payments WHERE transaction_id = ?", [transactionId], (err, results) => {
        if (err || results.length === 0) {
            return res.json({ status: "Pending" });
        }
        res.json({ status: results[0].status });
    });
});

router.post("/pay", async (req, res) => {
    try {
        const { phone, amount, mac_address } = req.body;
        console.log("📩 Incoming STK Push Request:", { phone, amount, mac_address });

        // Generate transaction ID
        const transactionId = `TXN_${Date.now()}`;

        // Save transaction first
        await db.query(
            "INSERT INTO transactions (id, phone, amount, mac_address, status) VALUES (?, ?, ?, ?, ?)",
            [transactionId, phone, amount, mac_address, "pending"]
        );

        // Get access token
        const auth = await getAccessToken();
        if (!auth.access_token) {
            throw new Error("Failed to get access token");
        }

        // Send STK Push
        const stkPushResponse = await initiateSTKPush({
            phone,
            amount,
            transactionId,
            accessToken: auth.access_token
        });

        if (!stkPushResponse || !stkPushResponse.CheckoutRequestID) {
            throw new Error("Invalid STK Push response");
        }

        res.json({
            success: true,
            message: "STK Push sent successfully",
            transactionId
        });

    } catch (error) {
        console.error("❌ Payment Error:", error);
        
        // Update transaction status if it was created
        if (transactionId) {
            await db.query(
                "UPDATE transactions SET status = ?, error = ? WHERE id = ?",
                ["failed", error.message, transactionId]
            );
        }

        res.status(500).json({
            success: false,
            message: "Payment initiation failed. Please try again.",
            error: error.message
        });
    }
});

module.exports = router;
