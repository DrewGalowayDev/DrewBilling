require("dotenv").config();
const axios = require('axios'); // You'll need to install axios: npm install axios

const connectToTPLink = async () => {
    try {
        console.log('📡 Attempting to connect to TP-Link...');
        const response = await axios.get(`http://${process.env.TPLINK_HOST || '192.168.0.1'}`, {
            auth: {
                username: process.env.TPLINK_USER || 'admin',
                password: process.env.TPLINK_PASS || 'admin'
            },
            timeout: 5000
        });
        
        console.log('✅ Connected to TP-Link router');
        return response.data;
    } catch (error) {
        console.error('❌ TP-Link connection failed:', error.message);
        throw error;
    }
};

const whitelistMAC = async (mac, time) => {
    const durationMap = {
        "1 Hour": "1h",
        "3 Hours": "3h",
        "6 Hours": "6h",
        "12 Hours": "12h",
        "24 Hours": "1d",
        "2 Days": "2d",
        "3 Days": "3d",
        "1 week": "7d",
        "2 weeks": "14d",
        "1 month": "30d"
    };

    const speedMap = {
        "1 Hour": "2M",
        "3 Hours": "3M",
        "6 Hours": "4M",
        "12 Hours": "5M",
        "24 Hours": "5M",
        "2 Days": "6M",
        "3 Days": "6M",
        "1 week": "6M",
        "2 weeks": "10M",
        "1 month": "10M"
    };

    const duration = durationMap[time];
    const speed = speedMap[time];

    if (!duration) return { success: false, message: "Invalid duration" };

    try {
        await connectToTPLink();
        
        // Add MAC to TP-Link's access control list
        await axios.post(`http://${process.env.TPLINK_HOST}/cgi-bin/mac_filter.cgi`, {
            mac_address: mac,
            action: 'allow',
            duration: duration,
            bandwidth: speed
        }, {
            auth: {
                username: process.env.TPLINK_USER || 'admin',
                password: process.env.TPLINK_PASS || 'admin'
            }
        });

        return { 
            success: true, 
            message: `MAC ${mac} whitelisted on TP-Link router for ${duration}` 
        };

    } catch (error) {
        console.error("TP-Link Error:", error.message);
        return { success: false, message: "TP-Link whitelist failed" };
    }
};

module.exports = { whitelistMAC };