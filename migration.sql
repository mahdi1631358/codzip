-- ----------------------------------------------------------------------------------
-- IRAN-SERVICE SYSTEM UPGRADE DATABASE MIGRATION SCRIPT (MySQL / cPanel Compatible)
-- ----------------------------------------------------------------------------------
-- This script provisions the complete, robust, normalization-standard relational schema
-- with Foreign Key relationships, security logs, settings parameters, indexes,
-- and subscription controls.
-- ----------------------------------------------------------------------------------

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `repair_requests`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. USERS TABLE
-- Consolidated client-technician-admin lookup store containing secure hashed credentials.
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` ENUM('client', 'technician', 'admin') NOT NULL DEFAULT 'client',
  `is_super_admin` TINYINT(1) NOT NULL DEFAULT 0,
  `city` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_phone` (`phone`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. SUBSCRIPTIONS TABLE
-- Tracks the starting, expiration, active state, and plan tiers of premium status.
CREATE TABLE `subscriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `plan_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, -- '1_month', '3_month', '6_month', '12_month'
  `start_date` TIMESTAMP NOT NULL,
  `expiry_date` TIMESTAMP NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_subs_user` (`user_id`),
  INDEX `idx_subs_dates` (`expiry_date`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PAYMENTS TABLE
-- Logs transactional metadata originating from Zarinpal redirect callback flows or Café Bazaar app receipt tokens.
CREATE TABLE `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL, -- Amount in Tomans (or Rials)
  `gateway` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, -- 'zarinpal' or 'bazaar'
  `authority` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL UNIQUE, -- Zarinpal transaction request token
  `ref_id` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL UNIQUE, -- Zarinpal payment code tracking or Bazaar client token
  `status` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  `plan` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, -- '1_month', '3_month', '6_month', '12_month'
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_payments_user` (`user_id`),
  INDEX `idx_payments_auth` (`authority`),
  INDEX `idx_payments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. REPAIR REQUEST {REPAIR_REQUESTS} TABLE
-- Organizes hardware/appliance diagnostics and professional technicians assignment details.
CREATE TABLE `repair_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `technician_id` INT DEFAULT NULL,
  `city` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `appliance` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `model` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `problem_description` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending', -- 'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
  `estimated_price` DECIMAL(12, 2) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_repairs_user` (`user_id`),
  INDEX `idx_repairs_tech` (`technician_id`),
  INDEX `idx_repairs_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ACTIVITY LOGS TABLE
-- Records detailed audit security checks, logins, modifications, and administrative changes.
CREATE TABLE `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `activity_type` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, -- 'login', 'logout', 'premium_purchase', 'repair_request_created', 'admin_config_changed'
  `description` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` VARCHAR(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_logs_type` (`activity_type`),
  INDEX `idx_logs_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. SETTINGS TABLE
-- General server dynamic configuration parameters for payment portals, sms configs, and subscription prices.
CREATE TABLE `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key_name` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `value_data` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL, -- JSON holding parameters
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. INITIAL VALUES SEEDING
-- Seed default dynamic app settings: subscription prices, SMS configuration and API gateway statuses.
INSERT INTO `settings` (`key_name`, `value_data`) VALUES
('subscription_plans', '[
  {"id": "1_month", "name": "اشتراک ۱ ماهه طلایی", "duration_days": 30, "price": 49000, "description": "بروزرسانی روزانه کدهای خطا و عیب‌یابی سریع"},
  {"id": "3_month", "name": "اشتراک ۳ ماهه نقره‌ای", "duration_days": 90, "price": 129000, "description": "پشتیبانی ویژه به همراه تخفیف دوره"},
  {"id": "6_month", "name": "اشتراک ۶ ماهه الماس", "duration_days": 180, "price": 229000, "description": "صرفه‌جویی عالی و دسترسی بدون محدودیت کدهای خطا"},
  {"id": "12_month", "name": "اشتراک ۱۲ ماهه یکساله لایف‌تایم", "duration_days": 365, "price": 389000, "description": "بهترین و اقتصادی‌ترین پلن برای مربیان و تعمیرکاران برتر"}
]'),
('zarinpal_config', '{
  "merchant_id": "zarinpal-test-merchant-placeholder-123456",
  "sandbox": true,
  "callback_url": "https://site.bniaz.ir/api/verify-payment"
}'),
('bazaar_config', '{
  "package_name": "ir.bniaz.app",
  "client_id": "bazaar-client-placeholder",
  "client_secret": "bazaar-secret-placeholder"
}');

-- Seed a standard secure hashed administrator account (using password 'Abbasi163@#' for immediate setup)
-- Hashed using standard password_hash() in PHP: password_hash('Abbasi163@#', PASSWORD_BCRYPT) 
-- '$2y$10$yFEvqg7.k4lGZp.3mGgW/OQv1bWeB4dF1lX.2wIenjDszk9u6D/K.' is the hash of Abbasi163@#
INSERT INTO `users` (`phone`, `password_hash`, `full_name`, `role`, `is_super_admin`)
VALUES ('09121234567', '$2y$10$yFEvqg7.k4lGZp.3mGgW/OQv1bWeB4dF1lX.2wIenjDszk9u6D/K.', 'مدیر کل سامانه', 'admin', 1)
ON DUPLICATE KEY UPDATE `is_super_admin` = 1;
