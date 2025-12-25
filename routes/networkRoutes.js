const express = require("express");
const router = express.Router();
const os = require('os');
const { exec } = require('child_process');

// Populate ARP cache before getting MAC
const populateArpCache = async (ip) => {
    return new Promise((resolve) => {
        // Ping the IP to populate ARP cache
        const command = process.platform === 'win32' 
            ? `ping -n 1 ${ip}`
            : `ping -c 1 ${ip}`;

        exec(command, (error, stdout) => {
            if (error) {
                console.log("⚠️ Ping failed:", error.message);
            }
            resolve();
        });
    });
};

router.get("/get-local-ip", async (req, res) => {
    const interfaces = os.networkInterfaces();
    let networkInfo = [];

    // Get all non-internal IPv4 addresses and their MAC addresses
    Object.keys(interfaces).forEach((ifname) => {
        interfaces[ifname].forEach((iface) => {
            if (iface.family === 'IPv4' && !iface.internal) {
                networkInfo.push({
                    ip: iface.address,
                    mac: iface.mac || null,
                    interface: ifname
                });
            }
        });
    });

    // Populate ARP cache for each IP
    for (const info of networkInfo) {
        await populateArpCache(info.ip);
    }

    console.log("🔍 Network interfaces found:", networkInfo);
    
    // Also return a primary local IP for convenience
    const primaryInterface = networkInfo.find(i => i.ip.startsWith('192.168.')) || networkInfo[0];
    
    res.json({ 
        interfaces: networkInfo,
        localIP: primaryInterface?.ip || null,
        primaryMAC: primaryInterface?.mac || null
    });
});

module.exports = router;