-- ====================================
-- WiFi Billing System Database Schema
-- Matches existing structure
-- ====================================

-- Note: Your existing tables structure
-- This file shows the ALTER statements to enhance your existing tables

-- ====================================
-- ENHANCE PAYMENTS TABLE
-- ====================================
-- Add missing columns if they don't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS time_purchased VARCHAR(20) AFTER status,
ADD COLUMN IF NOT EXISTS mpesa_receipt_number VARCHAR(50) AFTER transaction_id,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP NULL AFTER updated_at;

-- Add indexes for better performance
ALTER TABLE payments 
ADD INDEX IF NOT EXISTS idx_mac_address (mac_address),
ADD INDEX IF NOT EXISTS idx_phone (phone),
ADD INDEX IF NOT EXISTS idx_status (status),
ADD INDEX IF NOT EXISTS idx_created_at (created_at);

-- ====================================
-- ENHANCE DEVICES TABLE
-- ====================================
-- Your existing devices table is good
-- Add index for better MAC address lookups
ALTER TABLE devices
ADD INDEX IF NOT EXISTS idx_status (status),
ADD INDEX IF NOT EXISTS idx_last_seen (last_seen);

-- ====================================
-- ENHANCE SESSIONS TABLE
-- ====================================
-- Add missing columns for session management
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS mac_address VARCHAR(17) AFTER payment_id,
ADD COLUMN IF NOT EXISTS phone VARCHAR(15) AFTER mac_address,
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) AFTER phone,
ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 60 AFTER ip_address,
ADD COLUMN IF NOT EXISTS speed_limit VARCHAR(10) DEFAULT '2M' AFTER duration_minutes;

-- Rename columns to match application code
ALTER TABLE sessions
CHANGE COLUMN IF EXISTS start_time session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
CHANGE COLUMN IF EXISTS end_time session_end TIMESTAMP NULL,
CHANGE COLUMN IF EXISTS data_used data_used_mb BIGINT DEFAULT 0;

-- Add indexes
ALTER TABLE sessions
ADD INDEX IF NOT EXISTS idx_mac_address (mac_address),
ADD INDEX IF NOT EXISTS idx_phone (phone),
ADD INDEX IF NOT EXISTS idx_session_start (session_start);

-- Add foreign key if not exists
-- Note: Run this only if foreign key doesn't exist
-- ALTER TABLE sessions
-- ADD CONSTRAINT fk_session_device 
-- FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;

-- ====================================
-- YOUR EXISTING ADMIN (Keep as is)
-- ====================================
-- Username: admin
-- Email: robinsonotoch7@gmail.com
-- Password: Already set in your database

-- ====================================
-- VIEWS FOR REPORTING
-- ====================================

-- Active sessions view with device info
DROP VIEW IF EXISTS v_active_sessions;
CREATE VIEW v_active_sessions AS
SELECT 
    s.id,
    s.mac_address,
    s.phone,
    s.ip_address,
    s.session_start,
    s.duration_minutes,
    s.speed_limit,
    s.data_used_mb,
    TIMESTAMPDIFF(MINUTE, s.session_start, NOW()) as minutes_elapsed,
    (s.duration_minutes - TIMESTAMPDIFF(MINUTE, s.session_start, NOW())) as minutes_remaining,
    p.amount,
    p.time_purchased,
    p.status as payment_status,
    d.device_name,
    d.status as device_status
FROM sessions s
LEFT JOIN payments p ON s.payment_id = p.id
LEFT JOIN devices d ON s.device_id = d.id
WHERE s.status = 'active'
  AND TIMESTAMPDIFF(MINUTE, s.session_start, NOW()) < s.duration_minutes;

-- Revenue summary view
DROP VIEW IF EXISTS v_revenue_summary;
CREATE VIEW v_revenue_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN status = 'confirmed' THEN CAST(amount AS DECIMAL(10,2)) ELSE 0 END) as confirmed_revenue,
    SUM(CASE WHEN status = 'pending' THEN CAST(amount AS DECIMAL(10,2)) ELSE 0 END) as pending_revenue,
    SUM(CASE WHEN status = 'failed' THEN CAST(amount AS DECIMAL(10,2)) ELSE 0 END) as failed_amount,
    COUNT(DISTINCT phone) as unique_customers
FROM payments
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ====================================
-- STORED PROCEDURES
-- ====================================

DELIMITER //

-- Procedure to expire old sessions
CREATE PROCEDURE expire_old_sessions()
BEGIN
    UPDATE sessions 
    SET status = 'expired'
    WHERE status = 'active'
      AND TIMESTAMPDIFF(MINUTE, session_start, NOW()) >= duration_minutes;
    
    SELECT ROW_COUNT() as expired_sessions;
END//

-- Procedure to get session info by MAC
DROP PROCEDURE IF EXISTS get_session_by_mac//
CREATE PROCEDURE get_session_by_mac(IN mac VARCHAR(17))
BEGIN
    SELECT 
        s.*,
        p.amount,
        p.time_purchased,
        p.phone as payment_phone,
        d.device_name,
        d.ip_address as device_ip,
        TIMESTAMPDIFF(MINUTE, s.session_start, NOW()) as elapsed_minutes,
        (s.duration_minutes - TIMESTAMPDIFF(MINUTE, s.session_start, NOW())) as remaining_minutes
    FROM sessions s
    LEFT JOIN payments p ON s.payment_id = p.id
    LEFT JOIN devices d ON s.device_id = d.id
    WHERE s.mac_address = mac
      AND s.status = 'active'
    ORDER BY s.session_start DESC
    LIMIT 1;
END//

-- Procedure to create session after payment
DROP PROCEDURE IF EXISTS create_session//
CREATE PROCEDURE create_session(
    IN p_payment_id INT,
    IN p_device_id INT,
    IN p_mac_address VARCHAR(17),
    IN p_phone VARCHAR(15),
    IN p_ip_address VARCHAR(45),
    IN p_duration_minutes INT,
    IN p_speed_limit VARCHAR(10)
)
BEGIN
    INSERT INTO sessions (
        payment_id, 
        device_id, 
        mac_address, 
        phone, 
        ip_address,
        duration_minutes, 
        speed_limit, 
        status,
        session_start
    )
    VALUES (
        p_payment_id, 
        p_device_id,
        p_mac_address, 
        p_phone,
        p_ip_address,
        p_duration_minutes, 
        p_speed_limit, 
        'active',
        NOW()
    );
    
    SELECT LAST_INSERT_ID() as session_id;
END//

-- Procedure to register or update device
DROP PROCEDURE IF EXISTS register_device//
CREATE PROCEDURE register_device(
    IN p_mac_address VARCHAR(17),
    IN p_ip_address VARCHAR(15),
    IN p_device_name VARCHAR(255)
)
BEGIN
    INSERT INTO devices (mac_address, ip_address, device_name, status, last_seen)
    VALUES (p_mac_address, p_ip_address, p_device_name, 'active', NOW())
    ON DUPLICATE KEY UPDATE 
        ip_address = p_ip_address,
        device_name = COALESCE(p_device_name, device_name),
        last_seen = NOW(),
        status = 'active';
    
    SELECT id, mac_address, ip_address, device_name, status 
    FROM devices 
    WHERE mac_address = p_mac_address;
END//

DELIMITER ;

-- ====================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ====================================
-- Uncomment the lines below to insert test data

-- INSERT INTO payments (phone, amount, transaction_id, mac_address, status, time_purchased, mpesa_receipt_number) VALUES
-- ('254712345678', 10.00, 'TXN_TEST_001', 'AA:BB:CC:DD:EE:01', 'confirmed', '1 Hour', 'TEST001'),
-- ('254723456789', 30.00, 'TXN_TEST_002', 'AA:BB:CC:DD:EE:02', 'confirmed', '24 Hours', 'TEST002'),
-- ('254734567890', 50.00, 'TXN_TEST_003', 'AA:BB:CC:DD:EE:03', 'pending', '2 Days', NULL);

-- INSERT INTO sessions (payment_id, mac_address, phone, duration_minutes, speed_limit, status) VALUES
-- (1, 'AA:BB:CC:DD:EE:01', '254712345678', 60, '2M', 'active'),
-- (2, 'AA:BB:CC:DD:EE:02', '254723456789', 1440, '5M', 'active');
