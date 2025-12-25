require("dotenv").config();
const axios = require("axios");
const moment = require("moment");

// Configuration constants
const MPESA_ENV = process.env.MPESA_ENV || "sandbox";
const MPESA_BASE_URL = MPESA_ENV === "sandbox" ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke";

// Axios configuration
const axiosConfig = {
    timeout: 30000, // 30 seconds timeout
    headers: {
        'Content-Type': 'application/json'
    }
};

// Required environment variables check
const REQUIRED_ENV_VARS = [
    "MPESA_CONSUMER_SECRET",
    "MPESA_CONSUMER_KEY", 
    "MPESA_SHORTCODE",
    "MPESA_PASSKEY",
    "MPESA_CALLBACK_URL"
];

for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
        console.error(`❌ Missing environment variable: ${varName}`);
        process.exit(1);
    }
}

// Enhanced access token function with retries
const getAccessToken = async (retries = 3) => {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(
                `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
                {
                    ...axiosConfig,
                    headers: { 
                        ...axiosConfig.headers,
                        Authorization: `Basic ${auth}` 
                    }
                }
            );
            console.log("✅ MPesa Access Token Obtained Successfully");
            return response.data.access_token;
        } catch (error) {
            console.error(`❌ MPesa Auth Error (Attempt ${attempt}/${retries}):`, 
                error.response?.data || error.message);
            if (attempt === retries) return null;
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
        }
    }
    return null;
};

// Enhanced STK Push function with better error handling
const stkPush = async (phone, amount, transactionId) => {
    console.log(`📩 STK Push Request: Phone: ${phone}, Amount: ${amount}, TransactionID: ${transactionId}`);

    try {
        // Validate input parameters
        if (!phone || !amount || !transactionId) {
            throw new Error("Missing required parameters");
        }

        const accessToken = await getAccessToken();
        if (!accessToken) {
            throw new Error("Failed to obtain access token");
        }

        const timestamp = moment().format("YYYYMMDDHHmmss");
        const password = Buffer.from(
            `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
        ).toString("base64");

        const payload = {
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: parseInt(amount),
            PartyA: phone,
            PartyB: process.env.MPESA_SHORTCODE,
            PhoneNumber: phone,
            CallBackURL: process.env.MPESA_CALLBACK_URL,
            AccountReference: "WiFi Payment",
            TransactionDesc: `WiFi Payment - ${transactionId}`
        };

        console.log("📤 Sending STK Push...");
        const response = await axios.post(
            `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
            payload,
            {
                ...axiosConfig,
                headers: {
                    ...axiosConfig.headers,
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        if (response.data.ResponseCode === "0") {
            console.log("✅ STK Push Successful:", response.data);
            return response.data;
        } else {
            throw new Error(`STK Push failed: ${response.data.ResponseDescription}`);
        }
    } catch (error) {
        console.error("❌ MPesa STK Push Error:", error.response?.data || error.message);
        throw error; // Propagate error to caller
    }
};

// Query STK Push transaction status from M-Pesa
const queryTransactionStatus = async (checkoutRequestID) => {
    console.log(`🔍 Querying transaction status for: ${checkoutRequestID}`);

    try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
            throw new Error("Failed to obtain access token");
        }

        const timestamp = moment().format("YYYYMMDDHHmmss");
        const password = Buffer.from(
            `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
        ).toString("base64");

        const payload = {
            BusinessShortCode: process.env.MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID
        };

        const response = await axios.post(
            `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
            payload,
            {
                ...axiosConfig,
                headers: {
                    ...axiosConfig.headers,
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        console.log("📊 Transaction Status Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Transaction Query Error:", error.response?.data || error.message);
        throw error;
    }
};

module.exports = { stkPush, getAccessToken, queryTransactionStatus };
