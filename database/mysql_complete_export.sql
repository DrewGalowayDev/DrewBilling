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

USE wifi_billing;


-- ===============================================
-- TABLE: admins
-- ===============================================

DROP TABLE IF EXISTS `admins`;

CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('super_admin','admin','operator') DEFAULT 'admin',
  `last_login` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `two_factor_enabled` tinyint(1) DEFAULT '0',
  `two_factor_secret` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table admins
INSERT INTO `admins` (`id`, `username`, `email`, `password`, `role`, `last_login`, `is_active`, `two_factor_enabled`, `two_factor_secret`, `created_at`) VALUES
(1, 'admin', 'robinsonotoch7@gmail.com', '$2b$10$zG8ZfsTFRDY1AtwHSHQqJumvI45hoooufgcM4E.ObSrunO6UFhsTm', 'admin', '2025-11-20 20:50:08', 1, 0, NULL, '2025-10-08 20:03:25');


-- ===============================================
-- TABLE: audit_logs
-- ===============================================

DROP TABLE IF EXISTS `audit_logs`;

CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `action` varchar(100) NOT NULL,
  `table_affected` varchar(50) DEFAULT NULL,
  `record_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table audit_logs


-- ===============================================
-- TABLE: customers
-- ===============================================

DROP TABLE IF EXISTS `customers`;

CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone` varchar(15) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `total_spent` decimal(10,2) DEFAULT '0.00',
  `total_sessions` int DEFAULT '0',
  `last_purchase` timestamp NULL DEFAULT NULL,
  `status` enum('active','blocked','suspended') DEFAULT 'active',
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_phone` (`phone`),
  KEY `idx_status` (`status`),
  KEY `idx_last_purchase` (`last_purchase`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table customers


-- ===============================================
-- TABLE: devices
-- ===============================================

DROP TABLE IF EXISTS `devices`;

CREATE TABLE `devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mac_address` varchar(17) NOT NULL,
  `ip_address` varchar(15) DEFAULT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `last_seen` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('active','blocked','pending') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mac_address` (`mac_address`),
  KEY `idx_status` (`status`),
  KEY `idx_last_seen` (`last_seen`),
  KEY `idx_status_date` (`status`,`last_seen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table devices


-- ===============================================
-- TABLE: network_stats
-- ===============================================

DROP TABLE IF EXISTS `network_stats`;

CREATE TABLE `network_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `upload_speed_mbps` decimal(10,2) DEFAULT NULL,
  `download_speed_mbps` decimal(10,2) DEFAULT NULL,
  `ping_ms` int DEFAULT NULL,
  `packet_loss_percent` decimal(5,2) DEFAULT NULL,
  `data_uploaded_mb` decimal(10,2) DEFAULT NULL,
  `data_downloaded_mb` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_timestamp` (`timestamp`),
  CONSTRAINT `network_stats_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table network_stats


-- ===============================================
-- TABLE: notifications
-- ===============================================

DROP TABLE IF EXISTS `notifications`;

CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int DEFAULT NULL COMMENT 'NULL means notify all admins',
  `type` enum('payment_failed','session_ended','device_blocked','low_balance','system_alert','customer_issue') NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `related_table` varchar(50) DEFAULT NULL,
  `related_id` int DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_type` (`type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table notifications


-- ===============================================
-- TABLE: packages
-- ===============================================

DROP TABLE IF EXISTS `packages`;

CREATE TABLE `packages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `duration_minutes` int NOT NULL,
  `data_limit_mb` bigint DEFAULT NULL COMMENT 'NULL means unlimited',
  `price` decimal(10,2) NOT NULL,
  `speed_limit_mbps` int NOT NULL DEFAULT '2',
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_price` (`price`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table packages
INSERT INTO `packages` (`id`, `name`, `duration_minutes`, `data_limit_mb`, `price`, `speed_limit_mbps`, `description`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, '30 Minutes Basic', 30, NULL, '1.00', 2, 'Quick access for basic browsing', 1, 1, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(2, '1 Hour Standard', 60, NULL, '10.00', 2, 'Perfect for casual browsing and social media', 1, 2, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(3, '3 Hours Plus', 180, NULL, '15.00', 3, 'Extended browsing with better speed', 1, 3, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(4, '6 Hours Pro', 360, NULL, '20.00', 4, 'Half-day access with good speed', 1, 4, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(5, '12 Hours Super', 720, NULL, '25.00', 5, 'Work-day access with great speed', 1, 5, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(6, '24 Hours Daily', 1440, NULL, '30.00', 5, 'Full day unlimited access', 1, 6, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(7, '2 Days Weekend', 2880, NULL, '50.00', 6, 'Weekend package with premium speed', 1, 7, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(8, '3 Days Extended', 4320, NULL, '80.00', 6, 'Extended stay package', 1, 8, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(9, '1 Week Premium', 10080, NULL, '200.00', 6, 'Weekly unlimited premium access', 1, 9, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(10, '2 Weeks Business', 20160, NULL, '300.00', 10, 'Business package with maximum speed', 1, 10, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(11, '1 Month Ultimate', 43200, NULL, '500.00', 10, 'Monthly unlimited ultimate package', 1, 11, '2025-11-20 19:52:53', '2025-11-20 19:52:53'),
(12, '30 Minutes Basic', 30, NULL, '1.00', 2, 'Quick access for basic browsing', 1, 1, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(13, '1 Hour Standard', 60, NULL, '10.00', 2, 'Perfect for casual browsing and social media', 1, 2, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(14, '3 Hours Plus', 180, NULL, '15.00', 3, 'Extended browsing with better speed', 1, 3, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(15, '6 Hours Pro', 360, NULL, '20.00', 4, 'Half-day access with good speed', 1, 4, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(16, '12 Hours Super', 720, NULL, '25.00', 5, 'Work-day access with great speed', 1, 5, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(17, '24 Hours Daily', 1440, NULL, '30.00', 5, 'Full day unlimited access', 1, 6, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(18, '2 Days Weekend', 2880, NULL, '50.00', 6, 'Weekend package with premium speed', 1, 7, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(19, '3 Days Extended', 4320, NULL, '80.00', 6, 'Extended stay package', 1, 8, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(20, '1 Week Premium', 10080, NULL, '200.00', 6, 'Weekly unlimited premium access', 1, 9, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(21, '2 Weeks Business', 20160, NULL, '300.00', 10, 'Business package with maximum speed', 1, 10, '2025-11-20 19:57:53', '2025-11-20 19:57:53'),
(22, '1 Month Ultimate', 43200, NULL, '500.00', 10, 'Monthly unlimited ultimate package', 1, 11, '2025-11-20 19:57:53', '2025-11-20 19:57:53');


-- ===============================================
-- TABLE: payments
-- ===============================================

DROP TABLE IF EXISTS `payments`;

CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` varchar(255) NOT NULL,
  `mpesa_receipt_number` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `time_purchased` varchar(20) DEFAULT NULL,
  `mac_address` varchar(17) DEFAULT NULL,
  `amount` varchar(10) DEFAULT NULL,
  `error_message` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_id` (`transaction_id`),
  KEY `idx_mac_address` (`mac_address`),
  KEY `idx_phone` (`phone`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_phone_status` (`phone`,`status`),
  KEY `idx_created_date` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table payments
INSERT INTO `payments` (`id`, `transaction_id`, `mpesa_receipt_number`, `created_at`, `updated_at`, `confirmed_at`, `phone`, `status`, `time_purchased`, `mac_address`, `amount`, `error_message`) VALUES
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

DROP TABLE IF EXISTS `refunds`;

CREATE TABLE `refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason` text NOT NULL,
  `status` enum('pending','approved','rejected','completed') DEFAULT 'pending',
  `requested_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `requested_by` (`requested_by`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_payment_id` (`payment_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `refunds_ibfk_1` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `refunds_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `admins` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `refunds_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table refunds


-- ===============================================
-- TABLE: sessions
-- ===============================================

DROP TABLE IF EXISTS `sessions`;

CREATE TABLE `sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `device_id` int DEFAULT NULL,
  `payment_id` int DEFAULT NULL,
  `mac_address` varchar(17) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `duration_minutes` int DEFAULT '60',
  `speed_limit` varchar(10) DEFAULT '2M',
  `session_start` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `session_end` timestamp NULL DEFAULT NULL,
  `data_used_mb` bigint DEFAULT '0',
  `status` enum('active','expired','terminated') DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `device_id` (`device_id`),
  KEY `payment_id` (`payment_id`),
  KEY `idx_mac_address` (`mac_address`),
  KEY `idx_phone` (`phone`),
  KEY `idx_session_start` (`session_start`),
  KEY `idx_status_date` (`status`,`session_start`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`),
  CONSTRAINT `sessions_ibfk_2` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table sessions


-- ===============================================
-- TABLE: system_settings
-- ===============================================

DROP TABLE IF EXISTS `system_settings`;

CREATE TABLE `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `setting_type` enum('string','number','boolean','json') DEFAULT 'string',
  `category` varchar(50) DEFAULT NULL,
  `description` text,
  `is_public` tinyint(1) DEFAULT '0',
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_category` (`category`),
  KEY `idx_setting_key` (`setting_key`),
  CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table system_settings
INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `setting_type`, `category`, `description`, `is_public`, `updated_by`, `updated_at`) VALUES
(1, 'business_name', 'Qonnect WiFi', 'string', 'general', 'Business name displayed on portal', 1, NULL, '2025-11-20 19:52:53'),
(2, 'business_email', 'support@qonnectwifi.com', 'string', 'general', 'Support email address', 1, NULL, '2025-11-20 19:52:53'),
(3, 'business_phone', '+254756521055', 'string', 'general', 'Support phone number', 1, NULL, '2025-11-20 19:52:53'),
(4, 'currency', 'KES', 'string', 'general', 'Currency code', 1, NULL, '2025-11-20 19:52:53'),
(5, 'timezone', 'Africa/Nairobi', 'string', 'general', 'System timezone', 0, NULL, '2025-11-20 19:52:53'),
(6, 'session_timeout_minutes', '30', 'number', 'system', 'Admin session timeout', 0, NULL, '2025-11-20 19:52:53'),
(7, 'auto_approve_devices', 'false', 'boolean', 'system', 'Auto-approve new devices', 0, NULL, '2025-11-20 19:52:53'),
(8, 'enable_vouchers', 'true', 'boolean', 'features', 'Enable voucher system', 0, NULL, '2025-11-20 19:52:53'),
(9, 'enable_notifications', 'true', 'boolean', 'features', 'Enable notifications', 0, NULL, '2025-11-20 19:52:53'),
(10, 'max_devices_per_customer', '5', 'number', 'limits', 'Maximum devices per customer', 0, NULL, '2025-11-20 19:52:53'),
(11, 'payment_retry_attempts', '3', 'number', 'payments', 'Failed payment retry attempts', 0, NULL, '2025-11-20 19:52:53'),
(12, 'session_grace_period_minutes', '5', 'number', 'sessions', 'Grace period before session termination', 0, NULL, '2025-11-20 19:52:53');


-- ===============================================
-- TABLE: vouchers
-- ===============================================

DROP TABLE IF EXISTS `vouchers`;

CREATE TABLE `vouchers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `package_id` int NOT NULL,
  `status` enum('unused','used','expired') DEFAULT 'unused',
  `generated_by` int NOT NULL,
  `used_by_phone` varchar(15) DEFAULT NULL,
  `used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `batch_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `package_id` (`package_id`),
  KEY `generated_by` (`generated_by`),
  KEY `idx_code` (`code`),
  KEY `idx_status` (`status`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `vouchers_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `vouchers_ibfk_2` FOREIGN KEY (`generated_by`) REFERENCES `admins` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- No data in table vouchers


-- ===============================================
-- VIEWS
-- ===============================================

DROP VIEW IF EXISTS `v_active_sessions`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_active_sessions` AS select `s`.`id` AS `id`,`s`.`mac_address` AS `mac_address`,`s`.`phone` AS `phone`,`s`.`ip_address` AS `ip_address`,`s`.`session_start` AS `session_start`,`s`.`duration_minutes` AS `duration_minutes`,`s`.`speed_limit` AS `speed_limit`,`s`.`data_used_mb` AS `data_used_mb`,timestampdiff(MINUTE,`s`.`session_start`,now()) AS `minutes_elapsed`,(`s`.`duration_minutes` - timestampdiff(MINUTE,`s`.`session_start`,now())) AS `minutes_remaining`,`p`.`amount` AS `amount`,`p`.`time_purchased` AS `time_purchased`,`p`.`status` AS `payment_status`,`d`.`device_name` AS `device_name`,`d`.`status` AS `device_status` from ((`sessions` `s` left join `payments` `p` on((`s`.`payment_id` = `p`.`id`))) left join `devices` `d` on((`s`.`device_id` = `d`.`id`))) where ((`s`.`status` = 'active') and (timestampdiff(MINUTE,`s`.`session_start`,now()) < `s`.`duration_minutes`));

DROP VIEW IF EXISTS `v_active_sessions_detail`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_active_sessions_detail` AS select `s`.`id` AS `id`,`s`.`mac_address` AS `mac_address`,`s`.`phone` AS `phone`,`s`.`ip_address` AS `ip_address`,`s`.`session_start` AS `session_start`,`s`.`session_end` AS `session_end`,`s`.`duration_minutes` AS `duration_minutes`,`s`.`speed_limit` AS `speed_limit`,`s`.`data_used_mb` AS `data_used_mb`,`s`.`status` AS `status`,timestampdiff(MINUTE,`s`.`session_start`,now()) AS `elapsed_minutes`,greatest(0,(`s`.`duration_minutes` - timestampdiff(MINUTE,`s`.`session_start`,now()))) AS `remaining_minutes`,round(((timestampdiff(MINUTE,`s`.`session_start`,now()) / `s`.`duration_minutes`) * 100),2) AS `progress_percent`,`p`.`amount` AS `amount`,`p`.`transaction_id` AS `transaction_id`,`p`.`mpesa_receipt_number` AS `mpesa_receipt_number`,`d`.`device_name` AS `device_name`,`d`.`status` AS `device_status`,`c`.`name` AS `customer_name`,`c`.`email` AS `customer_email` from (((`sessions` `s` left join `payments` `p` on((`s`.`payment_id` = `p`.`id`))) left join `devices` `d` on((`s`.`device_id` = `d`.`id`))) left join `customers` `c` on((`s`.`phone` = `c`.`phone`))) where (`s`.`status` = 'active');

DROP VIEW IF EXISTS `v_customer_analytics`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_customer_analytics` AS select `c`.`id` AS `id`,`c`.`phone` AS `phone`,`c`.`name` AS `name`,`c`.`email` AS `email`,`c`.`total_spent` AS `total_spent`,`c`.`total_sessions` AS `total_sessions`,`c`.`last_purchase` AS `last_purchase`,`c`.`status` AS `status`,`c`.`created_at` AS `created_at`,count(distinct `d`.`id`) AS `device_count`,count(distinct `s`.`id`) AS `session_count`,coalesce(sum(`s`.`data_used_mb`),0) AS `total_data_used_mb`,(to_days(curdate()) - to_days(`c`.`last_purchase`)) AS `days_since_last_purchase`,(case when (`c`.`last_purchase` is null) then 'new' when ((to_days(curdate()) - to_days(`c`.`last_purchase`)) <= 7) then 'active' when ((to_days(curdate()) - to_days(`c`.`last_purchase`)) <= 30) then 'occasional' else 'inactive' end) AS `customer_segment` from ((`customers` `c` left join `devices` `d` on((`c`.`phone` = `d`.`device_name`))) left join `sessions` `s` on((`c`.`phone` = `s`.`phone`))) group by `c`.`id`;

DROP VIEW IF EXISTS `v_dashboard_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_dashboard_stats` AS select (select count(0) from `sessions` where (`sessions`.`status` = 'active')) AS `active_sessions`,(select count(0) from `devices` where (`devices`.`status` = 'active')) AS `active_devices`,(select count(0) from `devices` where (`devices`.`status` = 'pending')) AS `pending_devices`,(select count(0) from `payments` where ((cast(`payments`.`created_at` as date) = curdate()) and (`payments`.`status` = 'confirmed'))) AS `today_payments`,(select coalesce(sum(cast(`payments`.`amount` as decimal(10,2))),0) from `payments` where ((cast(`payments`.`created_at` as date) = curdate()) and (`payments`.`status` = 'confirmed'))) AS `today_revenue`,(select count(0) from `payments` where ((cast(`payments`.`created_at` as date) = curdate()) and (`payments`.`status` = 'failed'))) AS `today_failed_payments`,(select count(0) from `customers` where (`customers`.`status` = 'active')) AS `total_customers`,(select count(0) from `notifications` where (`notifications`.`is_read` = false)) AS `unread_notifications`;

DROP VIEW IF EXISTS `v_revenue_by_package`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_revenue_by_package` AS select `p`.`id` AS `id`,`p`.`name` AS `package_name`,`p`.`price` AS `price`,count(`pay`.`id`) AS `total_sales`,sum(cast(`pay`.`amount` as decimal(10,2))) AS `total_revenue`,cast(`pay`.`created_at` as date) AS `sale_date` from (`packages` `p` left join `payments` `pay` on(((cast(`pay`.`amount` as decimal(10,2)) = `p`.`price`) and (`pay`.`status` = 'confirmed')))) where (`pay`.`created_at` >= (curdate() - interval 30 day)) group by `p`.`id`,`p`.`name`,`p`.`price`,cast(`pay`.`created_at` as date) order by `total_revenue` desc;

DROP VIEW IF EXISTS `v_revenue_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_revenue_summary` AS select cast(`payments`.`created_at` as date) AS `date`,count(0) AS `total_transactions`,sum((case when (`payments`.`status` = 'confirmed') then cast(`payments`.`amount` as decimal(10,2)) else 0 end)) AS `confirmed_revenue`,sum((case when (`payments`.`status` = 'pending') then cast(`payments`.`amount` as decimal(10,2)) else 0 end)) AS `pending_revenue`,sum((case when (`payments`.`status` = 'failed') then cast(`payments`.`amount` as decimal(10,2)) else 0 end)) AS `failed_amount`,count(distinct `payments`.`phone`) AS `unique_customers` from `payments` group by cast(`payments`.`created_at` as date) order by `date` desc;


-- ===============================================
-- STORED PROCEDURES
-- ===============================================

DROP PROCEDURE IF EXISTS `cleanup_expired_items`;

DELIMITER //

CREATE DEFINER=`root`@`localhost` PROCEDURE `cleanup_expired_items`()
BEGIN
    
    UPDATE sessions 
    SET status = 'expired', session_end = NOW()
    WHERE status = 'active'
      AND TIMESTAMPDIFF(MINUTE, session_start, NOW()) >= duration_minutes;
    
    
    UPDATE vouchers 
    SET status = 'expired'
    WHERE status = 'unused'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
    
    SELECT 
        (SELECT COUNT(*) FROM sessions WHERE status = 'expired' AND DATE(session_end) = CURDATE()) as sessions_expired,
        (SELECT COUNT(*) FROM vouchers WHERE status = 'expired' AND DATE(expires_at) = CURDATE()) as vouchers_expired;
END//

DELIMITER ;

DROP PROCEDURE IF EXISTS `create_or_update_customer`;

DELIMITER //

CREATE DEFINER=`root`@`localhost` PROCEDURE `create_or_update_customer`(
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

DELIMITER ;

DROP PROCEDURE IF EXISTS `create_session`;

DELIMITER //

CREATE DEFINER=`root`@`localhost` PROCEDURE `create_session`(
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

DELIMITER ;

DROP PROCEDURE IF EXISTS `expire_old_sessions`;

DELIMITER //

CREATE DEFINER=`root`@`localhost` PROCEDURE `expire_old_sessions`()
BEGIN
    UPDATE sessions 
    SET status = 'expired',
        session_end = NOW()
    WHERE status = 'active'
      AND TIMESTAMPDIFF(MINUTE, session_start, NOW()) >= duration_minutes;
    
    SELECT ROW_COUNT() as expired_sessions;
END//

DELIMITER ;

DROP PROCEDURE IF EXISTS `get_dashboard_stats`;

DELIMITER //

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_dashboard_stats`()
BEGIN
    SELECT * FROM v_dashboard_stats;
    
    
    SELECT 
        id, phone, amount, transaction_id, status, created_at
    FROM payments 
    ORDER BY created_at DESC 
    LIMIT 10;
    
    
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

DROP PROCEDURE IF EXISTS `get_session_by_mac`;

DELIMITER //

CREATE DEFINER=`root`@`localhost` PROCEDURE `get_session_by_mac`(IN mac VARCHAR(17))
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

DELIMITER ;

DROP PROCEDURE IF EXISTS `log_admin_action`;

DELIMITER //

CREATE DEFINER=`root`@`localhost` PROCEDURE `log_admin_action`(
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

DELIMITER ;

DROP PROCEDURE IF EXISTS `register_device`;

DELIMITER //

CREATE DEFINER=`root`@`localhost` PROCEDURE `register_device`(
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
