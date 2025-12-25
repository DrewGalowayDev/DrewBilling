require("dotenv").config();
const { RouterOSClient } = require("node-routeros");

const connectToMikrotik = async () => {
    try {
        console.log('📡 Attempting to connect to MikroTik...');
        const client = new RouterOSClient({
            host: process.env.MIKROTIK_HOST || '192.168.1.1',
            user: process.env.MIKROTIK_USER || 'admin',
            password: process.env.MIKROTIK_PASS || '',
            port: process.env.MIKROTIK_PORT || 8728,
            timeout: 30000
        });

        await client.connect();
        
        // Verify connection
        const system = await client.write('/system/identity/print');
        console.log('✅ Connected to router:', system[0].name);
        
        return client;
    } catch (error) {
        console.error('❌ MikroTik connection failed:', error);
        throw error;
    }
};

const whitelistMAC = async (mac, duration, speed) => {
    // Duration should already be in format like "1h", "24h", "168h", etc.
    // Speed should be like "2M", "5M", "10M", etc.
    
    if (!mac || !duration || !speed) {
        console.error("❌ Missing required parameters:", { mac, duration, speed });
        return { success: false, message: "Missing required parameters" };
    }

    // Convert duration to MikroTik uptime format (e.g., "1h" to "1h00m00s")
    const formatDuration = (dur) => {
        const match = dur.match(/(\d+)(m|h|d)/);
        if (!match) return "1h00m00s"; // Default to 1 hour
        
        const value = parseInt(match[1]);
        const unit = match[2];
        
        if (unit === 'm') return `${value}m00s`;
        if (unit === 'h') return `${value}h00m00s`;
        if (unit === 'd') return `${value}d00h00m00s`;
        return `${value}h00m00s`;
    };

    const formattedDuration = formatDuration(duration);

    console.log(`📡 Whitelisting MAC: ${mac} | Duration: ${formattedDuration} | Speed: ${speed}`);

    try {
        const client = await connectToMikrotik();

        // Add MAC to bypass IP binding with speed limit
        await client.write([
            "/ip/hotspot/ip-binding/add",
            `=mac-address=${mac}`,
            "=type=bypassed",
            `=comment=WiFi-Paid-${formattedDuration}-${speed}`,
            `=rate-limit=${speed}/${speed}`
        ]);

        await client.close();
        return { 
            success: true, 
            message: `MAC ${mac} whitelisted for ${formattedDuration} with ${speed}ps speed limit`,
            duration: formattedDuration,
            speed: speed
        };

    } catch (error) {
        console.error("MikroTik Error:", error);
        return { success: false, message: "MikroTik whitelist failed" };
    }
};

module.exports = { whitelistMAC };
