# 🚀 WiFi Billing System - Complete Setup Guide

## 📋 Prerequisites

### Required Software
- **Node.js** (v16 or higher)
- **MySQL** (v8.0 or higher)
- **MikroTik Router** with API enabled
- **MPesa Developer Account** (Safaricom)

---

## 🗄️ Database Setup

### Step 1: Create Database
```bash
mysql -u root -p
```

```sql
CREATE DATABASE wifi_billing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wifi_billing;
```

### Step 2: Run Database Migrations
```bash
# From project root
mysql -u root -p wifi_billing < database/schema.sql
```

### Step 3: Verify Tables
```sql
SHOW TABLES;
-- Should show: admins, devices, payments, sessions

DESC payments;
DESC sessions;
DESC devices;
```

---

## ⚙️ Environment Configuration

### Step 1: Configure .env File
Your `.env` file is already configured. Verify these settings:

```env
# Database (Already set to localhost)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Hackifyoucan254
DB_NAME=wifi_billing

# MikroTik Router - UPDATE THESE!
MIKROTIK_HOST=192.168.1.1      # Your router IP
MIKROTIK_PORT=8728              # API port (default 8728)
MIKROTIK_USER=admin             # Router username
MIKROTIK_PASS=your_password     # Router password
```

---

## 🔧 MikroTik Router Configuration

### Step 1: Enable API Access
```
/ip service
set api address=0.0.0.0/0 disabled=no port=8728
```

### Step 2: Create Admin User (Optional but recommended)
```
/user add name=wifi-api password=YOUR_SECURE_PASSWORD group=full
```

### Step 3: Configure Hotspot (if not already configured)
```
/ip hotspot setup
# Follow the wizard to set up your hotspot
```

### Step 4: Test API Connection
From your server, test the connection:
```bash
curl http://localhost:5000/api/router/test
```

---

## 📱 MPesa Configuration

### Step 1: Update MPesa Callback URL
Your ngrok URL is already set:
```
MPESA_CALLBACK_URL=https://cad0-2c0f-fe38-219e-421b-7cef-92b2-1881-fead.ngrok-free.app/api/mpesa/callback
```

**Important:** Update this when your ngrok URL changes!

### Step 2: Test MPesa Integration
```bash
curl http://localhost:5000/api/mpesa/test
```

---

## 🚀 Installation & Startup

### Step 1: Install Dependencies
```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### Step 2: Build Frontend
```bash
cd frontend
npm run build
cd ..
```

### Step 3: Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Step 4: Verify Server is Running
```
✅ Server running on port 5000
✅ Database connection successful
✅ Connected to: localhost
```

---

## 🔐 Admin Access

### Default Admin Credentials
- **Username:** admin
- **Email:** robinsonotoch7@gmail.com
- **Password:** _(Use the password you set during admin creation)_

### Login URL
```
http://localhost:5000/admin
```

---

## 🧪 Testing the Complete Flow

### Test 1: Database Connection
```bash
node -e "require('./config/db').query('SELECT 1', (err, res) => console.log(err ? 'Failed' : 'Connected'))"
```

### Test 2: MikroTik Connection
```bash
curl http://localhost:5000/api/router/test
```

### Test 3: MAC Address Detection
```bash
curl http://localhost:5000/api/mac/get-mac?ip=192.168.1.100
```

### Test 4: Payment Flow (Use real phone number)
```bash
curl -X POST http://localhost:5000/api/mpesa/pay \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "254712345678",
    "amount": 10,
    "mac_address": "AA:BB:CC:DD:EE:FF"
  }'
```

---

## 📊 Package Pricing & Duration

| Package | Price | Duration | Speed | Minutes |
|---------|-------|----------|-------|---------|
| 30 mins | Ksh 1 | 30m | 2 Mbps | 30 |
| 1 Hour | Ksh 10 | 1h | 2 Mbps | 60 |
| 3 Hours | Ksh 15 | 3h | 3 Mbps | 180 |
| 6 Hours | Ksh 20 | 6h | 4 Mbps | 360 |
| 12 Hours | Ksh 25 | 12h | 5 Mbps | 720 |
| 24 Hours | Ksh 30 | 24h | 5 Mbps | 1440 |
| 2 Days | Ksh 50 | 48h | 6 Mbps | 2880 |
| 3 Days | Ksh 80 | 72h | 6 Mbps | 4320 |
| 1 Week | Ksh 200 | 168h | 6 Mbps | 10080 |
| 2 Weeks | Ksh 300 | 336h | 10 Mbps | 20160 |
| 1 Month | Ksh 500 | 720h | 10 Mbps | 43200 |

---

## 🛠️ Database Maintenance

### Expire Old Sessions (Run daily via cron)
```sql
CALL expire_old_sessions();
```

### View Active Sessions
```sql
SELECT * FROM v_active_sessions;
```

### View Revenue Summary
```sql
SELECT * FROM v_revenue_summary;
```

### Check Session by MAC Address
```sql
CALL get_session_by_mac('AA:BB:CC:DD:EE:FF');
```

---

## 🔄 Complete Payment Flow

1. **User Accesses Portal**
   - System detects MAC address
   - User selects package
   - Enters phone number

2. **Payment Initiation**
   - STK Push sent to phone
   - Payment record created (status: pending)
   - Transaction ID generated

3. **MPesa Callback**
   - Payment confirmed
   - Device registered in `devices` table
   - MAC whitelisted on MikroTik
   - Session created in `sessions` table
   - Payment status updated to 'confirmed'

4. **User Gets Access**
   - Internet access activated
   - Speed limit applied
   - Session tracked in real-time

5. **Session Management**
   - Admin can view active sessions
   - Auto-expiration after duration ends
   - Session termination available

---

## 📈 Monitoring & Administration

### View Dashboard Stats
```sql
SELECT 
    COUNT(*) as total_payments,
    SUM(CASE WHEN status='confirmed' THEN CAST(amount AS DECIMAL) ELSE 0 END) as revenue,
    COUNT(DISTINCT phone) as unique_customers
FROM payments;
```

### View Active Sessions
```sql
SELECT 
    s.mac_address,
    s.phone,
    s.duration_minutes,
    s.speed_limit,
    TIMESTAMPDIFF(MINUTE, s.session_start, NOW()) as elapsed,
    (s.duration_minutes - TIMESTAMPDIFF(MINUTE, s.session_start, NOW())) as remaining
FROM sessions s
WHERE s.status = 'active';
```

### View Recent Payments
```sql
SELECT 
    phone,
    amount,
    status,
    time_purchased,
    mpesa_receipt_number,
    created_at
FROM payments
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🚨 Troubleshooting

### Issue: Database Connection Failed
```bash
# Check MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u root -p
```

### Issue: MikroTik Connection Failed
1. Verify router IP is correct
2. Check API is enabled on router
3. Verify firewall allows port 8728
4. Test with RouterOS Winbox

### Issue: MAC Address Returns UNKNOWN_MAC
1. Ensure device is on same network
2. Run ping to populate ARP cache
3. Check network interface configuration
4. Use router's ARP table as fallback

### Issue: MPesa Callback Not Received
1. Verify ngrok is running
2. Check callback URL is correct
3. Test with MPesa sandbox
4. Check server logs for callback data

---

## 🔒 Security Recommendations

1. **Change Default Passwords**
   - Admin dashboard password
   - MikroTik router password
   - MySQL root password

2. **Update JWT Secret**
   ```env
   JWT_SECRET=generate_long_random_string_here
   ```

3. **Use Production MPesa Credentials**
   - Change `MPESA_ENV=production`
   - Update consumer key/secret
   - Use production shortcode

4. **Enable HTTPS**
   - Use SSL certificate
   - Update CORS settings
   - Force HTTPS redirects

5. **Database Security**
   - Create dedicated database user
   - Limit privileges
   - Enable SSL connections

---

## 📞 Support

For issues or questions:
- **Email:** gideonpapa9@gmail.com
- **WhatsApp:** +254756521055
- **Developer:** DrewGalowayDev

---

## ✅ System Ready Checklist

- [ ] Database created and tables migrated
- [ ] .env file configured with correct values
- [ ] MikroTik router API enabled and accessible
- [ ] MPesa credentials configured
- [ ] ngrok running with callback URL updated
- [ ] Dependencies installed (backend + frontend)
- [ ] Frontend built successfully
- [ ] Server starts without errors
- [ ] Database connection successful
- [ ] Admin can login to dashboard
- [ ] Test payment successful
- [ ] MAC address detected properly
- [ ] Session created after payment
- [ ] MikroTik whitelist working

**When all boxes are checked, your system is ready for production! 🎉**
