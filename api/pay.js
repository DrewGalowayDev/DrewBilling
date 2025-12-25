const express = require("express");
const axios = require("axios");
const db = require("../config/db");
require('dotenv').config();

const router = express.Router();

//  helper functions 
const getAccessToken = async () => {
  try {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64');

    console.log('Attempting to get access token...');
    console.log('Auth string:', auth);

    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.access_token) {
      throw new Error('No access token in response');
    }

    console.log('Access token received successfully');
    return response.data.access_token;

  } catch (error) {
    console.error('Authentication Error Details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw error;
  }
};

router.post("/pay", async (req, res) => {
  const { phone, amount, mac } = req.body;

  // Validate incoming data
  if (!phone || !amount || !mac) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  // Generate a unique transaction ID for tracking
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const transactionId = `${process.env.MPESA_SHORTCODE}${timestamp}`;

  try {
    // Get access token
    const accessToken = await getAccessToken();

    // Prepare STK Push parameters
    const stkPushUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

    const stkRequestBody = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: "WiFi Payment",
      TransactionDesc: "WiFi Access Payment"
    };

    // Make STK Push request
    const mpesaResponse = await axios.post(stkPushUrl, stkRequestBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    // Store the payment request in DB
    db.query(
      "INSERT INTO payments (transaction_id, phone, amount, mac_address, status) VALUES (?, ?, ?, ?, ?)",
      [transactionId, phone, amount, mac, "pending"],
      (err, result) => {
        if (err) {
          console.error("DB Error:", err);
          return res.status(500).json({ success: false, message: "Database insertion failed" });
        }
      }
    );

    return res.json({
      success: true,
      message: "STK push sent successfully",
      transactionId,
      mpesaResponse: mpesaResponse.data
    });

  } catch (error) {
    console.error("M-Pesa API Error:", error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      message: "M-Pesa API request failed",
      error: error.response?.data || error.message 
    });
  }
});

module.exports = router;
