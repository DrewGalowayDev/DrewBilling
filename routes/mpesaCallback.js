const express = require("express");
const { supabase } = require("../config/db");
const { whitelistMAC } = require("../config/mikrotik");

const router = express.Router();

// Test endpoint to verify callback URL is reachable
router.get("/callback", (req, res) => {
    console.log("✅ Callback GET request received (test)");
    res.json({ 
        success: true, 
        message: "Callback endpoint is reachable",
        timestamp: new Date().toISOString()
    });
});

// Validation endpoint - accepts all transactions
router.post("/validation", (req, res) => {
    console.log("🔍 M-Pesa Validation Request:", JSON.stringify(req.body, null, 2));
    // Accept all transactions
    res.json({
        ResultCode: 0,
        ResultDesc: "Accepted"
    });
});

router.post("/callback", async (req, res) => {
    console.log("🔔 ========== M-PESA CALLBACK RECEIVED ==========");
    console.log("📲 Full Request Body:", JSON.stringify(req.body, null, 2));
    console.log("📋 Headers:", JSON.stringify(req.headers, null, 2));
    console.log("================================================");

    const callbackData = req.body.Body?.stkCallback;
    const checkoutRequestID = callbackData?.CheckoutRequestID;
    const resultCode = callbackData?.ResultCode;

    if (resultCode !== 0) {
        console.log("⚠️ Payment failed or canceled");
        return res.json({ success: false, message: "Payment failed or canceled" });
    }

    const callbackMetadata = callbackData?.CallbackMetadata?.Item || [];
    const amount = callbackMetadata.find(item => item.Name === "Amount")?.Value;
    const mpesaReceiptNumber = callbackMetadata.find(item => item.Name === "MpesaReceiptNumber")?.Value;
    const phoneNumber = callbackMetadata.find(item => item.Name === "PhoneNumber")?.Value;

    if (!amount || !checkoutRequestID) {
        return res.status(400).json({ error: "Invalid M-Pesa callback data" });
    }

    try {
        // Fetch payment details from Supabase
        const { data: payments, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .eq('transaction_id', checkoutRequestID);

        if (fetchError || !payments || payments.length === 0) {
            console.error("❌ Payment not found for transaction:", checkoutRequestID);
            return res.status(404).json({ error: "Payment not found" });
        }

        const payment = payments[0];
        const mac = payment.mac_address;
        const phone = payment.phone || phoneNumber;
        
        // Amount to duration and speed mapping
        const packageMap = {
            1: { duration: "30m", speed: "2M", minutes: 30, label: "30 mins" },
            10: { duration: "1h", speed: "2M", minutes: 60, label: "1 Hour" },
            15: { duration: "3h", speed: "3M", minutes: 180, label: "3 Hours" },
            20: { duration: "6h", speed: "4M", minutes: 360, label: "6 Hours" },
            25: { duration: "12h", speed: "5M", minutes: 720, label: "12 Hours" },
            30: { duration: "24h", speed: "5M", minutes: 1440, label: "24 Hours" },
            50: { duration: "48h", speed: "6M", minutes: 2880, label: "2 Days" },
            80: { duration: "72h", speed: "6M", minutes: 4320, label: "3 Days" },
            200: { duration: "168h", speed: "6M", minutes: 10080, label: "1 week" },
            300: { duration: "336h", speed: "10M", minutes: 20160, label: "2 weeks" },
            500: { duration: "720h", speed: "10M", minutes: 43200, label: "1 month" }
        };

        const pkg = packageMap[parseInt(amount)] || packageMap[10]; // Default to 1 hour
        
        console.log(`✅ Processing payment: ${mac} | Amount: ${amount} | Duration: ${pkg.duration}`);

        // Whitelist MAC on MikroTik
        const mikrotikResponse = await whitelistMAC(mac, pkg.duration, pkg.speed);

        if (mikrotikResponse.success) {
            // Update payment status
            await supabase
                .from('payments')
                .update({
                    status: 'confirmed',
                    mpesa_receipt_number: mpesaReceiptNumber,
                    time_purchased: pkg.label,
                    confirmed_at: new Date().toISOString()
                })
                .eq('transaction_id', checkoutRequestID);

            // Register or update device (upsert)
            const { data: existingDevice } = await supabase
                .from('devices')
                .select('id')
                .eq('mac_address', mac)
                .single();

            let deviceId;
            if (existingDevice) {
                // Update existing device
                await supabase
                    .from('devices')
                    .update({
                        status: 'active',
                        last_seen: new Date().toISOString()
                    })
                    .eq('mac_address', mac);
                deviceId = existingDevice.id;
            } else {
                // Insert new device
                const { data: newDevice } = await supabase
                    .from('devices')
                    .insert({
                        mac_address: mac,
                        status: 'active',
                        last_seen: new Date().toISOString()
                    })
                    .select()
                    .single();
                deviceId = newDevice.id;
            }

            // Create session
            await supabase
                .from('sessions')
                .insert({
                    payment_id: payment.id,
                    device_id: deviceId,
                    mac_address: mac,
                    phone: phone,
                    duration_minutes: pkg.minutes,
                    speed_limit: pkg.speed,
                    status: 'active',
                    session_start: new Date().toISOString()
                });

            console.log("✅ Session created successfully");
            return res.json({ 
                success: true, 
                message: mikrotikResponse.message,
                session_info: {
                    duration: pkg.label,
                    speed: pkg.speed,
                    expires_in_minutes: pkg.minutes
                }
            });
        } else {
            console.error("❌ MikroTik Error:", mikrotikResponse.message);
            await supabase
                .from('payments')
                .update({
                    status: 'failed',
                    error_message: mikrotikResponse.message
                })
                .eq('transaction_id', checkoutRequestID);
            return res.status(500).json({ error: "MikroTik whitelist failed" });
        }
    } catch (error) {
        console.error("❌ Callback processing error:", error);
        return res.status(500).json({ error: "Failed to process callback" });
    }
});

module.exports = router;
