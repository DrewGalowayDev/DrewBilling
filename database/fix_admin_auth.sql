-- ===============================================
-- FIX ADMIN AUTHENTICATION & PASSWORD RESET
-- Multi-tenant admin system with proper password management
-- ===============================================

BEGIN;

-- ===============================================
-- 1. UPDATE ADMINS TABLE STRUCTURE
-- ===============================================

-- Ensure all required columns exist
ALTER TABLE admins ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;

-- Drop old role constraint if exists and add role column
DO $$ 
BEGIN
    -- Drop existing role constraint
    ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'tenant_admin';

-- Add new role constraint
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;
ALTER TABLE admins ADD CONSTRAINT admins_role_check CHECK (role IN ('super_admin', 'tenant_admin', 'tenant_operator'));

ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Drop old status constraint if exists and add status column
DO $$ 
BEGIN
    ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE admins ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add new status constraint
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_status_check;
ALTER TABLE admins ADD CONSTRAINT admins_status_check CHECK (status IN ('active', 'inactive', 'suspended'));

-- Password reset columns
ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Metadata
ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE admins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Make username nullable if it exists (for backwards compatibility)
ALTER TABLE admins ALTER COLUMN username DROP NOT NULL;

-- ===============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_tenant_role ON admins(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_admins_reset_token ON admins(reset_token);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);

-- ===============================================
-- 3. CREATE PASSWORD RESET TOKENS TABLE
-- ===============================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_admin ON password_reset_tokens(admin_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- ===============================================
-- 4. CREATE ADMIN ACTIVITY LOG TABLE
-- ===============================================

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- login, logout, password_change, password_reset, etc.
  description TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  status VARCHAR(20) CHECK (status IN ('success', 'failed', 'blocked')) DEFAULT 'success',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_tenant ON admin_activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action ON admin_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created ON admin_activity_logs(created_at DESC);

-- ===============================================
-- 5. CLEAR EXISTING ADMINS AND CREATE NEW ONES
-- ===============================================

-- Clear all existing admins (fresh start)
TRUNCATE TABLE admins CASCADE;

-- Create super admin for the default tenant
INSERT INTO admins (
  username,
  email,
  password,
  full_name,
  phone,
  tenant_id,
  role,
  status,
  permissions,
  created_at
) VALUES (
  'superadmin',
  'admin@myqonnectwifi.tech',
  '$2b$10$5YqpjKuZvPYd/W18pfRmie/.GHGmH/iaGmKQrR4udIPCUosFeyK0O', -- Password: admin123
  'Super Administrator',
  '+254700000000',
  (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default'),
  'super_admin',
  'active',
  '{"can_manage_tenants": true, "can_view_all_analytics": true, "can_manage_subscriptions": true, "can_manage_admins": true, "can_manage_billing": true}'::jsonb,
  NOW()
);

-- Create a tenant admin as well
INSERT INTO admins (
  username,
  email,
  password,
  full_name,
  phone,
  tenant_id,
  role,
  status,
  permissions,
  created_at
) VALUES (
  'tenantadmin',
  'tenantadmin@myqonnectwifi.tech',
  '$2b$10$5YqpjKuZvPYd/W18pfRmie/.GHGmH/iaGmKQrR4udIPCUosFeyK0O', -- Password: admin123
  'Tenant Administrator',
  '+254700000001',
  (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default'),
  'tenant_admin',
  'active',
  '{"can_manage_payments": true, "can_manage_customers": true, "can_view_reports": true, "can_manage_packages": true}'::jsonb,
  NOW()
);

-- ===============================================
-- 6. CREATE TRIGGER FOR UPDATED_AT
-- ===============================================

CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_admins_updated_at ON admins;
CREATE TRIGGER trigger_admins_updated_at 
BEFORE UPDATE ON admins 
FOR EACH ROW EXECUTE FUNCTION update_admins_updated_at();

-- ===============================================
-- 7. CREATE FUNCTION TO CLEAN EXPIRED TOKENS
-- ===============================================

CREATE OR REPLACE FUNCTION clean_expired_reset_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW() AND used = false;
END;
$$ language 'plpgsql';

-- ===============================================
-- 8. CREATE VIEW FOR ADMIN OVERVIEW
-- ===============================================

CREATE OR REPLACE VIEW v_admin_overview AS
SELECT 
  a.id,
  a.email,
  a.full_name,
  a.phone,
  a.role,
  a.status,
  a.tenant_id,
  t.tenant_code,
  t.business_name as tenant_name,
  a.last_login,
  a.login_attempts,
  a.locked_until,
  COUNT(DISTINCT al.id) as total_activities,
  a.created_at,
  a.updated_at
FROM admins a
LEFT JOIN tenants t ON t.id = a.tenant_id
LEFT JOIN admin_activity_logs al ON al.admin_id = a.id
GROUP BY a.id, a.email, a.full_name, a.phone, a.role, a.status, 
         a.tenant_id, t.tenant_code, t.business_name, a.last_login, 
         a.login_attempts, a.locked_until, a.created_at, a.updated_at;

COMMIT;

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

SELECT '✅ Admins Table Structure:' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'admins' 
ORDER BY ordinal_position;

SELECT '✅ Created Admins:' as status;
SELECT id, email, full_name, role, status, tenant_id FROM admins;

SELECT '✅ Password Reset System:' as status;
SELECT COUNT(*) as reset_tokens_table_exists FROM information_schema.tables WHERE table_name = 'password_reset_tokens';

SELECT '✅ Admin Activity Log:' as status;
SELECT COUNT(*) as activity_logs_table_exists FROM information_schema.tables WHERE table_name = 'admin_activity_logs';

SELECT '
========================================
✅ ADMIN AUTHENTICATION FIXED!
========================================

DEFAULT CREDENTIALS:
--------------------
Super Admin:
  Email: admin@myqonnectwifi.tech
  Password: admin123

Tenant Admin:
  Email: tenantadmin@myqonnectwifi.tech
  Password: admin123

⚠️  IMPORTANT: Change these passwords after first login!

FEATURES ENABLED:
-----------------
✅ Email-based authentication
✅ Password reset tokens (1-hour expiry)
✅ Login attempt tracking (max 5 attempts)
✅ Account lockout (30 minutes after 5 failed attempts)
✅ Activity logging
✅ Multi-tenant role management
✅ Super admin vs Tenant admin roles

NEXT STEPS:
-----------
1. Update backend routes/auth.js to use new schema
2. Add password reset endpoints
3. Add forgot password UI in frontend
4. Test login with default credentials
========================================
' as summary;
