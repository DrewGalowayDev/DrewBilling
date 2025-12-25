/**
 * Enhanced Router Service
 * MikroTik RouterOS API integration for hotspot management
 */

const RouterOSClient = require('routeros-client').RouterOSClient;

class RouterService {
    constructor() {
        this.client = null;
        this.config = null;
    }

    /**
     * Load router configuration
     */
    async loadConfig() {
        this.config = {
            host: process.env.ROUTER_IP || process.env.MIKROTIK_HOST || '192.168.1.1',
            port: parseInt(process.env.ROUTER_PORT || process.env.MIKROTIK_PORT || '8728'),
            user: process.env.ROUTER_USER || process.env.MIKROTIK_USER || 'admin',
            password: process.env.ROUTER_PASSWORD || process.env.MIKROTIK_PASSWORD || ''
        };
        return this.config;
    }

    /**
     * Connect to MikroTik router
     */
    async connect() {
        try {
            await this.loadConfig();
            
            this.client = new RouterOSClient({
                host: this.config.host,
                user: this.config.user,
                password: this.config.password,
                port: this.config.port,
                timeout: 10
            });

            await this.client.connect();
            console.log('✅ Connected to MikroTik router');
            return true;
        } catch (error) {
            console.error('❌ Router connection failed:', error.message);
            throw error;
        }
    }

    /**
     * Disconnect from router
     */
    async disconnect() {
        if (this.client) {
            try {
                await this.client.close();
                this.client = null;
            } catch (error) {
                console.error('Error disconnecting from router:', error);
            }
        }
    }

    /**
     * Test router connection
     */
    async testConnection() {
        try {
            await this.connect();
            
            // Get system identity to verify connection
            const identity = await this.client.write('/system/identity/print');
            
            await this.disconnect();
            
            return {
                connected: true,
                message: 'Connection successful',
                details: {
                    identity: identity[0]?.name || 'Unknown',
                    host: this.config.host,
                    port: this.config.port
                }
            };
        } catch (error) {
            return {
                connected: false,
                message: error.message,
                details: {
                    host: this.config?.host || 'Not configured',
                    port: this.config?.port || 'Not configured'
                }
            };
        }
    }

    /**
     * Get system resources
     */
    async getSystemResources() {
        try {
            await this.connect();
            const resources = await this.client.write('/system/resource/print');
            await this.disconnect();
            
            return resources[0] || {};
        } catch (error) {
            console.error('Error getting system resources:', error);
            throw error;
        }
    }

    /**
     * Get active hotspot users
     */
    async getActiveHotspotUsers() {
        try {
            await this.connect();
            const users = await this.client.write('/ip/hotspot/active/print');
            await this.disconnect();
            
            return users || [];
        } catch (error) {
            console.error('Error getting active hotspot users:', error);
            return [];
        }
    }

    /**
     * Get hotspot user list
     */
    async getHotspotUsers() {
        try {
            await this.connect();
            const users = await this.client.write('/ip/hotspot/user/print');
            await this.disconnect();
            
            return users || [];
        } catch (error) {
            console.error('Error getting hotspot users:', error);
            return [];
        }
    }

    /**
     * Add hotspot user
     */
    async addHotspotUser(username, password, profile = 'default', macAddress = null, comment = '') {
        try {
            await this.connect();
            
            const userParams = {
                name: username,
                password: password,
                profile: profile,
                comment: comment
            };
            
            if (macAddress) {
                userParams['mac-address'] = macAddress;
            }
            
            await this.client.write('/ip/hotspot/user/add', userParams);
            await this.disconnect();
            
            console.log(`✅ Hotspot user ${username} added successfully`);
            return { success: true, message: 'User added successfully' };
        } catch (error) {
            console.error('Error adding hotspot user:', error);
            await this.disconnect();
            throw error;
        }
    }

    /**
     * Remove hotspot user
     */
    async removeHotspotUser(username) {
        try {
            await this.connect();
            
            // Find user by name
            const users = await this.client.write('/ip/hotspot/user/print', {
                '?name': username
            });
            
            if (users.length > 0) {
                await this.client.write('/ip/hotspot/user/remove', {
                    '.id': users[0]['.id']
                });
            }
            
            await this.disconnect();
            return { success: true, message: 'User removed successfully' };
        } catch (error) {
            console.error('Error removing hotspot user:', error);
            await this.disconnect();
            throw error;
        }
    }

    /**
     * Disconnect active user
     */
    async disconnectActiveUser(macAddress) {
        try {
            await this.connect();
            
            const activeUsers = await this.client.write('/ip/hotspot/active/print', {
                '?mac-address': macAddress
            });
            
            if (activeUsers.length > 0) {
                await this.client.write('/ip/hotspot/active/remove', {
                    '.id': activeUsers[0]['.id']
                });
            }
            
            await this.disconnect();
            return { success: true, message: 'User disconnected successfully' };
        } catch (error) {
            console.error('Error disconnecting user:', error);
            await this.disconnect();
            throw error;
        }
    }

    /**
     * Add user access (legacy method for backwards compatibility)
     */
    async addUserAccess(mac, duration, speed) {
        try {
            await this.connect();
            
            // Add to address list
            await this.client.write('/ip/firewall/address-list/add', {
                'address': mac,
                'list': 'allowed-clients',
                'comment': `Paid Access - ${duration}`
            });

            // Add speed limit
            await this.client.write('/queue/simple/add', {
                'name': `client-${mac}`,
                'target': mac,
                'max-limit': `${speed}/${speed}`,
                'comment': `Speed limit for ${mac}`
            });

            await this.disconnect();
            console.log(`✅ Added access for MAC: ${mac}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to add user access:', error);
            await this.disconnect();
            throw error;
        }
    }

    /**
     * Remove user access
     */
    async removeUserAccess(mac) {
        try {
            await this.connect();
            
            // Remove from address list
            const addressEntries = await this.client.write('/ip/firewall/address-list/print', {
                '?address': mac,
                '?list': 'allowed-clients'
            });
            
            for (const entry of addressEntries) {
                await this.client.write('/ip/firewall/address-list/remove', {
                    '.id': entry['.id']
                });
            }

            // Remove speed limit queue
            const queues = await this.client.write('/queue/simple/print', {
                '?name': `client-${mac}`
            });
            
            for (const queue of queues) {
                await this.client.write('/queue/simple/remove', {
                    '.id': queue['.id']
                });
            }

            await this.disconnect();
            console.log(`✅ Removed access for MAC: ${mac}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to remove user access:', error);
            await this.disconnect();
            throw error;
        }
    }

    /**
     * Block MAC address
     */
    async blockMacAddress(macAddress, comment = 'Blocked by admin') {
        try {
            await this.connect();
            
            await this.client.write('/ip/hotspot/ip-binding/add', {
                'mac-address': macAddress,
                type: 'blocked',
                comment: comment
            });
            
            // Also disconnect if currently active
            await this.disconnectActiveUser(macAddress);
            
            await this.disconnect();
            return { success: true, message: 'MAC address blocked successfully' };
        } catch (error) {
            console.error('Error blocking MAC address:', error);
            await this.disconnect();
            throw error;
        }
    }

    /**
     * Unblock MAC address
     */
    async unblockMacAddress(macAddress) {
        try {
            await this.connect();
            
            const bindings = await this.client.write('/ip/hotspot/ip-binding/print', {
                '?mac-address': macAddress,
                '?type': 'blocked'
            });
            
            if (bindings.length > 0) {
                await this.client.write('/ip/hotspot/ip-binding/remove', {
                    '.id': bindings[0]['.id']
                });
            }
            
            await this.disconnect();
            return { success: true, message: 'MAC address unblocked successfully' };
        } catch (error) {
            console.error('Error unblocking MAC address:', error);
            await this.disconnect();
            throw error;
        }
    }

    /**
     * Authorize device after payment
     */
    async authorizeDevice(phone, macAddress, durationMinutes, speedLimit) {
        try {
            // Generate username from phone
            const username = `USER-${phone.slice(-6)}-${Date.now().toString(36)}`;
            const password = Math.random().toString(36).substring(2, 10);
            
            // Add hotspot user
            await this.addHotspotUser(
                username,
                password,
                speedLimit || 'default',
                macAddress,
                `Phone: ${phone}, Duration: ${durationMinutes}min`
            );
            
            return {
                success: true,
                credentials: {
                    username,
                    password,
                    profile: speedLimit || 'default',
                    expiresIn: durationMinutes
                }
            };
        } catch (error) {
            console.error('Error authorizing device:', error);
            throw error;
        }
    }

    /**
     * Get hotspot hosts (connected devices)
     */
    async getHotspotHosts() {
        try {
            await this.connect();
            const hosts = await this.client.write('/ip/hotspot/host/print');
            await this.disconnect();
            
            return hosts || [];
        } catch (error) {
            console.error('Error getting hotspot hosts:', error);
            return [];
        }
    }

    /**
     * Get hotspot profiles
     */
    async getHotspotProfiles() {
        try {
            await this.connect();
            const profiles = await this.client.write('/ip/hotspot/user/profile/print');
            await this.disconnect();
            
            return profiles || [];
        } catch (error) {
            console.error('Error getting hotspot profiles:', error);
            return [];
        }
    }
}

module.exports = new RouterService();