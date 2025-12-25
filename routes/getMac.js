const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const os = require('os');

const getMacAddress = (ip) => {
    return new Promise((resolve) => {
        // If no IP provided, return unknown
        if (!ip) {
            console.log("⚠️ No IP provided");
            return resolve("UNKNOWN_MAC");
        }

        // Check if IP is local
        const isLocalIP = ip.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|localhost|127\.0\.0\.1)/);
        if (!isLocalIP) {
            console.log("⚠️ Not a local IP:", ip);
            return resolve("UNKNOWN_MAC");
        }

        // Try getting MAC from ARP table
        const command = process.platform === 'win32' 
            ? `arp -a ${ip}`
            : `arp -n ${ip}`;

        exec(command, (error, stdout) => {
            if (error) {
                console.log("⚠️ ARP command failed:", error.message);
                return resolve("UNKNOWN_MAC");
            }

            const macRegex = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/;
            const macMatch = stdout.match(macRegex);
            
            if (macMatch) {
                console.log("✅ Found MAC:", macMatch[0]);
                resolve(macMatch[0].toUpperCase());
            } else {
                console.log("⚠️ No MAC found in ARP table");
                resolve("UNKNOWN_MAC");
            }
        });
    });
};

router.get("/get-mac", async (req, res) => {
    console.log("📍 Get MAC request received for IP:", req.query.ip);
    const mac = await getMacAddress(req.query.ip);
    res.json({ mac });
});

module.exports = router;