-- ============================================
-- Enhanced WiFi Billing System Database Schema
-- Supabase PostgreSQL Compatible
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Admins Table (Enhanced)
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'operator', 'viewer')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    last_login TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Packages Table
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    speed_limit VARCHAR(20) DEFAULT '5M',
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    download_limit VARCHAR(20),
    upload_limit VARCHAR(20),
    data_limit_mb INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Devices Table
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    mac_address VARCHAR(17) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    device_name VARCHAR(255),
    phone VARCHAR(15),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'blocked', 'inactive')),
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_sessions INTEGER DEFAULT 0,
    total_data_mb BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded', 'cancelled')),
    mac_address VARCHAR(17),
    mpesa_receipt_number VARCHAR(50),
    checkout_request_id VARCHAR(100),
    merchant_request_id VARCHAR(100),
    time_purchased VARCHAR(50),
    package_id INTEGER REFERENCES packages(id),
    result_code VARCHAR(10),
    result_desc TEXT,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id),
    device_id INTEGER REFERENCES devices(id),
    phone VARCHAR(15) NOT NULL,
    mac_address VARCHAR(17) NOT NULL,
    ip_address VARCHAR(45),
    amount DECIMAL(10, 2),
    duration_minutes INTEGER NOT NULL,
    speed_limit VARCHAR(20) DEFAULT '5M',
    data_used_mb BIGINT DEFAULT 0,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated', 'expired')),
    terminated_by INTEGER REFERENCES admins(id),
    termination_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vouchers Table
CREATE TABLE IF NOT EXISTS vouchers (
    id SERIAL PRIMARY KEY,
    voucher_code VARCHAR(20) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    speed_limit VARCHAR(20) DEFAULT '5M',
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    expires_at TIMESTAMP,
    used_at TIMESTAMP,
    used_by_phone VARCHAR(15),
    used_by_mac VARCHAR(17),
    created_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table (Aggregated from payments)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    total_spent DECIMAL(10, 2) DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    first_purchase TIMESTAMP,
    last_purchase TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refunds Table
CREATE TABLE IF NOT EXISTS refunds (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id),
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    requested_by INTEGER REFERENCES admins(id),
    approved_by INTEGER REFERENCES admins(id),
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    updated_by INTEGER REFERENCES admins(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    action_url VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table (Enhanced)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_phone ON payments(phone);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_mac_address ON payments(mac_address);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON sessions(phone);
CREATE INDEX IF NOT EXISTS idx_sessions_mac ON sessions(mac_address);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_dates ON sessions(session_start, session_end);
CREATE INDEX IF NOT EXISTS idx_sessions_payment ON sessions(payment_id);

-- Devices indexes
CREATE INDEX IF NOT EXISTS idx_devices_mac ON devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_admin ON notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Vouchers indexes
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(voucher_code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);

-- ============================================
-- VIEWS FOR DASHBOARD AND REPORTING
-- ============================================

-- Dashboard Statistics View
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'confirmed') as total_revenue,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'confirmed' AND created_at >= CURRENT_DATE) as today_revenue,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'confirmed' AND created_at >= DATE_TRUNC('week', CURRENT_DATE)) as week_revenue,
    (SELECT COUNT(*) FROM sessions WHERE status = 'active' AND session_end > NOW()) as active_sessions,
    (SELECT COUNT(DISTINCT phone) FROM payments) as total_customers,
    (SELECT COUNT(DISTINCT phone) FROM payments WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as active_customers,
    (SELECT COUNT(*) FROM devices WHERE status = 'active') as active_devices,
    (SELECT COUNT(*) FROM devices WHERE last_seen >= NOW() - INTERVAL '1 hour') as devices_online,
    (SELECT COUNT(*) FROM devices WHERE status = 'pending') as pending_devices,
    (SELECT COUNT(*) FROM payments WHERE status = 'pending') as pending_payments,
    (SELECT COUNT(*) FROM payments WHERE status = 'failed' AND created_at >= CURRENT_DATE) as failed_payments_today;

-- Active Sessions Detail View
CREATE OR REPLACE VIEW v_active_sessions_detail AS
SELECT 
    s.id,
    s.phone,
    s.mac_address,
    s.ip_address,
    s.session_start,
    s.session_end,
    s.duration_minutes,
    s.speed_limit,
    s.data_used_mb,
    s.status,
    EXTRACT(EPOCH FROM (s.session_end - NOW())) / 60 as minutes_remaining,
    EXTRACT(EPOCH FROM (NOW() - s.session_start)) / 60 as minutes_elapsed,
    p.amount,
    p.transaction_id,
    p.mpesa_receipt_number,
    d.device_name,
    d.status as device_status
FROM sessions s
LEFT JOIN payments p ON s.payment_id = p.id
LEFT JOIN devices d ON s.device_id = d.id
WHERE s.status = 'active' AND s.session_end > NOW();

-- Revenue Summary View
CREATE OR REPLACE VIEW v_revenue_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as confirmed_revenue,
    SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_revenue,
    SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed_amount,
    COUNT(DISTINCT phone) as unique_customers
FROM payments
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Customer Analytics View
CREATE OR REPLACE VIEW v_customer_analytics AS
SELECT 
    phone,
    COUNT(*) as total_purchases,
    SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as total_spent,
    AVG(CASE WHEN status = 'confirmed' THEN amount END) as avg_purchase,
    MIN(created_at) as first_purchase,
    MAX(created_at) as last_purchase,
    CASE 
        WHEN SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) >= 1000 THEN 'vip'
        WHEN SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) >= 500 THEN 'regular'
        ELSE 'new'
    END as customer_segment
FROM payments
GROUP BY phone;

-- Package Performance View
CREATE OR REPLACE VIEW v_package_performance AS
SELECT 
    pkg.id,
    pkg.name,
    pkg.amount as price,
    pkg.duration,
    pkg.speed_limit,
    COUNT(p.id) as total_sales,
    SUM(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END) as total_revenue,
    COUNT(CASE WHEN p.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as sales_last_30_days
FROM packages pkg
LEFT JOIN payments p ON p.amount = pkg.amount AND p.status = 'confirmed'
WHERE pkg.status = 'active'
GROUP BY pkg.id, pkg.name, pkg.amount, pkg.duration, pkg.speed_limit
ORDER BY total_revenue DESC;

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at 
            BEFORE UPDATE ON %s
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- Function to expire old sessions
CREATE OR REPLACE FUNCTION expire_old_sessions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE sessions 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
    AND session_end <= NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update customer stats after payment
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' THEN
        INSERT INTO customers (phone, total_spent, total_sessions, first_purchase, last_purchase)
        VALUES (NEW.phone, NEW.amount, 1, NOW(), NOW())
        ON CONFLICT (phone) DO UPDATE SET
            total_spent = customers.total_spent + NEW.amount,
            total_sessions = customers.total_sessions + 1,
            last_purchase = NOW(),
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_customer_stats
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default admin (password: admin123)
INSERT INTO admins (username, email, password, role, status) 
VALUES ('admin', 'admin@onealwifi.com', '$2a$10$rGfJ8qZ9V6yHxX0P5P3xY.xN9FqYhZhQXGKpXvBxYqFhHqGhQxY0K', 'super_admin', 'active')
ON CONFLICT (username) DO NOTHING;

-- Insert default packages
INSERT INTO packages (name, amount, duration, duration_minutes, speed_limit, description, status)
VALUES 
    ('30 Minutes', 10, '30 Minutes', 30, '2M', 'Basic 30-minute access with 2Mbps speed', 'active'),
    ('1 Hour', 20, '1 Hour', 60, '3M', 'One hour access with 3Mbps speed', 'active'),
    ('3 Hours', 50, '3 Hours', 180, '5M', 'Three hours access with 5Mbps speed', 'active'),
    ('Daily', 100, '24 Hours', 1440, '5M', 'Full day access with 5Mbps speed', 'active'),
    ('Weekly', 500, '7 Days', 10080, '10M', 'Weekly unlimited access with 10Mbps speed', 'active'),
    ('Monthly', 1500, '30 Days', 43200, '15M', 'Monthly unlimited access with 15Mbps speed', 'active')
ON CONFLICT DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, category, description)
VALUES 
    ('site_name', 'Oneal WiFi', 'general', 'Website/Business name'),
    ('support_email', 'support@onealwifi.com', 'general', 'Support email address'),
    ('support_phone', '+254700000000', 'general', 'Support phone number'),
    ('currency', 'KSH', 'general', 'Default currency'),
    ('timezone', 'Africa/Nairobi', 'general', 'Default timezone'),
    ('session_timeout', '30', 'security', 'Session timeout in minutes'),
    ('mpesa_environment', 'sandbox', 'mpesa', 'MPesa environment (sandbox/production)'),
    ('shortcode', '174379', 'mpesa', 'MPesa business shortcode'),
    ('router_host', '192.168.1.1', 'mikrotik', 'MikroTik router IP address'),
    ('router_port', '8728', 'mikrotik', 'MikroTik API port')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (Optional)
-- ============================================

-- Enable RLS on tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for authenticated users in this case)
CREATE POLICY "Allow all for authenticated" ON admins FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON devices FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON packages FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON vouchers FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON system_settings FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON refunds FOR ALL USING (true);

-- Success message
SELECT 'Enhanced database schema created successfully!' as message;
