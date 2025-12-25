require('dotenv').config();
const RouterOSClient = require('routeros-client').RouterOSClient;

// Debug log for TP-LINK configuration
console.log('TP-LINK Router Configuration:', {
    host: process.env.ROUTER_IP || '192.168.0.1', // TP-LINK default IP
    port: process.env.ROUTER_PORT || '80',        // TP-LINK uses HTTP
    user: process.env.ROUTER_USER || 'admin'
});

const routerConfig = {
    host: process.env.ROUTER_IP || '192.168.0.1',  // TP-LINK default IP
    user: process.env.ROUTER_USER || 'admin',      // Default TP-LINK username
    password: process.env.ROUTER_PASSWORD || 'admin', // Default TP-LINK password
    port: parseInt(process.env.ROUTER_PORT || '80', 10),
    timeout: 10000,
    keepalive: true,
    protocol: 'http'  // TP-LINK uses HTTP protocol
};

const connectToRouter = async () => {
    try {
        console.log(`🔍 Attempting to connect to TP-LINK at ${routerConfig.host}`);
        const client = new RouterOSClient(routerConfig);
        await client.connect();
        
        // Basic connection test
        const status = await client.write('/status');
        console.log('✅ TP-LINK Router connected:', status);
        return client;
    } catch (error) {
        console.error('❌ TP-LINK connection error:', {
            message: error.message,
            type: error.name
        });
        throw new Error(`TP-LINK connection failed: ${error.message}`);
    }
};

module.exports = { connectToRouter, routerConfig };