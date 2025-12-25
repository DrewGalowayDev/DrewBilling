# 🌍 MULTI-TENANT WIFI BILLING SYSTEM
**Comprehensive Architecture for Multiple Clients & Locations**

---

## 📋 EXECUTIVE SUMMARY

Your requirement: **Multiple clients in different locations using the same billing system simultaneously**

This is called **Multi-Tenancy** - where one application instance serves multiple independent customers (tenants), each with their own:
- Router configuration
- Payment settings
- User database
- Branding
- Admin access
- Reports & analytics

**Solution Overview**: Transform your current single-tenant system into a multi-tenant SaaS platform.

---

## 🎯 USE CASE SCENARIOS

### Scenario 1: WiFi Franchise Model
```
You (Super Admin)
├── Client A: "Campus Cafe WiFi" (Nairobi)
│   ├── 1 MikroTik Router (192.168.1.1)
│   ├── M-Pesa Shortcode: 174379
│   ├── Admin: cafe@example.com
│   └── 50 active customers
├── Client B: "Hotel Paradise WiFi" (Mombasa)
│   ├── 1 MikroTik Router (192.168.2.1)
│   ├── M-Pesa Shortcode: 600100
│   ├── Admin: hotel@example.com
│   └── 200 active customers
└── Client C: "Airport Lounge WiFi" (Kisumu)
    ├── 2 MikroTik Routers (192.168.3.1 + 192.168.3.2)
    ├── M-Pesa Shortcode: 888000
    ├── Admin: lounge@example.com
    └── 500 active customers
```

### Scenario 2: Reseller/White Label Model
```
You (Platform Owner)
├── Reseller A: Runs their own WiFi business
│   ├── Custom domain: wifi.resellerA.com
│   ├── Custom branding (logo, colors)
│   ├── 5 different locations
│   └── Independent payment collection
├── Reseller B: Runs their own WiFi business
│   ├── Custom domain: hotspot.resellerB.co.ke
│   ├── Custom branding
│   ├── 10 different locations
│   └── Independent payment collection
```

### Scenario 3: Multi-Location Single Business
```
Your Business: "QonnectWiFi"
├── Location 1: Nairobi Branch
│   ├── Router: 192.168.10.1
│   └── 100 customers
├── Location 2: Mombasa Branch
│   ├── Router: 192.168.20.1
│   └── 150 customers
├── Location 3: Kisumu Branch
│   ├── Router: 192.168.30.1
│   └── 80 customers
└── Centralized management, payments, reporting
```

---

## 🏗️ ARCHITECTURE OPTIONS

### Option 1: SINGLE DATABASE - TENANT ISOLATION (Recommended for Start)

**How it works:**
- One central database
- Every table has a `tenant_id` column
- All queries filter by `tenant_id`
- Shared infrastructure, isolated data

**Pros:**
- ✅ Cost-effective (one database)
- ✅ Easy to maintain and update
- ✅ Centralized backups
- ✅ Cross-tenant analytics possible

**Cons:**
- ⚠️ One security breach = all tenants at risk
- ⚠️ Complex query filtering
- ⚠️ Limited customization per tenant

**Best for:** 10-100 clients, standard features

---

### Option 2: MULTI DATABASE - DATABASE PER TENANT

**How it works:**
- Each tenant gets their own database
- Central "master" database tracks tenants
- Complete data isolation
- Independent scaling per tenant

**Pros:**
- ✅ Maximum security (isolated data)
- ✅ Easy to backup/restore per tenant
- ✅ Can customize schema per tenant
- ✅ Better performance (smaller databases)

**Cons:**
- ⚠️ Higher costs (multiple databases)
- ⚠️ Complex deployment
- ⚠️ Updates must run on all databases

**Best for:** 5-20 large clients, high security requirements

---

### Option 3: HYBRID - SHARED + ISOLATED

**How it works:**
- Shared database for common data (packages, system settings)
- Separate databases for tenant-specific data (payments, sessions)
- Best of both worlds

**Pros:**
- ✅ Balanced cost vs security
- ✅ Shared tables reduce duplication
- ✅ Critical data isolated

**Cons:**
- ⚠️ Most complex to implement
- ⚠️ Cross-database queries needed

**Best for:** Enterprise clients with specific compliance needs

---

## 💾 DATABASE SCHEMA CHANGES (Option 1 - Recommended)

### New Tables Required

#### 1. `tenants` - Master Tenant Registry
```sql
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  
  -- Tenant Identity
  tenant_code VARCHAR(50) UNIQUE NOT NULL, -- 'campus-cafe', 'hotel-paradise'
  business_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  
  -- Contact
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  
  -- Address
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Kenya',
  
  -- Status
  status VARCHAR(20) CHECK (status IN ('active', 'suspended', 'trial', 'expired')) DEFAULT 'trial',
  subscription_tier VARCHAR(20) CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise')) DEFAULT 'free',
  
  -- Billing
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  monthly_fee DECIMAL(10,2) DEFAULT 0.00,
  
  -- Branding
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#6366f1',
  custom_domain VARCHAR(255),
  
  -- Limits
  max_devices INTEGER DEFAULT 100,
  max_admins INTEGER DEFAULT 5,
  max_customers INTEGER DEFAULT 1000,
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ
);

CREATE INDEX idx_tenants_code ON tenants(tenant_code);
CREATE INDEX idx_tenants_status ON tenants(status);
```

#### 2. `tenant_routers` - Router Configuration Per Tenant
```sql
CREATE TABLE tenant_routers (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Router Identity
  name VARCHAR(100) NOT NULL, -- 'Main Router', 'Floor 2 Router'
  location VARCHAR(255), -- 'Building A, Floor 1'
  
  -- Connection Details
  host VARCHAR(100) NOT NULL, -- IP address
  port INTEGER DEFAULT 8728,
  username VARCHAR(100) NOT NULL,
  password TEXT NOT NULL, -- Encrypted
  
  -- Status
  status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'error')) DEFAULT 'active',
  last_connection_test TIMESTAMPTZ,
  last_connection_status VARCHAR(20),
  
  -- Settings
  default_speed_limit VARCHAR(20) DEFAULT '5M/5M',
  session_timeout INTEGER DEFAULT 3600, -- seconds
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, host)
);

CREATE INDEX idx_tenant_routers_tenant ON tenant_routers(tenant_id);
CREATE INDEX idx_tenant_routers_status ON tenant_routers(status);
```

#### 3. `tenant_payment_config` - M-Pesa Config Per Tenant
```sql
CREATE TABLE tenant_payment_config (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- M-Pesa Configuration
  mpesa_consumer_key TEXT NOT NULL, -- Encrypted
  mpesa_consumer_secret TEXT NOT NULL, -- Encrypted
  mpesa_shortcode VARCHAR(20) NOT NULL,
  mpesa_passkey TEXT NOT NULL, -- Encrypted
  mpesa_environment VARCHAR(20) CHECK (mpesa_environment IN ('sandbox', 'production')) DEFAULT 'sandbox',
  
  -- Callback URL (auto-generated)
  callback_url TEXT,
  validation_url TEXT,
  
  -- Settings
  currency VARCHAR(3) DEFAULT 'KES',
  min_payment DECIMAL(10,2) DEFAULT 1.00,
  max_payment DECIMAL(10,2) DEFAULT 10000.00,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_test_date TIMESTAMPTZ,
  last_test_status VARCHAR(20),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. Update Existing Tables - Add `tenant_id`

```sql
-- Add tenant_id to all major tables
ALTER TABLE admins ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE devices ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE packages ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE vouchers ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;

-- Create indexes for tenant filtering
CREATE INDEX idx_admins_tenant ON admins(tenant_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX idx_devices_tenant ON devices(tenant_id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_packages_tenant ON packages(tenant_id);
CREATE INDEX idx_vouchers_tenant ON vouchers(tenant_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);

-- Add composite indexes for common queries
CREATE INDEX idx_payments_tenant_status ON payments(tenant_id, status);
CREATE INDEX idx_sessions_tenant_active ON sessions(tenant_id, status);
CREATE INDEX idx_devices_tenant_mac ON devices(tenant_id, mac_address);
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Role Hierarchy

```
1. Super Admin (You)
   ├── Can access ALL tenants
   ├── Can create/delete tenants
   ├── Can view platform-wide analytics
   ├── Can manage subscriptions
   └── Cannot be deleted

2. Tenant Admin (Client)
   ├── Can only access their tenant data
   ├── Can manage their admins
   ├── Can configure their router
   ├── Can view their analytics
   └── Cannot see other tenants

3. Tenant Operator (Staff)
   ├── Can only access their tenant data
   ├── Can view payments
   ├── Can manage sessions
   └── Limited settings access

4. Customer (End User)
   ├── Can only see their payment history
   ├── Can view their active sessions
   └── No admin access
```

### Updated Admin Schema

```sql
ALTER TABLE admins 
  ADD COLUMN role VARCHAR(20) CHECK (role IN ('super_admin', 'tenant_admin', 'tenant_operator')) DEFAULT 'tenant_admin',
  ADD COLUMN permissions JSONB DEFAULT '{}';

-- Example permissions JSON:
{
  "can_view_dashboard": true,
  "can_manage_payments": true,
  "can_manage_packages": true,
  "can_manage_devices": true,
  "can_manage_customers": true,
  "can_manage_sessions": true,
  "can_manage_vouchers": false,
  "can_view_analytics": true,
  "can_manage_settings": false,
  "can_manage_admins": false
}
```

---

## 🔧 BACKEND CODE CHANGES

### 1. Tenant Context Middleware

```javascript
// middleware/tenantMiddleware.js
const { createClient } = require('@supabase/supabase-js');

const tenantMiddleware = async (req, res, next) => {
  try {
    // Extract tenant from subdomain, header, or token
    const tenantCode = 
      req.headers['x-tenant-code'] || 
      req.subdomain || // campus-cafe.myqonnectwifi.tech
      req.user?.tenant_code; // From JWT token
    
    if (!tenantCode) {
      return res.status(400).json({ error: 'Tenant not specified' });
    }
    
    // Fetch tenant from database
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('tenant_code', tenantCode)
      .single();
    
    if (error || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Check tenant status
    if (tenant.status !== 'active') {
      return res.status(403).json({ 
        error: 'Tenant account is suspended or expired',
        status: tenant.status 
      });
    }
    
    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant.id;
    
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({ error: 'Tenant resolution failed' });
  }
};

module.exports = tenantMiddleware;
```

### 2. Update All Database Queries

**BEFORE (Single Tenant):**
```javascript
// Get all payments
const { data: payments } = await supabase
  .from('payments')
  .select('*')
  .order('created_at', { ascending: false });
```

**AFTER (Multi-Tenant):**
```javascript
// Get payments for current tenant only
const { data: payments } = await supabase
  .from('payments')
  .select('*')
  .eq('tenant_id', req.tenantId) // CRITICAL: Filter by tenant
  .order('created_at', { ascending: false });
```

### 3. Updated MikroTik Connection

```javascript
// config/mikrotik.js
const connectToTenantRouter = async (routerId, tenantId) => {
  // Get router configuration from database
  const { data: router, error } = await supabase
    .from('tenant_routers')
    .select('*')
    .eq('id', routerId)
    .eq('tenant_id', tenantId) // Ensure router belongs to tenant
    .single();
  
  if (error || !router) {
    throw new Error('Router not found or access denied');
  }
  
  // Decrypt password
  const password = decrypt(router.password);
  
  // Connect to router
  const client = new RouterOSClient({
    host: router.host,
    user: router.username,
    password: password,
    port: router.port || 8728,
    timeout: 30000
  });
  
  await client.connect();
  return client;
};
```

### 4. Updated M-Pesa Callback

```javascript
// routes/mpesaCallback.js
router.post('/callback', async (req, res) => {
  try {
    const callbackData = req.body?.Body?.stkCallback;
    const CheckoutRequestID = callbackData?.CheckoutRequestID;
    
    // Find payment and get tenant_id
    const { data: payment } = await supabase
      .from('payments')
      .select('*, tenant:tenants(*)')
      .eq('checkout_request_id', CheckoutRequestID)
      .single();
    
    if (!payment) {
      console.error('Payment not found');
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const tenantId = payment.tenant_id;
    
    // Get tenant's router configuration
    const { data: routers } = await supabase
      .from('tenant_routers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(1);
    
    if (!routers || routers.length === 0) {
      console.error('No active router found for tenant');
      return res.status(500).json({ error: 'Router not configured' });
    }
    
    const router = routers[0];
    
    // Connect to tenant's router and whitelist MAC
    const client = await connectToTenantRouter(router.id, tenantId);
    await whitelistMAC(client, payment.mac_address, duration, speed);
    
    // Update payment with tenant_id
    await supabase
      .from('payments')
      .update({ 
        status: 'confirmed',
        tenant_id: tenantId // Ensure tenant_id is set
      })
      .eq('id', payment.id);
    
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
});
```

---

## 🌐 FRONTEND CHANGES

### 1. Subdomain-Based Tenant Access

**URL Structure:**
```
https://myqonnectwifi.tech              → Super Admin Dashboard
https://campus-cafe.myqonnectwifi.tech  → Campus Cafe Admin
https://hotel-paradise.myqonnectwifi.tech → Hotel Admin
https://airport-lounge.myqonnectwifi.tech → Airport Admin
```

**DNS Configuration (Wildcard):**
```
Type: CNAME
Name: *
Value: oneal-wifi-pfe7vc1ax-drewgalowaydevs-projects.vercel.app
TTL: 3600
```

### 2. Tenant Detection in Frontend

```javascript
// frontend/src/utils/tenantDetection.js
export const detectTenant = () => {
  const hostname = window.location.hostname;
  
  // Check for subdomain
  if (hostname.includes('.myqonnectwifi.tech')) {
    const subdomain = hostname.split('.')[0];
    
    // Main domain = super admin
    if (subdomain === 'myqonnectwifi' || subdomain === 'www') {
      return { type: 'super_admin', code: null };
    }
    
    // Subdomain = tenant
    return { type: 'tenant', code: subdomain };
  }
  
  // Custom domain = tenant
  if (hostname !== 'localhost' && !hostname.includes('myqonnectwifi')) {
    return { type: 'custom_domain', domain: hostname };
  }
  
  // Localhost = development
  return { type: 'development', code: null };
};
```

### 3. Tenant-Aware API Calls

```javascript
// frontend/src/services/api.js
import axios from 'axios';
import { detectTenant } from '../utils/tenantDetection';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

// Add tenant header to all requests
api.interceptors.request.use((config) => {
  const tenant = detectTenant();
  
  if (tenant.type === 'tenant') {
    config.headers['X-Tenant-Code'] = tenant.code;
  } else if (tenant.type === 'custom_domain') {
    config.headers['X-Tenant-Domain'] = tenant.domain;
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

### 4. Dynamic Branding

```javascript
// frontend/src/components/TenantBranding.jsx
import { useEffect, useState } from 'react';
import api from '../services/api';

export const useTenantBranding = () => {
  const [branding, setBranding] = useState({
    businessName: 'QonnectWiFi',
    logoUrl: '/default-logo.png',
    primaryColor: '#6366f1',
  });
  
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { data } = await api.get('/tenant/branding');
        setBranding(data);
        
        // Apply theme color
        document.documentElement.style.setProperty(
          '--primary-color',
          data.primaryColor
        );
      } catch (error) {
        console.error('Failed to fetch branding:', error);
      }
    };
    
    fetchBranding();
  }, []);
  
  return branding;
};
```

---

## 💰 PRICING & SUBSCRIPTION MODEL

### Subscription Tiers

| Feature | Free | Basic | Premium | Enterprise |
|---------|------|-------|---------|------------|
| **Price (Monthly)** | KES 0 | KES 5,000 | KES 15,000 | Custom |
| **Max Devices** | 50 | 200 | 1,000 | Unlimited |
| **Max Admins** | 1 | 3 | 10 | Unlimited |
| **Routers** | 1 | 2 | 5 | Unlimited |
| **Custom Branding** | ❌ | ✅ | ✅ | ✅ |
| **Custom Domain** | ❌ | ❌ | ✅ | ✅ |
| **API Access** | ❌ | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ | ✅ |
| **White Label** | ❌ | ❌ | ❌ | ✅ |
| **Analytics Export** | ❌ | ✅ | ✅ | ✅ |

### Revenue Calculation

```javascript
// Super Admin Dashboard - Monthly Revenue
const calculatePlatformRevenue = async () => {
  const { data: tenants } = await supabase
    .from('tenants')
    .select('subscription_tier, monthly_fee')
    .eq('status', 'active');
  
  const revenue = {
    free: tenants.filter(t => t.subscription_tier === 'free').length * 0,
    basic: tenants.filter(t => t.subscription_tier === 'basic').length * 5000,
    premium: tenants.filter(t => t.subscription_tier === 'premium').length * 15000,
    enterprise: tenants.filter(t => t.subscription_tier === 'enterprise')
      .reduce((sum, t) => sum + t.monthly_fee, 0),
  };
  
  return {
    total: Object.values(revenue).reduce((a, b) => a + b, 0),
    breakdown: revenue
  };
};
```

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Database Migration (1-2 Days)
1. ✅ Create `tenants` table
2. ✅ Create `tenant_routers` table
3. ✅ Create `tenant_payment_config` table
4. ✅ Add `tenant_id` to all existing tables
5. ✅ Create migration script
6. ✅ Migrate existing data (create default tenant)

### Phase 2: Backend Multi-Tenancy (3-4 Days)
1. ✅ Create tenant middleware
2. ✅ Update all database queries to filter by `tenant_id`
3. ✅ Create tenant management API
4. ✅ Update MikroTik connection to use tenant routers
5. ✅ Update M-Pesa callback to use tenant config
6. ✅ Add tenant validation to all routes

### Phase 3: Frontend Updates (2-3 Days)
1. ✅ Implement tenant detection (subdomain/domain)
2. ✅ Add tenant header to API calls
3. ✅ Create super admin dashboard
4. ✅ Create tenant onboarding flow
5. ✅ Implement dynamic branding

### Phase 4: Super Admin Features (2-3 Days)
1. ✅ Tenant creation/management
2. ✅ Subscription management
3. ✅ Platform-wide analytics
4. ✅ Tenant usage monitoring
5. ✅ Billing & invoicing

### Phase 5: Testing & Deployment (2-3 Days)
1. ✅ Test tenant isolation
2. ✅ Test subdomain routing
3. ✅ Test multi-router support
4. ✅ Load testing
5. ✅ Security audit
6. ✅ Deploy to production

**Total Timeline: 10-15 Days**

---

## 🛠️ QUICK START MIGRATION SCRIPT

I'll create a migration script to add multi-tenancy to your existing system:

```sql
-- File: database/multi_tenant_migration.sql

BEGIN;

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  tenant_code VARCHAR(50) UNIQUE NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Kenya',
  status VARCHAR(20) CHECK (status IN ('active', 'suspended', 'trial', 'expired')) DEFAULT 'trial',
  subscription_tier VARCHAR(20) CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise')) DEFAULT 'free',
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  monthly_fee DECIMAL(10,2) DEFAULT 0.00,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#6366f1',
  custom_domain VARCHAR(255),
  max_devices INTEGER DEFAULT 100,
  max_admins INTEGER DEFAULT 5,
  max_customers INTEGER DEFAULT 1000,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ
);

-- 2. Create tenant_routers table
CREATE TABLE IF NOT EXISTS tenant_routers (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  host VARCHAR(100) NOT NULL,
  port INTEGER DEFAULT 8728,
  username VARCHAR(100) NOT NULL,
  password TEXT NOT NULL,
  status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'error')) DEFAULT 'active',
  last_connection_test TIMESTAMPTZ,
  last_connection_status VARCHAR(20),
  default_speed_limit VARCHAR(20) DEFAULT '5M/5M',
  session_timeout INTEGER DEFAULT 3600,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, host)
);

-- 3. Create tenant_payment_config table
CREATE TABLE IF NOT EXISTS tenant_payment_config (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  mpesa_consumer_key TEXT NOT NULL,
  mpesa_consumer_secret TEXT NOT NULL,
  mpesa_shortcode VARCHAR(20) NOT NULL,
  mpesa_passkey TEXT NOT NULL,
  mpesa_environment VARCHAR(20) CHECK (mpesa_environment IN ('sandbox', 'production')) DEFAULT 'sandbox',
  callback_url TEXT,
  validation_url TEXT,
  currency VARCHAR(3) DEFAULT 'KES',
  min_payment DECIMAL(10,2) DEFAULT 1.00,
  max_payment DECIMAL(10,2) DEFAULT 10000.00,
  is_active BOOLEAN DEFAULT true,
  last_test_date TIMESTAMPTZ,
  last_test_status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add tenant_id to existing tables
ALTER TABLE admins ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(tenant_code);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenant_routers_tenant ON tenant_routers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admins_tenant ON admins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_packages_tenant ON packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status ON payments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_active ON sessions(tenant_id, status);

-- 6. Create default tenant from existing data
INSERT INTO tenants (
  tenant_code,
  business_name,
  email,
  owner_name,
  status,
  subscription_tier,
  subscription_start_date
) VALUES (
  'qonnect-default',
  'Qonnect WiFi',
  'admin@myqonnectwifi.tech',
  'Admin',
  'active',
  'premium',
  NOW()
) ON CONFLICT (tenant_code) DO NOTHING;

-- 7. Update existing records with default tenant_id
UPDATE admins SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default') WHERE tenant_id IS NULL;
UPDATE payments SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default') WHERE tenant_id IS NULL;
UPDATE sessions SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default') WHERE tenant_id IS NULL;
UPDATE devices SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default') WHERE tenant_id IS NULL;
UPDATE customers SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default') WHERE tenant_id IS NULL;
UPDATE packages SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default') WHERE tenant_id IS NULL;
UPDATE vouchers SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default') WHERE tenant_id IS NULL;
UPDATE audit_logs SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default') WHERE tenant_id IS NULL;

-- 8. Create default router configuration
INSERT INTO tenant_routers (
  tenant_id,
  name,
  host,
  username,
  password,
  status
) VALUES (
  (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default'),
  'Main Router',
  '192.168.1.1',
  'admin',
  'your_mikrotik_password', -- UPDATE THIS
  'active'
) ON CONFLICT (tenant_id, host) DO NOTHING;

-- 9. Create default payment config
INSERT INTO tenant_payment_config (
  tenant_id,
  mpesa_consumer_key,
  mpesa_consumer_secret,
  mpesa_shortcode,
  mpesa_passkey,
  mpesa_environment
) VALUES (
  (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default'),
  'your_consumer_key', -- UPDATE THIS
  'your_consumer_secret', -- UPDATE THIS
  '174379',
  'your_passkey', -- UPDATE THIS
  'sandbox'
) ON CONFLICT (tenant_id) DO NOTHING;

COMMIT;

-- Verification
SELECT 'Multi-tenant migration complete!' as status;
SELECT * FROM tenants;
SELECT * FROM tenant_routers;
```

---

## 📊 SUPER ADMIN DASHBOARD FEATURES

### Platform Overview
```
┌─────────────────────────────────────────┐
│  Platform Analytics                     │
├─────────────────────────────────────────┤
│  Total Tenants: 15                      │
│  Active: 12  │  Trial: 2  │  Suspended: 1│
│                                         │
│  Monthly Revenue: KES 180,000           │
│  This Month: +KES 25,000 (16% ↑)       │
│                                         │
│  Total Customers: 3,247                 │
│  Total Payments: 15,832                 │
│  Total Sessions: 45,128                 │
└─────────────────────────────────────────┘
```

### Tenant Management
- List all tenants with status
- Create new tenant
- Edit tenant settings
- Suspend/activate tenant
- View tenant usage statistics
- Manage subscriptions
- Generate invoices

### Platform Monitoring
- System health dashboard
- Database performance
- API response times
- Error logs
- Payment gateway status
- Router connectivity status

---

## 🔒 SECURITY CONSIDERATIONS

### 1. Tenant Isolation
```javascript
// CRITICAL: Always filter by tenant_id
const getPayments = async (req, res) => {
  // ✅ CORRECT
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('tenant_id', req.tenantId);
  
  // ❌ WRONG - Security vulnerability
  const { data } = await supabase
    .from('payments')
    .select('*');
  // This would expose all tenant data!
};
```

### 2. Router Access Control
```javascript
// Ensure admin can only access their tenant's routers
const getRouter = async (req, res) => {
  const { routerId } = req.params;
  
  const { data: router } = await supabase
    .from('tenant_routers')
    .select('*')
    .eq('id', routerId)
    .eq('tenant_id', req.tenantId) // CRITICAL
    .single();
  
  if (!router) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Now safe to use router
};
```

### 3. Payment Config Security
- Encrypt M-Pesa credentials at rest
- Use environment-specific encryption keys
- Never log sensitive credentials
- Rotate keys periodically

---

## 💡 RECOMMENDED NEXT STEPS

### Option A: Full Multi-Tenancy (Recommended)
**Best for:** You want to serve multiple independent clients

1. Run the migration script (add tenant tables)
2. Update backend to filter by `tenant_id`
3. Implement subdomain routing
4. Create super admin dashboard
5. Launch with 2-3 pilot tenants

**Timeline:** 10-15 days  
**Cost:** Development time only (no infrastructure cost)  
**ROI:** Monthly recurring revenue from tenants

### Option B: Multi-Location Single Tenant
**Best for:** You have multiple locations but one business

1. Add `location_id` to relevant tables
2. Create `locations` table
3. Link routers to locations
4. Create location-based reporting

**Timeline:** 3-5 days  
**Cost:** Minimal  
**ROI:** Better management of multiple branches

### Option C: Hybrid Approach
**Best for:** You want flexibility

1. Implement Option A structure
2. Your first tenant is your own business with multiple locations
3. Later expand to external clients

**Timeline:** Same as Option A  
**Benefit:** Future-proof architecture

---

## 📞 DECISION MATRIX

| Requirement | Option A | Option B | Option C |
|-------------|----------|----------|----------|
| Multiple independent clients | ✅ | ❌ | ✅ |
| Multiple locations | ✅ | ✅ | ✅ |
| White-label capability | ✅ | ❌ | ✅ |
| Recurring revenue potential | ✅ | ❌ | ✅ |
| Development complexity | High | Low | High |
| Maintenance complexity | Medium | Low | Medium |
| Scalability | Excellent | Good | Excellent |

---

## 🎯 MY RECOMMENDATION

Based on your question "**multiple clients who want to use this system at once from different locations**", I recommend:

### **OPTION A: Full Multi-Tenancy Architecture**

**Why:**
1. ✅ Serves unlimited clients from different locations
2. ✅ Each client has independent configuration
3. ✅ Generates monthly recurring revenue
4. ✅ Scales infinitely (add tenants without code changes)
5. ✅ Clients can use custom domains
6. ✅ Future-proof architecture

**Implementation Priority:**
1. **Week 1**: Database migration + backend multi-tenancy
2. **Week 2**: Super admin dashboard + tenant management
3. **Week 3**: Subdomain routing + dynamic branding
4. **Week 4**: Testing + pilot launch with 2-3 tenants

**Expected Revenue (After 6 Months):**
- 10 Basic tenants: KES 50,000/month
- 5 Premium tenants: KES 75,000/month
- **Total: KES 125,000/month**

---

## 📝 NEXT ACTIONS

Ready to proceed? I can help you with:

1. ✅ Run the database migration script
2. ✅ Create tenant middleware
3. ✅ Update all backend routes for multi-tenancy
4. ✅ Create super admin dashboard
5. ✅ Implement subdomain routing

**Which would you like me to start with?**
