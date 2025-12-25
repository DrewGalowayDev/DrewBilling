-- ===============================================
-- POSTGRESQL DATABASE EXPORT (Converted from MySQL)
-- Converted: 2025-11-21T10:23:29.035Z
-- ===============================================
-- PostgreSQL specific settings
SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

-- ===============================================
-- COMPLETE MYSQL DATABASE EXPORT
-- Database: wifi_billing
-- Exported: 2025-11-21T10:22:11.098Z
-- ===============================================

-- This export includes:
-- 1. All table structures (CREATE TABLE statements)
-- 2. All data (INSERT statements)
-- 3. All views
-- 4. All stored procedures
-- 5. All indexes and constraints
-- ===============================================


-- ===============================================
-- TABLE: admins
-- ===============================================

DROP TABLE IF EXISTS "admins";

CREATE TABLE "admins" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "role" VARCHAR(20) CHECK ("role" IN ('super_admin','admin','operator')) DEFAULT 'admin',
  "last_login" timestamp NULL DEFAULT NULL,
  "is_active" BOOLEAN DEFAULT '1',
  "two_factor_enabled" BOOLEAN DEFAULT '0',
  "two_factor_secret" VARCHAR(255) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("username"),
  UNIQUE("email")
);

-- Data for table admins
INSERT INTO "admins" ("id", "username", "email", "password", "role", "last_login", "is_active", "two_factor_enabled", "two_factor_secret", "created_at") VALUES
(1, 'admin', 'robinsonotoch7@gmail.com', '$2b$10$zG8ZfsTFRDY1AtwHSHQqJumvI45hoooufgcM4E.ObSrunO6UFhsTm', 'admin', '2025-11-20 20:50:08', true, false, NULL, '2025-10-08 20:03:25');


-- ===============================================
-- TABLE: audit_logs
-- ===============================================

DROP TABLE IF EXISTS "audit_logs";

CREATE TABLE "audit_logs" (
  "id" SERIAL PRIMARY KEY,
  "admin_id" int NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "table_affected" VARCHAR(50) DEFAULT NULL,
  "record_id" int DEFAULT NULL,
  "details" json DEFAULT NULL,
  "ip_address" VARCHAR(45) DEFAULT NULL,
  "user_agent" TEXT,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_ibfk_1" FOREIGN KEY ("admin_id") REFERENCES "admins" ("id") ON DELETE CASCADE
);

-- No data in table audit_logs


-- ===============================================
-- TABLE: customers
-- ===============================================

DROP TABLE IF EXISTS "customers";

CREATE TABLE "customers" (
  "id" SERIAL PRIMARY KEY,
  "phone" VARCHAR(15) NOT NULL,
  "email" VARCHAR(100) DEFAULT NULL,
  "name" VARCHAR(100) DEFAULT NULL,
  "total_spent" decimal(10,2) DEFAULT '0.00',
  "total_sessions" int DEFAULT '0',
  "last_purchase" timestamp NULL DEFAULT NULL,
  "status" VARCHAR(20) CHECK ("status" IN ('active','blocked','suspended')) DEFAULT 'active',
  "notes" TEXT,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("phone")
);

-- No data in table customers


-- ===============================================
-- TABLE: devices
-- ===============================================

DROP TABLE IF EXISTS "devices";

CREATE TABLE "devices" (
  "id" SERIAL PRIMARY KEY,
  "mac_address" VARCHAR(17) NOT NULL,
  "ip_address" VARCHAR(15) DEFAULT NULL,
  "device_name" VARCHAR(255) DEFAULT NULL,
  "last_seen" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "status" VARCHAR(20) CHECK ("status" IN ('active','blocked','pending')) DEFAULT 'pending',
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("mac_address")
);

-- No data in table devices


-- ===============================================
-- TABLE: notifications
-- ===============================================

DROP TABLE IF EXISTS "notifications";

CREATE TABLE "notifications" (
  "id" SERIAL PRIMARY KEY,
  "admin_id" int DEFAULT NULL,
  "type" VARCHAR(50) CHECK ("type" IN ('payment_failed','session_ended','device_blocked','low_balance','system_alert','customer_issue')) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "message" TEXT NOT NULL,
  "related_table" VARCHAR(50) DEFAULT NULL,
  "related_id" int DEFAULT NULL,
  "is_read" BOOLEAN DEFAULT '0',
  "priority" VARCHAR(20) CHECK ("priority" IN ('low','medium','high','critical')) DEFAULT 'medium',
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" timestamp NULL DEFAULT NULL,
  CONSTRAINT "notifications_ibfk_1" FOREIGN KEY ("admin_id") REFERENCES "admins" ("id") ON DELETE CASCADE
);

-- No data in table notifications


-- ===============================================
-- TABLE: packages
-- ===============================================

DROP TABLE IF EXISTS "packages";

CREATE TABLE "packages" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "duration_minutes" int NOT NULL,
  "data_limit_mb" bigint DEFAULT NULL,
  "price" decimal(10,2) NOT NULL,
  "speed_limit_mbps" int NOT NULL DEFAULT '2',
  "description" TEXT,
  "is_active" BOOLEAN DEFAULT '1',
  "sort_order" int DEFAULT '0',
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP
);

-- Data for table packages
INSERT INTO "packages" ("id", "name", "duration_minutes", "data_limit_mb", "price", "speed_limit_mbps", "description", "is_active", "sort_order", "created_at", "updated_at") VALUES
(1, '30 Minutes Basic', 30, NULL, '1.00', 2, 'Quick access for basic browsing', true, 1, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(2, '1 Hour Standard', 60, NULL, '10.00', 2, 'Perfect for casual browsing and social media', true, 2, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(3, '3 Hours Plus', 180, NULL, '15.00', 3, 'Extended browsing with better speed', true, 3, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(4, '6 Hours Pro', 360, NULL, '20.00', 4, 'Half-day access with good speed', true, 4, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(5, '12 Hours Super', 720, NULL, '25.00', 5, 'Work-day access with great speed', true, 5, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(6, '24 Hours Daily', 1440, NULL, '30.00', 5, 'Full day unlimited access', true, 6, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(7, '2 Days Weekend', 2880, NULL, '50.00', 6, 'Weekend package with premium speed', true, 7, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(8, '3 Days Extended', 4320, NULL, '80.00', 6, 'Extended stay package', true, 8, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(9, '1 Week Premium', 10080, NULL, '200.00', 6, 'Weekly unlimited premium access', true, 9, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(10, '2 Weeks Business', 20160, NULL, '300.00', 10, 'Business package with maximum speed', true, 10, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(11, '1 Month Ultimate', 43200, NULL, '500.00', 10, 'Monthly unlimited ultimate package', true, 11, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(12, '30 Minutes Basic', 30, NULL, '1.00', 2, 'Quick access for basic browsing', true, 1, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(13, '1 Hour Standard', 60, NULL, '10.00', 2, 'Perfect for casual browsing and social media', true, 2, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(14, '3 Hours Plus', 180, NULL, '15.00', 3, 'Extended browsing with better speed', true, 3, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(15, '6 Hours Pro', 360, NULL, '20.00', 4, 'Half-day access with good speed', true, 4, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(16, '12 Hours Super', 720, NULL, '25.00', 5, 'Work-day access with great speed', true, 5, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(17, '24 Hours Daily', 1440, NULL, '30.00', 5, 'Full day unlimited access', true, 6, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(18, '2 Days Weekend', 2880, NULL, '50.00', 6, 'Weekend package with premium speed', true, 7, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(19, '3 Days Extended', 4320, NULL, '80.00', 6, 'Extended stay package', true, 8, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(20, '1 Week Premium', 10080, NULL, '200.00', 6, 'Weekly unlimited premium access', true, 9, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(21, '2 Weeks Business', 20160, NULL, '300.00', 10, 'Business package with maximum speed', true, 10, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(22, '1 Month Ultimate', 43200, NULL, '500.00', 10, 'Monthly unlimited ultimate package', true, 11, '2025-11-20 19:57:53', '2025-11-20 19:57:53');


-- ===============================================
-- TABLE: payments
-- ===============================================

DROP TABLE IF EXISTS "payments";

CREATE TABLE "payments" (
  "id" SERIAL PRIMARY KEY,
  "transaction_id" VARCHAR(255) NOT NULL,
  "mpesa_receipt_number" VARCHAR(50) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed_at" timestamp NULL DEFAULT NULL,
  "phone" VARCHAR(15) DEFAULT NULL,
  "status" VARCHAR(20) DEFAULT NULL,
  "time_purchased" VARCHAR(20) DEFAULT NULL,
  "mac_address" VARCHAR(17) DEFAULT NULL,
  "amount" VARCHAR(10) DEFAULT NULL,
  "error_message" TEXT,
  UNIQUE("transaction_id")
);

-- Data for table payments
INSERT INTO "payments" ("id", "transaction_id", "mpesa_receipt_number", "created_at", "updated_at", "confirmed_at", "phone", "status", "time_purchased", "mac_address", "amount", "error_message") VALUES
(19, 'TXN_1746794382121', NULL, '2025-05-09 12:39:42', '2025-05-09 12:39:42', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '20', NULL),
(20, 'TXN_1746794679651', NULL, '2025-05-09 12:44:39', '2025-05-09 12:44:39', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '15', NULL),
(21, 'TXN_1746795021037', NULL, '2025-05-09 12:50:21', '2025-05-09 12:51:30', NULL, '254794387779', 'failed', NULL, 'UNKNOWN_MAC', '15', 'Failed to obtain access token'),
(22, 'TXN_1746795138926', NULL, '2025-05-09 12:52:18', '2025-05-09 12:53:33', NULL, '254706576238', 'failed', NULL, 'UNKNOWN_MAC', '25', 'Failed to obtain access token'),
(23, 'TXN_1746798362310', NULL, '2025-05-09 13:46:02', '2025-05-09 13:46:02', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '30', NULL),
(24, 'TXN_1746798494673', NULL, '2025-05-09 13:48:14', '2025-05-09 13:48:14', NULL, '254794387779', 'pending', NULL, 'UNKNOWN_MAC', '80', NULL),
(25, 'TXN_1746798525501', NULL, '2025-05-09 13:48:45', '2025-05-09 13:48:45', NULL, '254794387779', 'pending', NULL, 'UNKNOWN_MAC', '500', NULL),
(26, 'TXN_1746799100302', NULL, '2025-05-09 13:58:20', '2025-05-09 13:58:20', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '30', NULL),
(27, 'TXN_1746799255311', NULL, '2025-05-09 14:00:55', '2025-05-09 14:00:55', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '50', NULL),
(28, 'TXN_1746799570122', NULL, '2025-05-09 14:06:10', '2025-05-09 14:06:10', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '200', NULL),
(29, 'TXN_1746800987244', NULL, '2025-05-09 14:29:47', '2025-05-09 14:29:47', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '200', NULL),
(30, 'TXN_1746807516173', NULL, '2025-05-09 16:18:36', '2025-05-09 16:18:36', NULL, '254713240621', 'pending', NULL, 'UNKNOWN_MAC', '30', NULL),
(31, 'TXN_1746867728686', NULL, '2025-05-10 09:02:08', '2025-05-10 09:02:08', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '50', NULL),
(32, 'TXN_1746869171250', NULL, '2025-05-10 09:26:11', '2025-05-10 09:26:11', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '20', NULL),
(33, 'TXN_1746885866654', NULL, '2025-05-10 14:04:26', '2025-05-10 14:04:26', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '30', NULL),
(34, 'TXN_1746891799350', NULL, '2025-05-10 15:43:19', '2025-05-10 15:43:19', NULL, '254712345678', 'pending', NULL, 'XX:XX:XX:XX:XX:XX', '10', NULL),
(35, 'TXN_1747060372059', NULL, '2025-05-12 14:32:52', '2025-05-12 14:32:52', NULL, '254743329885', 'pending', NULL, 'UNKNOWN_MAC', '1', NULL),
(36, 'TXN_1747321761741', NULL, '2025-05-15 15:09:21', '2025-05-15 15:09:21', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '1', NULL),
(37, 'TXN_1748606436456', NULL, '2025-05-30 12:00:36', '2025-05-30 12:00:36', NULL, '254750824281', 'pending', NULL, 'UNKNOWN_MAC', '1', NULL),
(38, 'TXN_1748606478383', NULL, '2025-05-30 12:01:18', '2025-05-30 12:01:18', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '1', NULL),
(39, 'TXN_1748615134861', NULL, '2025-05-30 14:25:34', '2025-05-30 14:25:34', NULL, '254706576238', 'pending', NULL, 'UNKNOWN_MAC', '20', NULL);


-- ===============================================
-- TABLE: refunds
-- ===============================================

DROP TABLE IF EXISTS "refunds";

CREATE TABLE "refunds" (
  "id" SERIAL PRIMARY KEY,
  "payment_id" int NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" VARCHAR(20) CHECK ("status" IN ('pending','approved','rejected','completed')) DEFAULT 'pending',
  "requested_by" int NOT NULL,
  "approved_by" int DEFAULT NULL,
  "processed_at" timestamp NULL DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refunds_ibfk_1" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE RESTRICT,
  CONSTRAINT "refunds_ibfk_2" FOREIGN KEY ("requested_by") REFERENCES "admins" ("id") ON DELETE RESTRICT,
  CONSTRAINT "refunds_ibfk_3" FOREIGN KEY ("approved_by") REFERENCES "admins" ("id") ON DELETE SET NULL
);

-- No data in table refunds


-- ===============================================
-- TABLE: sessions
-- ===============================================

DROP TABLE IF EXISTS "sessions";

CREATE TABLE "sessions" (
  "id" SERIAL PRIMARY KEY,
  "device_id" int DEFAULT NULL,
  "payment_id" int DEFAULT NULL,
  "mac_address" VARCHAR(17) DEFAULT NULL,
  "phone" VARCHAR(15) DEFAULT NULL,
  "ip_address" VARCHAR(45) DEFAULT NULL,
  "duration_minutes" int DEFAULT '60',
  "speed_limit" VARCHAR(10) DEFAULT '2M',
  "session_start" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "session_end" timestamp NULL DEFAULT NULL,
  "data_used_mb" bigint DEFAULT '0',
  "status" VARCHAR(20) CHECK ("status" IN ('active','expired','terminated')) DEFAULT 'active',
  CONSTRAINT "sessions_ibfk_1" FOREIGN KEY ("device_id") REFERENCES "devices" ("id"),
  CONSTRAINT "sessions_ibfk_2" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id")
);

-- No data in table sessions


-- ===============================================
-- TABLE: network_stats
-- ===============================================

DROP TABLE IF EXISTS "network_stats";

CREATE TABLE "network_stats" (
  "id" SERIAL PRIMARY KEY,
  "session_id" int NOT NULL,
  "timestamp" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "upload_speed_mbps" decimal(10,2) DEFAULT NULL,
  "download_speed_mbps" decimal(10,2) DEFAULT NULL,
  "ping_ms" int DEFAULT NULL,
  "packet_loss_percent" decimal(5,2) DEFAULT NULL,
  "data_uploaded_mb" decimal(10,2) DEFAULT NULL,
  "data_downloaded_mb" decimal(10,2) DEFAULT NULL,
  CONSTRAINT "network_stats_ibfk_1" FOREIGN KEY ("session_id") REFERENCES "sessions" ("id") ON DELETE CASCADE
);

-- No data in table network_stats


-- ===============================================
-- TABLE: system_settings
-- ===============================================

DROP TABLE IF EXISTS "system_settings";

CREATE TABLE "system_settings" (
  "id" SERIAL PRIMARY KEY,
  "setting_key" VARCHAR(100) NOT NULL,
  "setting_value" TEXT,
  "setting_type" VARCHAR(20) CHECK ("setting_type" IN ('string','number','boolean','json')) DEFAULT 'string',
  "category" VARCHAR(50) DEFAULT NULL,
  "description" TEXT,
  "is_public" BOOLEAN DEFAULT '0',
  "updated_by" int DEFAULT NULL,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("setting_key"),
  CONSTRAINT "system_settings_ibfk_1" FOREIGN KEY ("updated_by") REFERENCES "admins" ("id") ON DELETE SET NULL
);

-- Data for table system_settings
INSERT INTO "system_settings" ("id", "setting_key", "setting_value", "setting_type", "category", "description", "is_public", "updated_by", "updated_at") VALUES
(1, 'business_name', 'Qonnect WiFi', 'string', 'general', 'Business name displayed on portal', true, NULL, '2025-11-20 19:52:53'),
(2, 'business_email', 'support@qonnectwifi.com', 'string', 'general', 'Support email address', true, NULL, '2025-11-20 19:52:53'),
(3, 'business_phone', '+254756521055', 'string', 'general', 'Support phone number', true, NULL, '2025-11-20 19:52:53'),
(4, 'currency', 'KES', 'string', 'general', 'Currency code', true, NULL, '2025-11-20 19:52:53'),
(5, 'timezone', 'Africa/Nairobi', 'string', 'general', 'System timezone', false, NULL, '2025-11-20 19:52:53'),
(6, 'session_timeout_minutes', '30', 'number', 'system', 'Admin session timeout', false, NULL, '2025-11-20 19:52:53'),
(7, 'auto_approve_devices', 'false', 'boolean', 'system', 'Auto-approve new devices', false, NULL, '2025-11-20 19:52:53'),
(8, 'enable_vouchers', 'true', 'boolean', 'features', 'Enable voucher system', false, NULL, '2025-11-20 19:52:53'),
(9, 'enable_notifications', 'true', 'boolean', 'features', 'Enable notifications', false, NULL, '2025-11-20 19:52:53'),
(10, 'max_devices_per_customer', '5', 'number', 'limits', 'Maximum devices per customer', false, NULL, '2025-11-20 19:52:53'),
(11, 'payment_retry_attempts', '3', 'number', 'payments', 'Failed payment retry attempts', false, NULL, '2025-11-20 19:52:53'),
(12, 'session_grace_period_minutes', '5', 'number', 'sessions', 'Grace period before session termination', false, NULL, '2025-11-20 19:52:53');


-- ===============================================
-- TABLE: vouchers
-- ===============================================

DROP TABLE IF EXISTS "vouchers";

CREATE TABLE "vouchers" (
  "id" SERIAL PRIMARY KEY,
  "code" VARCHAR(20) NOT NULL,
  "package_id" int NOT NULL,
  "status" VARCHAR(20) CHECK ("status" IN ('unused','used','expired')) DEFAULT 'unused',
  "generated_by" int NOT NULL,
  "used_by_phone" VARCHAR(15) DEFAULT NULL,
  "used_at" timestamp NULL DEFAULT NULL,
  "expires_at" timestamp NULL DEFAULT NULL,
  "batch_id" VARCHAR(50) DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("code"),
  CONSTRAINT "vouchers_ibfk_1" FOREIGN KEY ("package_id") REFERENCES "packages" ("id") ON DELETE RESTRICT,
  CONSTRAINT "vouchers_ibfk_2" FOREIGN KEY ("generated_by") REFERENCES "admins" ("id") ON DELETE RESTRICT
);

-- No data in table vouchers


-- ===============================================
-- VIEWS (PostgreSQL Compatible)
-- ===============================================

-- Note: Views will be created after all stored procedures are converted
-- For now, commenting out views as they use MySQL-specific functions
-- You can create simplified views in Supabase after the tables are created


-- ===============================================
-- STORED PROCEDURES (PostgreSQL Compatible)
-- ===============================================

-- Note: MySQL stored procedures need manual conversion to PostgreSQL functions
-- These are commented out for now. You can add them later as needed.
-- PostgreSQL uses different syntax for functions vs MySQL procedures.

-- Example conversion (not included):
-- CREATE OR REPLACE FUNCTION expire_old_sessions()
-- RETURNS TABLE(expired_count INT) AS $$
-- BEGIN
--     UPDATE sessions 
--     SET status = 'expired', session_end = NOW()
--     WHERE status = 'active'
--       AND EXTRACT(EPOCH FROM (NOW() - session_start))/60 >= duration_minutes;
--     
--     RETURN QUERY SELECT COUNT(*)::INT FROM sessions WHERE status = 'expired';
-- END;
-- $$ LANGUAGE plpgsql;



-- ===============================================
-- INDEXES
-- ===============================================

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_admin_id" ON "audit_logs" ("admin_id");
CREATE INDEX IF NOT EXISTS "idx_action" ON "audit_logs" ("action");
CREATE INDEX IF NOT EXISTS "idx_created_at" ON "audit_logs" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_phone" ON "customers" ("phone");
CREATE INDEX IF NOT EXISTS "idx_status_customers" ON "customers" ("status");
CREATE INDEX IF NOT EXISTS "idx_last_purchase" ON "customers" ("last_purchase");

CREATE INDEX IF NOT EXISTS "idx_mac_address" ON "devices" ("mac_address");
CREATE INDEX IF NOT EXISTS "idx_status_devices" ON "devices" ("status");
CREATE INDEX IF NOT EXISTS "idx_last_seen" ON "devices" ("last_seen");

CREATE INDEX IF NOT EXISTS "idx_session_id" ON "network_stats" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_timestamp" ON "network_stats" ("timestamp");

CREATE INDEX IF NOT EXISTS "idx_admin_id_notif" ON "notifications" ("admin_id");
CREATE INDEX IF NOT EXISTS "idx_is_read" ON "notifications" ("is_read");
CREATE INDEX IF NOT EXISTS "idx_type" ON "notifications" ("type");
CREATE INDEX IF NOT EXISTS "idx_created_at_notif" ON "notifications" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_is_active" ON "packages" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_price" ON "packages" ("price");

CREATE INDEX IF NOT EXISTS "idx_phone_payments" ON "payments" ("phone");
CREATE INDEX IF NOT EXISTS "idx_status_payments" ON "payments" ("status");
CREATE INDEX IF NOT EXISTS "idx_created_at_payments" ON "payments" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_transaction_id" ON "payments" ("transaction_id");

CREATE INDEX IF NOT EXISTS "idx_payment_id_refunds" ON "refunds" ("payment_id");
CREATE INDEX IF NOT EXISTS "idx_status_refunds" ON "refunds" ("status");

CREATE INDEX IF NOT EXISTS "idx_device_id" ON "sessions" ("device_id");
CREATE INDEX IF NOT EXISTS "idx_payment_id_sessions" ON "sessions" ("payment_id");
CREATE INDEX IF NOT EXISTS "idx_mac_address_sessions" ON "sessions" ("mac_address");
CREATE INDEX IF NOT EXISTS "idx_status_sessions" ON "sessions" ("status");
CREATE INDEX IF NOT EXISTS "idx_session_start" ON "sessions" ("session_start");

CREATE INDEX IF NOT EXISTS "idx_setting_key" ON "system_settings" ("setting_key");
CREATE INDEX IF NOT EXISTS "idx_category" ON "system_settings" ("category");

CREATE INDEX IF NOT EXISTS "idx_code" ON "vouchers" ("code");
CREATE INDEX IF NOT EXISTS "idx_status_vouchers" ON "vouchers" ("status");
CREATE INDEX IF NOT EXISTS "idx_batch_id" ON "vouchers" ("batch_id");
CREATE INDEX IF NOT EXISTS "idx_expires_at" ON "vouchers" ("expires_at");

-- ===============================================
-- MIGRATION COMPLETE
-- ===============================================
-- All tables, data, and indexes have been created
-- Views and stored procedures require manual conversion
-- See supabase-schema.sql for PostgreSQL-native implementations

