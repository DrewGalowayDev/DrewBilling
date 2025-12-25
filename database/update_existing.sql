-- ===============================================
-- QUICK UPDATE SCRIPT FOR EXISTING DATABASE
-- Run this to add missing columns and features
-- ===============================================

USE wifi_billing;

-- ===============================================
-- 1. UPDATE PAYMENTS TABLE
-- ===============================================

-- Add missing columns to payments table (safely)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'payments' AND column_name = 'time_purchased';
SET @query = IF(@col_exists = 0, 'ALTER TABLE payments ADD COLUMN time_purchased VARCHAR(20) AFTER status', 'SELECT "time_purchased already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'payments' AND column_name = 'mpesa_receipt_number';
SET @query = IF(@col_exists = 0, 'ALTER TABLE payments ADD COLUMN mpesa_receipt_number VARCHAR(50) AFTER transaction_id', 'SELECT "mpesa_receipt_number already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'payments' AND column_name = 'confirmed_at';
SET @query = IF(@col_exists = 0, 'ALTER TABLE payments ADD COLUMN confirmed_at TIMESTAMP NULL AFTER updated_at', 'SELECT "confirmed_at already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes for better performance (safely)
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'payments' AND index_name = 'idx_mac_address';
SET @query = IF(@index_exists = 0, 'ALTER TABLE payments ADD INDEX idx_mac_address (mac_address)', 'SELECT "idx_mac_address already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'payments' AND index_name = 'idx_phone';
SET @query = IF(@index_exists = 0, 'ALTER TABLE payments ADD INDEX idx_phone (phone)', 'SELECT "idx_phone already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'payments' AND index_name = 'idx_status';
SET @query = IF(@index_exists = 0, 'ALTER TABLE payments ADD INDEX idx_status (status)', 'SELECT "idx_status already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'payments' AND index_name = 'idx_created_at';
SET @query = IF(@index_exists = 0, 'ALTER TABLE payments ADD INDEX idx_created_at (created_at)', 'SELECT "idx_created_at already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ===============================================
-- 2. UPDATE DEVICES TABLE
-- ===============================================

-- Add indexes for devices (safely)
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'devices' AND index_name = 'idx_status';
SET @query = IF(@index_exists = 0, 'ALTER TABLE devices ADD INDEX idx_status (status)', 'SELECT "idx_status already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'devices' AND index_name = 'idx_last_seen';
SET @query = IF(@index_exists = 0, 'ALTER TABLE devices ADD INDEX idx_last_seen (last_seen)', 'SELECT "idx_last_seen already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ===============================================
-- 3. UPDATE SESSIONS TABLE
-- ===============================================

-- Add new columns to sessions (safely)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'sessions' AND column_name = 'mac_address';
SET @query = IF(@col_exists = 0, 'ALTER TABLE sessions ADD COLUMN mac_address VARCHAR(17) AFTER payment_id', 'SELECT "mac_address already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'sessions' AND column_name = 'phone';
SET @query = IF(@col_exists = 0, 'ALTER TABLE sessions ADD COLUMN phone VARCHAR(15) AFTER mac_address', 'SELECT "phone already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'sessions' AND column_name = 'ip_address';
SET @query = IF(@col_exists = 0, 'ALTER TABLE sessions ADD COLUMN ip_address VARCHAR(45) AFTER phone', 'SELECT "ip_address already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'sessions' AND column_name = 'duration_minutes';
SET @query = IF(@col_exists = 0, 'ALTER TABLE sessions ADD COLUMN duration_minutes INT DEFAULT 60 AFTER ip_address', 'SELECT "duration_minutes already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'sessions' AND column_name = 'speed_limit';
SET @query = IF(@col_exists = 0, 'ALTER TABLE sessions ADD COLUMN speed_limit VARCHAR(10) DEFAULT "2M" AFTER duration_minutes', 'SELECT "speed_limit already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rename columns for consistency (check if old column exists first)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'sessions' AND column_name = 'start_time';
SET @query = IF(@col_exists > 0, 'ALTER TABLE sessions CHANGE COLUMN start_time session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP', 'SELECT "start_time does not exist or already renamed"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'sessions' AND column_name = 'end_time';
SET @query = IF(@col_exists > 0, 'ALTER TABLE sessions CHANGE COLUMN end_time session_end TIMESTAMP NULL', 'SELECT "end_time does not exist or already renamed"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM INFORMATION_SCHEMA.COLUMNS 
WHERE table_schema = 'wifi_billing' AND table_name = 'sessions' AND column_name = 'data_used';
SET @query = IF(@col_exists > 0, 'ALTER TABLE sessions CHANGE COLUMN data_used data_used_mb BIGINT DEFAULT 0', 'SELECT "data_used does not exist or already renamed"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes (safely)
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'sessions' AND index_name = 'idx_mac_address';
SET @query = IF(@index_exists = 0, 'ALTER TABLE sessions ADD INDEX idx_mac_address (mac_address)', 'SELECT "idx_mac_address already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'sessions' AND index_name = 'idx_phone';
SET @query = IF(@index_exists = 0, 'ALTER TABLE sessions ADD INDEX idx_phone (phone)', 'SELECT "idx_phone already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists FROM INFORMATION_SCHEMA.STATISTICS 
WHERE table_schema = 'wifi_billing' AND table_name = 'sessions' AND index_name = 'idx_session_start';
SET @query = IF(@index_exists = 0, 'ALTER TABLE sessions ADD INDEX idx_session_start (session_start)', 'SELECT "idx_session_start already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ===============================================
-- 4. CREATE VIEWS
-- ===============================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS v_active_sessions;
DROP VIEW IF EXISTS v_revenue_summary;

-- Active sessions view
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

-- ===============================================
-- 5. CREATE STORED PROCEDURES
-- ===============================================

DELIMITER //

-- Expire old sessions
DROP PROCEDURE IF EXISTS expire_old_sessions//
CREATE PROCEDURE expire_old_sessions()
BEGIN
    UPDATE sessions 
    SET status = 'expired',
        session_end = NOW()
    WHERE status = 'active'
      AND TIMESTAMPDIFF(MINUTE, session_start, NOW()) >= duration_minutes;
    
    SELECT ROW_COUNT() as expired_sessions;
END//

-- Get session by MAC
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

-- Create session after payment
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

-- Register or update device
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

-- ===============================================
-- 6. VERIFICATION QUERIES
-- ===============================================

-- Show all tables
SELECT 'Tables in database:' as info;
SHOW TABLES;

-- Check payments structure
SELECT 'Payments table structure:' as info;
DESC payments;

-- Check sessions structure
SELECT 'Sessions table structure:' as info;
DESC sessions;

-- Check devices structure
SELECT 'Devices table structure:' as info;
DESC devices;

-- Show views
SELECT 'Created views:' as info;
SHOW FULL TABLES WHERE Table_type = 'VIEW';

-- Show stored procedures
SELECT 'Created stored procedures:' as info;
SHOW PROCEDURE STATUS WHERE Db = 'wifi_billing';

-- ===============================================
-- SCRIPT COMPLETE
-- ===============================================
SELECT '✅ Database update complete! All tables, views, and procedures are ready.' as status;
