const express = require("express");
const { stkPush, queryTransactionStatus } = require("../config/mpesa");
const { query, supabase } = require("../config/db");

const router = express.Router();

router.post("/pay", async (req, res) => {
    console.log("📩 Incoming STK Push Request:", req.body);

    const { phone, amount, mac_address } = req.body;

    // Validate required fields
    if (!phone || !amount || !mac_address) {
        console.error("❌ Missing required fields:", req.body);
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate phone number format
    if (!/^2547\d{8}$/.test(phone)) {
        console.error("❌ Invalid phone number format:", phone);
        return res.status(400).json({ error: "Invalid phone number. Use 2547XXXXXXXX format." });
    }

    // Validate amount against available plans
    const validAmounts = [1,10, 15, 20, 25, 30, 50, 80, 200, 300, 500];
    if (!validAmounts.includes(Number(amount))) {
        console.error("❌ Invalid amount:", amount);
        return res.status(400).json({ error: "Invalid amount. Please select a valid plan." });
    }

    // Generate transaction ID with timestamp
    const transactionId = `TXN_${Date.now()}`;
    console.log(`💾 Saving transaction: ${transactionId} - Amount: ${amount} - Phone: ${phone}`);

    try {
        // Save to database as "pending" using Supabase
        const { data: payment, error: dbError } = await supabase
            .from('payments')
            .insert({
                phone,
                amount,
                transaction_id: transactionId,
                mac_address,
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select();

        if (dbError) {
            console.error("❌ Database error:", dbError);
            throw new Error("Failed to save payment record");
        }

        console.log("📤 Sending STK Push...");
        const response = await stkPush(phone, amount, transactionId);
        
        if (!response) {
            throw new Error("No response received from MPesa API");
        }

        // Store CheckoutRequestID for later querying
        if (response.CheckoutRequestID) {
            await supabase
                .from('payments')
                .update({ 
                    mpesa_receipt_number: response.CheckoutRequestID // Temporarily store in this field
                })
                .eq('transaction_id', transactionId);
        }

        console.log("✅ STK Push Successful:", response);
        return res.json({ 
            success: true, 
            message: "STK Push sent successfully", 
            transactionId,
            checkoutRequestID: response.CheckoutRequestID,
            response 
        });

    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error("Details:", error);
    
        try {
            // Update payment status to failed using Supabase
            await supabase
                .from('payments')
                .update({ 
                    status: 'failed', 
                    error_message: error.message 
                })
                .eq('transaction_id', transactionId);
        } catch (dbError) {
            console.error("❌ Failed to update payment status:", dbError.message);
        }

        return res.status(500).json({ 
            error: "Payment request failed", 
            message: error.message,
            transactionId 
        });
    }
});

// Get payment status by transaction ID and query M-Pesa if still pending
router.get("/status/:transactionId", async (req, res) => {
    const { transactionId } = req.params;
    
    try {
        const { data: payment, error } = await supabase
            .from('payments')
            .select('*')
            .eq('transaction_id', transactionId)
            .single();

        if (error || !payment) {
            return res.status(404).json({ 
                success: false, 
                message: "Payment not found" 
            });
        }

        // If payment is still pending after 10 seconds, query M-Pesa directly
        const createdTime = new Date(payment.created_at).getTime();
        const now = Date.now();
        const secondsElapsed = (now - createdTime) / 1000;

        if (payment.status === 'pending' && secondsElapsed > 10) {
            console.log(`⏰ Payment pending for ${secondsElapsed}s, querying M-Pesa...`);
            
            try {
                // Extract CheckoutRequestID from the STK Push response if stored
                // For now, we'll just mark it for manual check
                console.log("🔄 Consider manually checking M-Pesa portal or use CheckoutRequestID to query");
            } catch (queryError) {
                console.error("❌ M-Pesa query failed:", queryError);
            }
        }

        return res.json({
            success: true,
            status: payment.status,
            amount: payment.amount,
            phone: payment.phone,
            mpesa_receipt_number: payment.mpesa_receipt_number,
            created_at: payment.created_at,
            confirmed_at: payment.confirmed_at
        });
    } catch (error) {
        console.error("❌ Error fetching payment status:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to fetch payment status" 
        });
    }
});

// Manually confirm payment (for testing when callback doesn't work)
router.post("/confirm/:transactionId", async (req, res) => {
    const { transactionId } = req.params;
    
    try {
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .eq('transaction_id', transactionId)
            .single();

        if (fetchError || !payment) {
            return res.status(404).json({ 
                success: false, 
                message: "Payment not found" 
            });
        }

        if (payment.status === 'confirmed') {
            return res.json({
                success: true,
                message: "Payment already confirmed"
            });
        }

        // Update payment to confirmed
        const { error: updateError } = await supabase
            .from('payments')
            .update({
                status: 'confirmed',
                confirmed_at: new Date().toISOString()
            })
            .eq('transaction_id', transactionId);

        if (updateError) {
            throw updateError;
        }

        return res.json({
            success: true,
            message: "Payment manually confirmed",
            transactionId
        });
    } catch (error) {
        console.error("❌ Error confirming payment:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to confirm payment" 
        });
    }
});

/**
 * Test MPESA API Connection
 * GET /api/mpesa/test
 * 
 * Connection Testing Commands:
 * 1. Test MPESA setup: 
 *    curl http://localhost:5000/api/mpesa/test
 * 
 * 2. Test Router connection: 
 *    curl http://localhost:5000/api/router/test
 * 
 * 3. Test Payment (replace with actual values):
 *    curl -X POST http://localhost:5000/api/mpesa/pay 
 *    -H "Content-Type: application/json" \
 *    -d '{"phone":"254712345678","amount":"1","mac_address":"XX:XX:XX:XX:XX:XX"}'
 */
router.get("/test", (req, res) => {
    const initCodes = {
        consumerKey: process.env.MPESA_CONSUMER_KEY ? "✅ Set" : "❌ Missing",
        consumerSecret: process.env.MPESA_CONSUMER_SECRET ? "✅ Set" : "❌ Missing",
        passkey: process.env.MPESA_PASSKEY ? "✅ Set" : "❌ Missing"
    };

    res.json({
        status: "success",
        message: "MPesa API route is working",
        initializationCodes: initCodes,
        credentials: {
            shortcode: process.env.MPESA_SHORTCODE,
            environment: process.env.MPESA_ENV,
            callbackUrl: process.env.MPESA_CALLBACK_URL
        },
        configStatus: "To verify complete setup, check if all initialization codes show ✅"
    });
});

module.exports = router;
