# 🚀 MULTI-TENANT IMPLEMENTATION GUIDE
**Step-by-Step Instructions to Convert Your System**

---

## 📋 PREREQUISITES

Before starting, ensure you have:
- ✅ Current system backed up
- ✅ Supabase database accessible
- ✅ Access to update environment variables
- ✅ 2-3 hours for full implementation

---

## 🗓️ IMPLEMENTATION TIMELINE

### **Day 1-2: Database Migration**
- Run migration script
- Update credentials
- Verify data migration

### **Day 3-4: Backend Updates**  
- Add tenant middleware to routes
- Update all database queries
- Test tenant isolation

### **Day 5-6: Frontend Updates**
- Add tenant detection
- Update API calls
- Implement branding

### **Day 7: Testing & Launch**
- Create test tenants
- End-to-end testing
- Production deployment

---

## STEP 1: DATABASE MIGRATION

### 1.1 Backup Current Database

```bash
# Create backup before migration
cd c:\Users\user\Oneal-wifi

# If using Supabase, export via dashboard:
# Settings → Database → Database Backups → Create Backup
```

### 1.2 Run Migration Script

```sql
-- In Supabase SQL Editor:
-- Copy contents of database/multi_tenant_migration.sql
-- Click "Run"
-- Wait for completion (should take 30-60 seconds)
```

### 1.3 Update Credentials

```sql
-- Update router password
UPDATE tenant_routers 
SET password = 'YOUR_REAL_MIKROTIK_PASSWORD'
WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default');

-- Update M-Pesa credentials
UPDATE tenant_payment_config
SET 
  mpesa_consumer_key = 'YOUR_CONSUMER_KEY',
  mpesa_consumer_secret = 'YOUR_CONSUMER_SECRET',
  mpesa_passkey = 'YOUR_PASSKEY'
WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default');
```

### 1.4 Verify Migration

```sql
-- Check tenants created
SELECT * FROM tenants;

-- Check data migration
SELECT 
  (SELECT COUNT(*) FROM payments WHERE tenant_id IS NOT NULL) as migrated_payments,
  (SELECT COUNT(*) FROM sessions WHERE tenant_id IS NOT NULL) as migrated_sessions,
  (SELECT COUNT(*) FROM devices WHERE tenant_id IS NOT NULL) as migrated_devices;
```

**Expected Output:**
```
✅ 1 tenant created (qonnect-default)
✅ All payments have tenant_id
✅ All sessions have tenant_id
✅ All devices have tenant_id
```

---

## STEP 2: BACKEND IMPLEMENTATION

### 2.1 Update index.js - Add Tenant Middleware

**File: `index.js`**

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import tenant middleware
const { tenantMiddleware } = require('./middleware/tenantMiddleware');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Apply tenant middleware to all routes EXCEPT super admin
app.use('/api', (req, res, next) => {
  // Skip tenant middleware for super admin routes
  if (req.path.startsWith('/super-admin')) {
    return next();
  }
  
  // Apply tenant middleware
  tenantMiddleware(req, res, next);
});

// Your existing routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/mpesa', require('./routes/mpesaRoutes'));
app.use('/api/payment', require('./routes/mpesaCallback'));
// ... rest of your routes

// NEW: Super admin routes
app.use('/api/super-admin', require('./routes/superAdminRoutes'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Multi-tenant mode: ENABLED`);
});
```

### 2.2 Update Payment Routes - Add Tenant Filtering

**File: `routes/mpesaRoutes.js`**

**BEFORE:**
```javascript
router.post('/pay', async (req, res) => {
  const { phone, amount, mac_address } = req.body;
  
  // Save payment
  const { data: payment } = await supabase
    .from('payments')
    .insert({
      phone,
      amount,
      mac_address,
      status: 'pending'
    });
});
```

**AFTER:**
```javascript
router.post('/pay', async (req, res) => {
  const { phone, amount, mac_address } = req.body;
  
  // Get tenant's M-Pesa configuration
  const { data: paymentConfig } = await supabase
    .from('tenant_payment_config')
    .select('*')
    .eq('tenant_id', req.tenantId) // 🔑 Use tenant from middleware
    .single();
  
  if (!paymentConfig || !paymentConfig.is_active) {
    return res.status(400).json({ 
      error: 'Payment gateway not configured' 
    });
  }
  
  // Use tenant's M-Pesa credentials
  const accessToken = await getAccessToken(
    paymentConfig.mpesa_consumer_key,
    paymentConfig.mpesa_consumer_secret
  );
  
  // Save payment with tenant_id
  const { data: payment } = await supabase
    .from('payments')
    .insert({
      tenant_id: req.tenantId, // 🔑 Add tenant_id
      phone,
      amount,
      mac_address,
      status: 'pending'
    });
  
  // Send STK push with tenant's credentials
  await stkPush(accessToken, paymentConfig, payment);
});
```

### 2.3 Update Callback Route - Use Tenant Router

**File: `routes/mpesaCallback.js`**

**BEFORE:**
```javascript
router.post('/callback', async (req, res) => {
  // ... process payment
  
  // Connect to router
  const client = await connectToMikrotik();
  await whitelistMAC(client, mac, duration, speed);
});
```

**AFTER:**
```javascript
router.post('/callback', async (req, res) => {
  // ... process payment
  
  // Get tenant from payment
  const { data: payment } = await supabase
    .from('payments')
    .select('*, tenant:tenants(*)')
    .eq('checkout_request_id', CheckoutRequestID)
    .single();
  
  const tenantId = payment.tenant_id;
  
  // Get tenant's active router
  const { data: routers } = await supabase
    .from('tenant_routers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .limit(1);
  
  if (!routers || routers.length === 0) {
    console.error('No router configured for tenant');
    return res.status(500).json({ error: 'Router not configured' });
  }
  
  const router = routers[0];
  
  // Connect to tenant's router
  const client = await connectToTenantRouter(router);
  await whitelistMAC(client, mac, duration, speed);
  
  // Update payment with tenant_id
  await supabase
    .from('payments')
    .update({ 
      status: 'confirmed',
      tenant_id: tenantId 
    })
    .eq('id', payment.id);
  
  // Create session for tenant
  await supabase
    .from('sessions')
    .insert({
      tenant_id: tenantId, // 🔑 Add tenant_id
      payment_id: payment.id,
      mac_address: mac,
      status: 'active'
    });
});
```

### 2.4 Update Admin Routes - Filter by Tenant

**File: `routes/admin.js`**

**BEFORE:**
```javascript
router.get('/payments', authMiddleware, async (req, res) => {
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });
  
  res.json(payments);
});
```

**AFTER:**
```javascript
router.get('/payments', authMiddleware, async (req, res) => {
  // Super admin can see all tenants
  let query = supabase.from('payments').select('*');
  
  if (!req.isSuperAdmin) {
    // Regular admin only sees their tenant's data
    query = query.eq('tenant_id', req.tenantId); // 🔑 Filter by tenant
  }
  
  const { data: payments } = await query
    .order('created_at', { ascending: false });
  
  res.json(payments);
});
```

### 2.5 Create MikroTik Helper for Tenant Routers

**File: `config/mikrotik.js`**

Add this function:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Connect to specific tenant router
const connectToTenantRouter = async (routerId, tenantId) => {
  // Get router configuration
  const { data: router, error } = await supabase
    .from('tenant_routers')
    .select('*')
    .eq('id', routerId)
    .eq('tenant_id', tenantId) // Ensure router belongs to tenant
    .single();
  
  if (error || !router) {
    throw new Error('Router not found or access denied');
  }
  
  if (router.status !== 'active') {
    throw new Error('Router is not active');
  }
  
  // Connect using router's credentials
  const client = new RouterOSClient({
    host: router.host,
    user: router.username,
    password: router.password, // Should decrypt if encrypted
    port: router.port || 8728,
    timeout: 30000
  });
  
  await client.connect();
  
  // Update last connection test
  await supabase
    .from('tenant_routers')
    .update({
      last_connection_test: new Date().toISOString(),
      last_connection_status: 'success'
    })
    .eq('id', routerId);
  
  return { client, router };
};

module.exports = {
  connectToMikrotik, // Keep existing function
  connectToTenantRouter, // New function
  whitelistMAC
};
```

---

## STEP 3: FRONTEND UPDATES

### 3.1 Add Tenant Detection Utility

**File: `frontend/src/utils/tenantDetection.js`**

```javascript
export const detectTenant = () => {
  const hostname = window.location.hostname;
  
  // Production subdomain detection
  if (hostname.includes('.myqonnectwifi.tech')) {
    const subdomain = hostname.split('.')[0];
    
    // Main domain = super admin
    if (subdomain === 'myqonnectwifi' || subdomain === 'www') {
      return { 
        type: 'super_admin', 
        code: null,
        isSuperAdmin: true 
      };
    }
    
    // Subdomain = tenant
    return { 
      type: 'tenant', 
      code: subdomain,
      isSuperAdmin: false 
    };
  }
  
  // Custom domain = tenant
  if (!hostname.includes('localhost') && 
      !hostname.includes('127.0.0.1') && 
      !hostname.includes('myqonnectwifi.tech') &&
      !hostname.includes('vercel.app')) {
    return { 
      type: 'custom_domain', 
      domain: hostname,
      isSuperAdmin: false 
    };
  }
  
  // Development mode
  return { 
    type: 'development', 
    code: 'qonnect-default',
    isSuperAdmin: false 
  };
};

export const getTenantBranding = async () => {
  try {
    const response = await fetch('/api/tenant/branding');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch tenant branding:', error);
    return {
      businessName: 'WiFi Portal',
      logoUrl: '/default-logo.png',
      primaryColor: '#6366f1'
    };
  }
};
```

### 3.2 Update API Client - Add Tenant Header

**File: `frontend/src/services/api.js`**

```javascript
import axios from 'axios';
import { detectTenant } from '../utils/tenantDetection';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

// Add tenant header to all requests
api.interceptors.request.use((config) => {
  const tenant = detectTenant();
  
  // Add tenant identifier to headers
  if (tenant.type === 'tenant' && tenant.code) {
    config.headers['X-Tenant-Code'] = tenant.code;
  } else if (tenant.type === 'custom_domain' && tenant.domain) {
    config.headers['X-Tenant-Domain'] = tenant.domain;
  } else if (tenant.type === 'development') {
    config.headers['X-Tenant-Code'] = 'qonnect-default';
  }
  
  // Add auth token
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
});

export default api;
```

### 3.3 Update User Portal - Dynamic Branding

**File: `frontend/src/pages/UserPortal.jsx`**

Add this at the top of the component:

```javascript
import { useState, useEffect } from 'react';
import { getTenantBranding } from '../utils/tenantDetection';

const UserPortal = () => {
  const [branding, setBranding] = useState({
    businessName: 'Loading...',
    logoUrl: null,
    primaryColor: '#6366f1'
  });
  
  useEffect(() => {
    // Load tenant branding
    const loadBranding = async () => {
      const data = await getTenantBranding();
      setBranding(data);
      
      // Apply theme color
      document.documentElement.style.setProperty(
        '--primary-color',
        data.primaryColor
      );
    };
    
    loadBranding();
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with dynamic branding */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          {branding.logoUrl && (
            <img 
              src={branding.logoUrl} 
              alt="Logo" 
              className="h-12"
            />
          )}
          <h1 className="text-2xl font-bold" style={{ color: branding.primaryColor }}>
            {branding.businessName}
          </h1>
        </div>
      </header>
      
      {/* Rest of your component */}
    </div>
  );
};
```

---

## STEP 4: CREATE SUPER ADMIN ROUTES

### 4.1 Create Super Admin Routes File

**File: `routes/superAdminRoutes.js`**

```javascript
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/tenantMiddleware');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// All super admin routes require authentication
router.use(authMiddleware);
router.use(requireSuperAdmin);

// Get all tenants
router.get('/tenants', async (req, res) => {
  try {
    const { data: tenants, error } = await supabase
      .from('v_tenant_statistics') // Use view with statistics
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Create new tenant
router.post('/tenants', async (req, res) => {
  try {
    const {
      tenant_code,
      business_name,
      email,
      owner_name,
      phone,
      subscription_tier
    } = req.body;
    
    // Validate required fields
    if (!tenant_code || !business_name || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }
    
    // Create tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        tenant_code,
        business_name,
        email,
        owner_name,
        phone,
        subscription_tier: subscription_tier || 'trial',
        status: 'trial',
        subscription_start_date: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      tenant,
      message: 'Tenant created successfully'
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tenant details
router.get('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        *,
        routers:tenant_routers(*),
        payment_config:tenant_payment_config(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    res.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// Update tenant
router.put('/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      tenant,
      message: 'Tenant updated successfully'
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: error.message });
  }
});

// Platform analytics
router.get('/analytics', async (req, res) => {
  try {
    // Get tenant counts
    const { data: tenantStats } = await supabase
      .from('tenants')
      .select('status, subscription_tier');
    
    // Get payment totals
    const { data: paymentStats } = await supabase
      .from('payments')
      .select('amount, status');
    
    // Calculate revenue
    const revenue = paymentStats
      ?.filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
    
    res.json({
      tenants: {
        total: tenantStats?.length || 0,
        active: tenantStats?.filter(t => t.status === 'active').length || 0,
        trial: tenantStats?.filter(t => t.status === 'trial').length || 0,
        suspended: tenantStats?.filter(t => t.status === 'suspended').length || 0
      },
      payments: {
        total: paymentStats?.length || 0,
        confirmed: paymentStats?.filter(p => p.status === 'confirmed').length || 0,
        pending: paymentStats?.filter(p => p.status === 'pending').length || 0
      },
      revenue: {
        total: revenue,
        currency: 'KES'
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
```

---

## STEP 5: DNS CONFIGURATION

### 5.1 Wildcard DNS for Subdomains

**In your domain registrar (or Vercel DNS):**

```
Type: CNAME
Name: *
Value: oneal-wifi-pfe7vc1ax-drewgalowaydevs-projects.vercel.app
TTL: 3600

Type: CNAME
Name: www
Value: oneal-wifi-pfe7vc1ax-drewgalowaydevs-projects.vercel.app
TTL: 3600
```

This allows:
- `https://myqonnectwifi.tech` → Super Admin
- `https://campus-cafe.myqonnectwifi.tech` → Campus Cafe tenant
- `https://hotel-paradise.myqonnectwifi.tech` → Hotel tenant
- `https://*.myqonnectwifi.tech` → Any tenant

---

## STEP 6: TESTING

### 6.1 Create Test Tenant

```sql
-- In Supabase SQL Editor
INSERT INTO tenants (
  tenant_code,
  business_name,
  email,
  owner_name,
  status,
  subscription_tier
) VALUES (
  'test-cafe',
  'Test Cafe WiFi',
  'test@example.com',
  'Test Owner',
  'active',
  'basic'
);

-- Create test router
INSERT INTO tenant_routers (
  tenant_id,
  name,
  host,
  username,
  password,
  status
) VALUES (
  (SELECT id FROM tenants WHERE tenant_code = 'test-cafe'),
  'Test Router',
  '192.168.2.1',
  'admin',
  'test_password',
  'active'
);

-- Create test payment config
INSERT INTO tenant_payment_config (
  tenant_id,
  mpesa_consumer_key,
  mpesa_consumer_secret,
  mpesa_shortcode,
  mpesa_passkey,
  mpesa_environment
) VALUES (
  (SELECT id FROM tenants WHERE tenant_code = 'test-cafe'),
  'test_key',
  'test_secret',
  '174379',
  'test_passkey',
  'sandbox'
);
```

### 6.2 Test Tenant Isolation

```bash
# Test with tenant header
curl -H "X-Tenant-Code: test-cafe" \
  https://your-domain.com/api/payments

# Should only return test-cafe's payments

curl -H "X-Tenant-Code: qonnect-default" \
  https://your-domain.com/api/payments

# Should only return qonnect-default's payments
```

---

## 🎉 COMPLETION CHECKLIST

- [ ] Database migration completed
- [ ] Tenant middleware implemented
- [ ] All routes updated with tenant filtering
- [ ] Frontend tenant detection added
- [ ] Super admin dashboard created
- [ ] DNS wildcard configured
- [ ] Test tenant created
- [ ] Tenant isolation verified
- [ ] Documentation updated

---

## 📞 READY TO PROCEED?

Let me know which step you'd like help with:

1. ✅ Run database migration
2. ✅ Update specific routes
3. ✅ Create super admin dashboard
4. ✅ Test tenant isolation
5. ✅ Deploy to production

**Which would you like me to help with first?**
