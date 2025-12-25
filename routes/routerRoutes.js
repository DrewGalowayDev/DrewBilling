const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/router/test', async (req, res) => {
    try {
        console.log('🔄 Testing TP-LINK connection...');
        
        // Test basic connectivity
        const pingResponse = await axios.get(`http://${process.env.ROUTER_IP}`, {
            timeout: 5000,
            validateStatus: false
        });

        // Even if we get 401, it means router is reachable
        if (pingResponse.status === 401 || pingResponse.status === 200) {
            console.log('✅ TP-LINK router is reachable');
            
            res.json({
                status: 'success',
                message: 'TP-LINK router is reachable',
                details: {
                    ip: process.env.ROUTER_IP,
                    port: process.env.ROUTER_PORT,
                    reachable: true,
                    responseStatus: pingResponse.status
                }
            });
        } else {
            throw new Error(`Unexpected response: ${pingResponse.status}`);
        }
    } catch (error) {
        console.error('❌ Router test failed:', error.message);
        res.status(500).json({
            status: 'error',
            message: 'Router connection failed',
            error: error.message
        });
    }
});

module.exports = router;