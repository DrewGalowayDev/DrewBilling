-- ===============================================
-- MULTI-TENANT MIGRATION SCRIPT
-- Converts single-tenant WiFi billing to multi-tenant SaaS
-- ===============================================

BEGIN;

-- ===============================================
-- 1. CREATE TENANTS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  
  -- Tenant Identity
  tenant_code VARCHAR(50) UNIQUE NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  
  -- Contact Information
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  
  -- Address
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Kenya',
  
  -- Status & Subscription
  status VARCHAR(20) CHECK (status IN ('active', 'suspended', 'trial', 'expired')) DEFAULT 'trial',
  subscription_tier VARCHAR(20) CHECK (subscription_tier IN ('free', 'basic', 'premium', 'enterprise')) DEFAULT 'free',
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  monthly_fee DECIMAL(10,2) DEFAULT 0.00,
  
  -- Branding
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#6366f1',
  secondary_color VARCHAR(7) DEFAULT '#8b5cf6',
  custom_domain VARCHAR(255),
  
  -- Limits
  max_devices INTEGER DEFAULT 100,
  max_admins INTEGER DEFAULT 5,
  max_customers INTEGER DEFAULT 1000,
  max_routers INTEGER DEFAULT 2,
  
  -- Settings (JSON)
  settings JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for tenants
CREATE INDEX idx_tenants_code ON tenants(tenant_code);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_tier ON tenants(subscription_tier);
CREATE INDEX idx_tenants_email ON tenants(email);

-- ===============================================
-- 2. CREATE TENANT_ROUTERS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS tenant_routers (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Router Identity
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  description TEXT,
  
  -- Connection Details
  host VARCHAR(100) NOT NULL,
  port INTEGER DEFAULT 8728,
  username VARCHAR(100) NOT NULL,
  password TEXT NOT NULL, -- Should be encrypted
  
  -- Router Type
  router_type VARCHAR(50) DEFAULT 'mikrotik' CHECK (router_type IN ('mikrotik', 'ubiquiti', 'tplink', 'other')),
  
  -- Status & Health
  status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'error', 'testing')) DEFAULT 'active',
  last_connection_test TIMESTAMPTZ,
  last_connection_status VARCHAR(20),
  last_error TEXT,
  uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
  
  -- Configuration
  default_speed_limit VARCHAR(20) DEFAULT '5M/5M',
  session_timeout INTEGER DEFAULT 3600,
  max_concurrent_sessions INTEGER DEFAULT 50,
  
  -- Statistics
  total_sessions INTEGER DEFAULT 0,
  total_data_used BIGINT DEFAULT 0, -- in bytes
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, host),
  CONSTRAINT valid_port CHECK (port > 0 AND port < 65536)
);

-- Indexes for tenant_routers
CREATE INDEX idx_tenant_routers_tenant ON tenant_routers(tenant_id);
CREATE INDEX idx_tenant_routers_status ON tenant_routers(status);
CREATE INDEX idx_tenant_routers_host ON tenant_routers(host);

-- ===============================================
-- 3. CREATE TENANT_PAYMENT_CONFIG TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS tenant_payment_config (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- M-Pesa Configuration
  mpesa_consumer_key TEXT NOT NULL,
  mpesa_consumer_secret TEXT NOT NULL,
  mpesa_shortcode VARCHAR(20) NOT NULL,
  mpesa_passkey TEXT NOT NULL,
  mpesa_environment VARCHAR(20) CHECK (mpesa_environment IN ('sandbox', 'production')) DEFAULT 'sandbox',
  
  -- Callback URLs (Auto-generated based on tenant)
  callback_url TEXT,
  validation_url TEXT,
  
  -- Payment Settings
  currency VARCHAR(3) DEFAULT 'KES',
  min_payment DECIMAL(10,2) DEFAULT 1.00,
  max_payment DECIMAL(10,2) DEFAULT 10000.00,
  
  -- Payment Gateway Status
  is_active BOOLEAN DEFAULT true,
  last_test_date TIMESTAMPTZ,
  last_test_status VARCHAR(20),
  last_test_error TEXT,
  
  -- Statistics
  total_transactions INTEGER DEFAULT 0,
  successful_transactions INTEGER DEFAULT 0,
  failed_transactions INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0.00,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tenant_payment_config
CREATE INDEX idx_tenant_payment_config_tenant ON tenant_payment_config(tenant_id);
CREATE INDEX idx_tenant_payment_config_active ON tenant_payment_config(is_active);

-- ===============================================
-- 4. ADD TENANT_ID TO EXISTING TABLES
-- ===============================================

-- Add tenant_id column to all existing tables
ALTER TABLE admins ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE network_stats ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;

-- Update admins table for multi-tenant roles
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(20) CHECK (role IN ('super_admin', 'tenant_admin', 'tenant_operator')) DEFAULT 'tenant_admin';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- ===============================================
-- 5. CREATE INDEXES FOR TENANT FILTERING
-- ===============================================

-- Single column indexes
CREATE INDEX IF NOT EXISTS idx_admins_tenant ON admins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_packages_tenant ON packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_tenant ON vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_network_stats_tenant ON network_stats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refunds_tenant ON refunds(tenant_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status ON payments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_created ON payments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_active ON sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_devices_tenant_mac ON devices(tenant_id, mac_address);
CREATE INDEX IF NOT EXISTS idx_devices_tenant_status ON devices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone);

-- ===============================================
-- 6. CREATE DEFAULT TENANT
-- ===============================================

-- Insert default tenant for existing data
INSERT INTO tenants (
  tenant_code,
  business_name,
  email,
  owner_name,
  phone,
  status,
  subscription_tier,
  subscription_start_date,
  max_devices,
  max_admins,
  max_customers
) VALUES (
  'qonnect-default',
  'Qonnect WiFi',
  'admin@myqonnectwifi.tech',
  'Admin',
  '+254700000000',
  'active',
  'premium',
  NOW(),
  1000,
  10,
  5000
) ON CONFLICT (tenant_code) DO NOTHING;

-- ===============================================
-- 7. MIGRATE EXISTING DATA TO DEFAULT TENANT
-- ===============================================

-- Update all existing records with default tenant_id
UPDATE admins 
SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default')
WHERE tenant_id IS NULL;

UPDATE payments 
SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default')
WHERE tenant_id IS NULL;

UPDATE sessions 
SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default')
WHERE tenant_id IS NULL;

UPDATE devices 
SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default')
WHERE tenant_id IS NULL;

UPDATE customers 
SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default')
WHERE tenant_id IS NULL;

UPDATE packages 
SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default')
WHERE tenant_id IS NULL;

UPDATE vouchers 
SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default')
WHERE tenant_id IS NULL;

UPDATE audit_logs 
SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default')
WHERE tenant_id IS NULL;

UPDATE notifications 
SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default')
WHERE tenant_id IS NULL;

UPDATE network_stats 
SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default')
WHERE tenant_id IS NULL;

UPDATE refunds 
SET tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default')
WHERE tenant_id IS NULL;

-- ===============================================
-- 8. CREATE DEFAULT ROUTER CONFIGURATION
-- ===============================================

INSERT INTO tenant_routers (
  tenant_id,
  name,
  location,
  host,
  port,
  username,
  password,
  status,
  router_type
) VALUES (
  (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default'),
  'Main Router',
  'Primary Location',
  '192.168.1.1',
  8728,
  'admin',
  'CHANGE_THIS_PASSWORD', -- ⚠️ UPDATE WITH REAL PASSWORD
  'active',
  'mikrotik'
) ON CONFLICT (tenant_id, host) DO NOTHING;

-- ===============================================
-- 9. CREATE DEFAULT PAYMENT CONFIGURATION
-- ===============================================

INSERT INTO tenant_payment_config (
  tenant_id,
  mpesa_consumer_key,
  mpesa_consumer_secret,
  mpesa_shortcode,
  mpesa_passkey,
  mpesa_environment,
  callback_url,
  validation_url,
  is_active
) VALUES (
  (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default'),
  'YOUR_MPESA_CONSUMER_KEY', -- ⚠️ UPDATE THIS
  'YOUR_MPESA_CONSUMER_SECRET', -- ⚠️ UPDATE THIS
  '174379',
  'YOUR_MPESA_PASSKEY', -- ⚠️ UPDATE THIS
  'sandbox',
  'https://oneal-wifi-pfe7vc1ax-drewgalowaydevs-projects.vercel.app/api/payment/callback',
  'https://oneal-wifi-pfe7vc1ax-drewgalowaydevs-projects.vercel.app/api/payment/validation',
  true
) ON CONFLICT (tenant_id) DO NOTHING;

-- ===============================================
-- 10. CREATE SUPER ADMIN USER
-- ===============================================

-- Update first admin to super_admin role
UPDATE admins 
SET role = 'super_admin',
    permissions = '{"can_manage_tenants": true, "can_view_all_analytics": true, "can_manage_subscriptions": true}'::jsonb
WHERE id = 1;

-- ===============================================
-- 11. CREATE AUDIT TRIGGERS FOR TENANT TABLES
-- ===============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to tenant tables
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at 
BEFORE UPDATE ON tenants 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_routers_updated_at ON tenant_routers;
CREATE TRIGGER update_tenant_routers_updated_at 
BEFORE UPDATE ON tenant_routers 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_payment_config_updated_at ON tenant_payment_config;
CREATE TRIGGER update_tenant_payment_config_updated_at 
BEFORE UPDATE ON tenant_payment_config 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 12. CREATE USEFUL VIEWS
-- ===============================================

-- View: Active tenants with statistics
CREATE OR REPLACE VIEW v_tenant_statistics AS
SELECT 
  t.id,
  t.tenant_code,
  t.business_name,
  t.status,
  t.subscription_tier,
  COUNT(DISTINCT p.id) as total_payments,
  COUNT(DISTINCT CASE WHEN p.status = 'confirmed' THEN p.id END) as successful_payments,
  COALESCE(SUM(CASE WHEN p.status = 'confirmed' THEN p.amount::numeric END), 0) as total_revenue,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT d.id) as total_devices,
  COUNT(DISTINCT c.id) as total_customers,
  COUNT(DISTINCT tr.id) as total_routers
FROM tenants t
LEFT JOIN payments p ON p.tenant_id = t.id
LEFT JOIN sessions s ON s.tenant_id = t.id
LEFT JOIN devices d ON d.tenant_id = t.id
LEFT JOIN customers c ON c.tenant_id = t.id
LEFT JOIN tenant_routers tr ON tr.tenant_id = t.id
GROUP BY t.id, t.tenant_code, t.business_name, t.status, t.subscription_tier;

-- View: Router health status
CREATE OR REPLACE VIEW v_router_health AS
SELECT 
  tr.id,
  tr.tenant_id,
  t.business_name,
  tr.name as router_name,
  tr.host,
  tr.status,
  tr.last_connection_test,
  tr.last_connection_status,
  tr.uptime_percentage,
  COUNT(s.id) as active_sessions
FROM tenant_routers tr
JOIN tenants t ON t.id = tr.tenant_id
LEFT JOIN sessions s ON s.tenant_id = tr.tenant_id AND s.status = 'active'
GROUP BY tr.id, tr.tenant_id, t.business_name, tr.name, tr.host, 
         tr.status, tr.last_connection_test, tr.last_connection_status, tr.uptime_percentage;

COMMIT;

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- Show all tenants
SELECT '✅ Tenants Created:' as status;
SELECT id, tenant_code, business_name, status, subscription_tier FROM tenants;

-- Show tenant routers
SELECT '✅ Routers Configured:' as status;
SELECT id, tenant_id, name, host, status FROM tenant_routers;

-- Show payment configs
SELECT '✅ Payment Configs:' as status;
SELECT id, tenant_id, mpesa_shortcode, mpesa_environment, is_active FROM tenant_payment_config;

-- Show record counts per tenant
SELECT '✅ Record Migration Summary:' as status;
SELECT 
  'Admins' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END) as migrated_records
FROM admins
UNION ALL
SELECT 
  'Payments',
  COUNT(*),
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END)
FROM payments
UNION ALL
SELECT 
  'Sessions',
  COUNT(*),
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END)
FROM sessions
UNION ALL
SELECT 
  'Devices',
  COUNT(*),
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END)
FROM devices
UNION ALL
SELECT 
  'Customers',
  COUNT(*),
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END)
FROM customers
UNION ALL
SELECT 
  'Packages',
  COUNT(*),
  COUNT(CASE WHEN tenant_id IS NOT NULL THEN 1 END)
FROM packages;

SELECT '✅ Multi-tenant migration complete!' as status;
SELECT 'ℹ️  IMPORTANT: Update credentials in tenant_routers and tenant_payment_config tables' as reminder;
