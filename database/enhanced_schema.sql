-- ===============================================
-- ENHANCED WIFI BILLING SYSTEM DATABASE SCHEMA
-- Complete schema with all new tables and enhancements
-- ===============================================

USE wifi_billing;

-- ===============================================
-- 1. ENHANCE EXISTING ADMINS TABLE
-- ===============================================

-- Add role column safely
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'admins' AND column_name = 'role';
SET @query = IF(@col_exists = 0, 
    "ALTER TABLE admins ADD COLUMN role ENUM('super_admin', 'admin', 'operator') DEFAULT 'admin' AFTER password", 
    'SELECT "role already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add last_login column safely
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'admins' AND column_name = 'last_login';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE admins ADD COLUMN last_login TIMESTAMP NULL AFTER role', 
    'SELECT "last_login already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add is_active column safely
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'admins' AND column_name = 'is_active';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE admins ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER last_login', 
    'SELECT "is_active already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add two_factor_enabled column safely
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'admins' AND column_name = 'two_factor_enabled';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE admins ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE AFTER is_active', 
    'SELECT "two_factor_enabled already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add two_factor_secret column safely
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'admins' AND column_name = 'two_factor_secret';
SET @query = IF(@col_exists = 0, 
    'ALTER TABLE admins ADD COLUMN two_factor_secret VARCHAR(255) NULL AFTER two_factor_enabled', 
    'SELECT "two_factor_secret already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ===============================================
-- 2. CREATE PACKAGES TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS packages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    duration_minutes INT NOT NULL,
    data_limit_mb BIGINT NULL COMMENT 'NULL means unlimited',
    price DECIMAL(10,2) NOT NULL,
    speed_limit_mbps INT NOT NULL DEFAULT 2,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- 3. CREATE CUSTOMERS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100),
    name VARCHAR(100),
    total_spent DECIMAL(10,2) DEFAULT 0,
    total_sessions INT DEFAULT 0,
    last_purchase TIMESTAMP NULL,
    status ENUM('active', 'blocked', 'suspended') DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_status (status),
    INDEX idx_last_purchase (last_purchase)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- 4. CREATE VOUCHERS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS vouchers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,
    package_id INT NOT NULL,
    status ENUM('unused', 'used', 'expired') DEFAULT 'unused',
    generated_by INT NOT NULL,
    used_by_phone VARCHAR(15) NULL,
    used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    batch_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT,
    FOREIGN KEY (generated_by) REFERENCES admins(id) ON DELETE RESTRICT,
    INDEX idx_code (code),
    INDEX idx_status (status),
    INDEX idx_batch_id (batch_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- 5. CREATE AUDIT LOGS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_affected VARCHAR(50),
    record_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_admin_id (admin_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- 6. CREATE NETWORK STATS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS network_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    upload_speed_mbps DECIMAL(10,2),
    download_speed_mbps DECIMAL(10,2),
    ping_ms INT,
    packet_loss_percent DECIMAL(5,2),
    data_uploaded_mb DECIMAL(10,2),
    data_downloaded_mb DECIMAL(10,2),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- 7. CREATE NOTIFICATIONS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NULL COMMENT 'NULL means notify all admins',
    type ENUM('payment_failed', 'session_ended', 'device_blocked', 'low_balance', 'system_alert', 'customer_issue') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_table VARCHAR(50),
    related_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_admin_id (admin_id),
    INDEX idx_is_read (is_read),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- 8. CREATE SYSTEM SETTINGS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    category VARCHAR(50),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_category (category),
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- 9. CREATE REFUNDS TABLE
-- ===============================================
CREATE TABLE IF NOT EXISTS refunds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    requested_by INT NOT NULL,
    approved_by INT NULL,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT,
    FOREIGN KEY (requested_by) REFERENCES admins(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES admins(id) ON DELETE SET NULL,
    INDEX idx_payment_id (payment_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===============================================
-- 10. SEED INITIAL DATA
-- ===============================================

-- Insert default packages
INSERT INTO packages (name, duration_minutes, data_limit_mb, price, speed_limit_mbps, description, sort_order) VALUES
('30 Minutes Basic', 30, NULL, 1.00, 2, 'Quick access for basic browsing', 1),
('1 Hour Standard', 60, NULL, 10.00, 2, 'Perfect for casual browsing and social media', 2),
('3 Hours Plus', 180, NULL, 15.00, 3, 'Extended browsing with better speed', 3),
('6 Hours Pro', 360, NULL, 20.00, 4, 'Half-day access with good speed', 4),
('12 Hours Super', 720, NULL, 25.00, 5, 'Work-day access with great speed', 5),
('24 Hours Daily', 1440, NULL, 30.00, 5, 'Full day unlimited access', 6),
('2 Days Weekend', 2880, NULL, 50.00, 6, 'Weekend package with premium speed', 7),
('3 Days Extended', 4320, NULL, 80.00, 6, 'Extended stay package', 8),
('1 Week Premium', 10080, NULL, 200.00, 6, 'Weekly unlimited premium access', 9),
('2 Weeks Business', 20160, NULL, 300.00, 10, 'Business package with maximum speed', 10),
('1 Month Ultimate', 43200, NULL, 500.00, 10, 'Monthly unlimited ultimate package', 11)
ON DUPLICATE KEY UPDATE name=name;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
('business_name', 'Qonnect WiFi', 'string', 'general', 'Business name displayed on portal', TRUE),
('business_email', 'support@qonnectwifi.com', 'string', 'general', 'Support email address', TRUE),
('business_phone', '+254756521055', 'string', 'general', 'Support phone number', TRUE),
('currency', 'KES', 'string', 'general', 'Currency code', TRUE),
('timezone', 'Africa/Nairobi', 'string', 'general', 'System timezone', FALSE),
('session_timeout_minutes', '30', 'number', 'system', 'Admin session timeout', FALSE),
('auto_approve_devices', 'false', 'boolean', 'system', 'Auto-approve new devices', FALSE),
('enable_vouchers', 'true', 'boolean', 'features', 'Enable voucher system', FALSE),
('enable_notifications', 'true', 'boolean', 'features', 'Enable notifications', FALSE),
('max_devices_per_customer', '5', 'number', 'limits', 'Maximum devices per customer', FALSE),
('payment_retry_attempts', '3', 'number', 'payments', 'Failed payment retry attempts', FALSE),
('session_grace_period_minutes', '5', 'number', 'sessions', 'Grace period before session termination', FALSE)
ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- ===============================================
-- 11. CREATE ENHANCED VIEWS
-- ===============================================

-- Dashboard statistics view
DROP VIEW IF EXISTS v_dashboard_stats;
CREATE VIEW v_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM sessions WHERE status = 'active') as active_sessions,
    (SELECT COUNT(*) FROM devices WHERE status = 'active') as active_devices,
    (SELECT COUNT(*) FROM devices WHERE status = 'pending') as pending_devices,
    (SELECT COUNT(*) FROM payments WHERE DATE(created_at) = CURDATE() AND status = 'confirmed') as today_payments,
    (SELECT COALESCE(SUM(CAST(amount AS DECIMAL(10,2))), 0) FROM payments WHERE DATE(created_at) = CURDATE() AND status = 'confirmed') as today_revenue,
    (SELECT COUNT(*) FROM payments WHERE DATE(created_at) = CURDATE() AND status = 'failed') as today_failed_payments,
    (SELECT COUNT(*) FROM customers WHERE status = 'active') as total_customers,
    (SELECT COUNT(*) FROM notifications WHERE is_read = FALSE) as unread_notifications;

-- Revenue by package view
DROP VIEW IF EXISTS v_revenue_by_package;
CREATE VIEW v_revenue_by_package AS
SELECT 
    p.id,
    p.name as package_name,
    p.price,
    COUNT(pay.id) as total_sales,
    SUM(CAST(pay.amount AS DECIMAL(10,2))) as total_revenue,
    DATE(pay.created_at) as sale_date
FROM packages p
LEFT JOIN payments pay ON CAST(pay.amount AS DECIMAL(10,2)) = p.price AND pay.status = 'confirmed'
WHERE pay.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY p.id, p.name, p.price, DATE(pay.created_at)
ORDER BY total_revenue DESC;

-- Active sessions detail view
DROP VIEW IF EXISTS v_active_sessions_detail;
CREATE VIEW v_active_sessions_detail AS
SELECT 
    s.id,
    s.mac_address,
    s.phone,
    s.ip_address,
    s.session_start,
    s.session_end,
    s.duration_minutes,
    s.speed_limit,
    s.data_used_mb,
    s.status,
    TIMESTAMPDIFF(MINUTE, s.session_start, NOW()) as elapsed_minutes,
    GREATEST(0, s.duration_minutes - TIMESTAMPDIFF(MINUTE, s.session_start, NOW())) as remaining_minutes,
    ROUND((TIMESTAMPDIFF(MINUTE, s.session_start, NOW()) / s.duration_minutes) * 100, 2) as progress_percent,
    p.amount,
    p.transaction_id,
    p.mpesa_receipt_number,
    d.device_name,
    d.status as device_status,
    c.name as customer_name,
    c.email as customer_email
FROM sessions s
LEFT JOIN payments p ON s.payment_id = p.id
LEFT JOIN devices d ON s.device_id = d.id
LEFT JOIN customers c ON s.phone = c.phone
WHERE s.status = 'active';

-- Customer analytics view
DROP VIEW IF EXISTS v_customer_analytics;
CREATE VIEW v_customer_analytics AS
SELECT 
    c.id,
    c.phone,
    c.name,
    c.email,
    c.total_spent,
    c.total_sessions,
    c.last_purchase,
    c.status,
    c.created_at,
    COUNT(DISTINCT d.id) as device_count,
    COUNT(DISTINCT s.id) as session_count,
    COALESCE(SUM(s.data_used_mb), 0) as total_data_used_mb,
    DATEDIFF(CURDATE(), c.last_purchase) as days_since_last_purchase,
    CASE 
        WHEN c.last_purchase IS NULL THEN 'new'
        WHEN DATEDIFF(CURDATE(), c.last_purchase) <= 7 THEN 'active'
        WHEN DATEDIFF(CURDATE(), c.last_purchase) <= 30 THEN 'occasional'
        ELSE 'inactive'
    END as customer_segment
FROM customers c
LEFT JOIN devices d ON c.phone = d.device_name
LEFT JOIN sessions s ON c.phone = s.phone
GROUP BY c.id;

-- ===============================================
-- 12. CREATE STORED PROCEDURES
-- ===============================================

DELIMITER //

-- Procedure to create customer from payment
DROP PROCEDURE IF EXISTS create_or_update_customer//
CREATE PROCEDURE create_or_update_customer(
    IN p_phone VARCHAR(15),
    IN p_amount DECIMAL(10,2)
)
BEGIN
    INSERT INTO customers (phone, total_spent, total_sessions, last_purchase)
    VALUES (p_phone, p_amount, 1, NOW())
    ON DUPLICATE KEY UPDATE 
        total_spent = total_spent + p_amount,
        total_sessions = total_sessions + 1,
        last_purchase = NOW();
END//

-- Procedure to expire sessions and vouchers
DROP PROCEDURE IF EXISTS cleanup_expired_items//
CREATE PROCEDURE cleanup_expired_items()
BEGIN
    -- Expire old sessions
    UPDATE sessions 
    SET status = 'expired', session_end = NOW()
    WHERE status = 'active'
      AND TIMESTAMPDIFF(MINUTE, session_start, NOW()) >= duration_minutes;
    
    -- Expire old vouchers
    UPDATE vouchers 
    SET status = 'expired'
    WHERE status = 'unused'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
    
    SELECT 
        (SELECT COUNT(*) FROM sessions WHERE status = 'expired' AND DATE(session_end) = CURDATE()) as sessions_expired,
        (SELECT COUNT(*) FROM vouchers WHERE status = 'expired' AND DATE(expires_at) = CURDATE()) as vouchers_expired;
END//

-- Procedure to generate audit log
DROP PROCEDURE IF EXISTS log_admin_action//
CREATE PROCEDURE log_admin_action(
    IN p_admin_id INT,
    IN p_action VARCHAR(100),
    IN p_table VARCHAR(50),
    IN p_record_id INT,
    IN p_details JSON,
    IN p_ip_address VARCHAR(45)
)
BEGIN
    INSERT INTO audit_logs (admin_id, action, table_affected, record_id, details, ip_address)
    VALUES (p_admin_id, p_action, p_table, p_record_id, p_details, p_ip_address);
END//

-- Procedure to get dashboard statistics
DROP PROCEDURE IF EXISTS get_dashboard_stats//
CREATE PROCEDURE get_dashboard_stats()
BEGIN
    SELECT * FROM v_dashboard_stats;
    
    -- Recent payments
    SELECT 
        id, phone, amount, transaction_id, status, created_at
    FROM payments 
    ORDER BY created_at DESC 
    LIMIT 10;
    
    -- Revenue trend (last 7 days)
    SELECT 
        DATE(created_at) as date,
        COUNT(*) as transactions,
        SUM(CAST(amount AS DECIMAL(10,2))) as revenue
    FROM payments
    WHERE status = 'confirmed'
      AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY date ASC;
END//

DELIMITER ;

-- ===============================================
-- 13. CREATE INDEXES FOR PERFORMANCE
-- ===============================================

-- Payments indexes (safely)
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'payments' AND index_name = 'idx_phone_status';
SET @query = IF(@index_exists = 0, 'ALTER TABLE payments ADD INDEX idx_phone_status (phone, status)', 'SELECT "idx_phone_status already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'payments' AND index_name = 'idx_created_date';
SET @query = IF(@index_exists = 0, 'ALTER TABLE payments ADD INDEX idx_created_date (created_at)', 'SELECT "idx_created_date already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Sessions indexes (safely)
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'sessions' AND index_name = 'idx_status_date';
SET @query = IF(@index_exists = 0, 'ALTER TABLE sessions ADD INDEX idx_status_date (status, session_start)', 'SELECT "idx_status_date already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Devices indexes (safely)
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'devices' AND index_name = 'idx_status_date';
SET @query = IF(@index_exists = 0, 'ALTER TABLE devices ADD INDEX idx_status_date (status, last_seen)', 'SELECT "devices idx_status_date already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ===============================================
-- SCHEMA COMPLETE
-- ===============================================

SELECT '✅ Enhanced database schema created successfully!' as status;
SELECT 'Tables created: packages, customers, vouchers, audit_logs, network_stats, notifications, system_settings, refunds' as info;
SELECT 'Views created: v_dashboard_stats, v_revenue_by_package, v_active_sessions_detail, v_customer_analytics' as views;
SELECT 'Procedures created: create_or_update_customer, cleanup_expired_items, log_admin_action, get_dashboard_stats' as procedures;
