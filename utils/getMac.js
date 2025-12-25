const { exec } = require('child_process');
const os = require('os');

async function populateArpCache(ip) {
    return new Promise((resolve) => {
        const pingCommand = process.platform === 'win32' 
            ? `ping -n 1 ${ip}` 
            : `ping -c 1 ${ip}`;

        exec(pingCommand, () => resolve());
    });
}

async function getMacAddress(ip) {
    try {
        console.log(`🔍 Attempting to get MAC address for IP: ${ip}`);

        // Get all network interfaces
        const interfaces = os.networkInterfaces();
        
        // Try to find MAC address from network interfaces first
        for (const iface of Object.values(interfaces)) {
            for (const details of iface) {
                if (details.address === ip && details.mac) {
                    console.log(`✅ Found MAC from network interface: ${details.mac}`);
                    return details.mac.toUpperCase();
                }
            }
        }

        // Populate ARP cache before lookup
        await populateArpCache(ip);

        // Fallback to ARP table lookup
        return new Promise((resolve) => {
            const commands = process.platform === 'win32' 
                ? [
                    `arp -a ${ip}`,
                    `getmac /v /fo CSV | findstr ${ip}`
                ]
                : [
                    `arp -n ${ip} | grep -v incomplete`,
                    `ip neigh show ${ip}`
                ];

            // Try each command until we find a MAC
            const tryNextCommand = (index) => {
                if (index >= commands.length) {
                    console.log('⚠️ No MAC address found with any method');
                    resolve('UNKNOWN_MAC');
                    return;
                }

                exec(commands[index], (error, stdout) => {
                    if (error) {
                        console.log(`⚠️ Command failed: ${commands[index]}`);
                        tryNextCommand(index + 1);
                        return;
                    }

                    const match = stdout.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/);
                    if (match) {
                        const mac = match[0].toUpperCase();
                        console.log(`✅ Found MAC using ${commands[index]}: ${mac}`);
                        resolve(mac);
                    } else {
                        tryNextCommand(index + 1);
                    }
                });
            };

            tryNextCommand(0);
        });
    } catch (error) {
        console.error('❌ Error getting MAC address:', error);
        return 'UNKNOWN_MAC';
    }
}

module.exports = { getMacAddress };