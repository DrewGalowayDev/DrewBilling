// ===============================================
// SYSTEM INTEGRATION TEST SCRIPT
// Run: node test-integration.js
// ===============================================

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, type = 'info') {
    const color = type === 'success' ? colors.green : type === 'error' ? colors.red : type === 'warn' ? colors.yellow : colors.blue;
    console.log(`${color}${message}${colors.reset}`);
}

async function testHealthCheck() {
    try {
        log('\n🔍 Testing Health Check...', 'info');
        const response = await axios.get(`${BASE_URL}/api/health`);
        log(`✅ Health Check: ${response.data.status}`, 'success');
        return true;
    } catch (error) {
        log(`❌ Health Check Failed: ${error.message}`, 'error');
        return false;
    }
}

async function testMPesaSetup() {
    try {
        log('\n🔍 Testing MPesa Setup...', 'info');
        const response = await axios.get(`${BASE_URL}/api/mpesa/test`);
        log(`✅ MPesa API: ${response.data.status}`, 'success');
        log(`   - Consumer Key: ${response.data.initializationCodes.consumerKey}`);
        log(`   - Consumer Secret: ${response.data.initializationCodes.consumerSecret}`);
        log(`   - Passkey: ${response.data.initializationCodes.passkey}`);
        log(`   - Shortcode: ${response.data.credentials.shortcode}`);
        log(`   - Callback URL: ${response.data.credentials.callbackUrl}`);
        return true;
    } catch (error) {
        log(`❌ MPesa Setup Failed: ${error.message}`, 'error');
        return false;
    }
}

async function testMACDetection() {
    try {
        log('\n🔍 Testing MAC Address Detection...', 'info');
        const response = await axios.get(`${BASE_URL}/api/mac/get-mac?ip=192.168.1.1`);
        log(`✅ MAC Detection: ${response.data.mac}`, 'success');
        return true;
    } catch (error) {
        log(`❌ MAC Detection Failed: ${error.message}`, 'error');
        return false;
    }
}

async function testNetworkInfo() {
    try {
        log('\n🔍 Testing Network Interface Detection...', 'info');
        const response = await axios.get(`${BASE_URL}/api/network/get-local-ip`);
        log(`✅ Network Interfaces Found: ${response.data.interfaces.length}`, 'success');
        response.data.interfaces.forEach(iface => {
            log(`   - IP: ${iface.ip} | MAC: ${iface.mac || 'N/A'} | Interface: ${iface.interface}`);
        });
        return true;
    } catch (error) {
        log(`❌ Network Info Failed: ${error.message}`, 'error');
        return false;
    }
}

async function testDatabaseConnection() {
    try {
        log('\n🔍 Testing Database Connection...', 'info');
        const db = require('./config/db');
        const [result] = await db.query('SELECT COUNT(*) as count FROM payments');
        log(`✅ Database Connected: ${result[0].count} payments found`, 'success');
        
        const [sessions] = await db.query('SELECT COUNT(*) as count FROM sessions');
        log(`   - Sessions: ${sessions[0].count}`, 'info');
        
        const [devices] = await db.query('SELECT COUNT(*) as count FROM devices');
        log(`   - Devices: ${devices[0].count}`, 'info');
        
        return true;
    } catch (error) {
        log(`❌ Database Connection Failed: ${error.message}`, 'error');
        return false;
    }
}

async function testMikroTikConnection() {
    try {
        log('\n🔍 Testing MikroTik Connection...', 'info');
        const { connectToMikrotik } = require('./config/mikrotik');
        
        log('⚠️  Attempting to connect to MikroTik...', 'warn');
        log('   This may take a few seconds...', 'info');
        
        const client = await connectToMikrotik();
        log('✅ MikroTik Connected Successfully', 'success');
        
        await client.close();
        return true;
    } catch (error) {
        log(`❌ MikroTik Connection Failed: ${error.message}`, 'error');
        log('   Make sure:', 'warn');
        log('   1. MikroTik router is powered on and accessible', 'warn');
        log('   2. API is enabled on the router', 'warn');
        log('   3. Correct IP, port, username, and password in .env', 'warn');
        log('   4. Firewall allows connection on port 8728', 'warn');
        return false;
    }
}

async function runAllTests() {
    log('\n═══════════════════════════════════════════════', 'info');
    log('🚀 WiFi Billing System Integration Test', 'info');
    log('═══════════════════════════════════════════════', 'info');
    
    const results = {
        healthCheck: await testHealthCheck(),
        database: await testDatabaseConnection(),
        mpesa: await testMPesaSetup(),
        macDetection: await testMACDetection(),
        networkInfo: await testNetworkInfo(),
        mikrotik: await testMikroTikConnection()
    };
    
    log('\n═══════════════════════════════════════════════', 'info');
    log('📊 TEST RESULTS SUMMARY', 'info');
    log('═══════════════════════════════════════════════', 'info');
    
    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        const color = passed ? 'success' : 'error';
        log(`${status} - ${test}`, color);
    });
    
    const allPassed = Object.values(results).every(r => r);
    
    log('\n═══════════════════════════════════════════════', 'info');
    if (allPassed) {
        log('🎉 ALL TESTS PASSED! System is ready for integration.', 'success');
    } else {
        log('⚠️  SOME TESTS FAILED. Please fix the issues above.', 'warn');
    }
    log('═══════════════════════════════════════════════\n', 'info');
    
    process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
    log(`\n❌ Test runner error: ${error.message}`, 'error');
    process.exit(1);
});
