<?php
/**
 * ----------------------------------------------------------------------------------
 * IRAN-SERVICE CPANEL CENTRAL API GATEWAY (PHP & MYSQL)
 * ----------------------------------------------------------------------------------
 * This script serves as the complete backend database synchronizer for cPanel.
 * It connects to your secure local cPanel MySQL database, entirely bypassing
 * any outer-country sanctions, dependencies, or foreign container limits.
 * 
 * Database Information:
 * - DB Name:   cubxrhuv_site.bniaz
 * - DB User:   cubxrhuv_siteuser
 * - Password:  Abbasi163@#
 * 
 * Setup Instructions:
 * 1. Create a MySQL database and user with the credentials above in cPanel.
 * 2. Execute the SQL Initialization Query (shown below) in phpMyAdmin SQL tab.
 * 3. Place this file as `cpanel-api.php` in your subdomain's active public root.
 * 4. Put the accompanying `.htaccess` file in the same directory to proxy /api requests.
 * ----------------------------------------------------------------------------------
 */

// Enable Error Reporting for troubleshooting (can turn off in production)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Security Headers & CORS policies
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS requests gracefully
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load .env file if it exists in cPanel
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            
            // Handle quoted value with potential trailing comments
            if (isset($value[0]) && ($value[0] === '"' || $value[0] === "'")) {
                $quoteChar = $value[0];
                $pos = strpos($value, $quoteChar, 1);
                if ($pos !== false) {
                    $value = substr($value, 1, $pos - 1);
                } else {
                    $value = trim($value, '"\'');
                }
            } else {
                // For unquoted values, handle trailing comments if prefixed by spaces/tabs
                $parts = preg_split('/\s+#/', $value, 2);
                $value = trim($parts[0]);
            }
            
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Database Connection Parameters
define('DB_HOST', isset($_ENV['DB_HOST']) ? $_ENV['DB_HOST'] : (getenv('DB_HOST') ?: 'localhost'));
define('DB_USER', isset($_ENV['DB_USER']) ? $_ENV['DB_USER'] : (getenv('DB_USER') ?: 'cubxrhuv_siteuser'));
define('DB_PASS', isset($_ENV['DB_PASS']) ? $_ENV['DB_PASS'] : (getenv('DB_PASS') ?: 'Abbasi163@#'));
define('DB_NAME', isset($_ENV['DB_NAME']) ? $_ENV['DB_NAME'] : (getenv('DB_NAME') ?: 'cubxrhuv_site.bniaz'));

// Try connecting using multiple database naming conventions to bypass cPanel prefix issues
$dbNames = array(DB_NAME, 'cubxrhuv_site.bniaz', 'cubxrhuv_site_bniaz', 'cubxrhuv_site');
$pdo = null;
$connectError = '';

foreach ($dbNames as $dbName) {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . $dbName . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        );
        if ($pdo) {
            break;
        }
    } catch (PDOException $e) {
        $connectError = $e->getMessage();
    }
}

if (!$pdo) {
    echo json_encode(array(
        "status" => "error",
        "error" => "Database Connection Failed after trying name options. Last error: " . $connectError
    ));
    exit;
}

// --- SILENT RELATIONAL SCHEMA & DEFAULT VALUE AUTO-SEED ENGINE ---
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `global_state` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `key_name` VARCHAR(100) NOT NULL UNIQUE,
      `state_data` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    
    $pdo->exec("INSERT IGNORE INTO `global_state` (`key_name`, `state_data`) VALUES ('central_db', '{}')");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `subscriptions` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `plan_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      `start_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      `expiry_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      `is_active` TINYINT(1) NOT NULL DEFAULT 1,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX `idx_subs_user` (`user_id`),
      INDEX `idx_subs_dates` (`expiry_date`, `is_active`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `payments` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `amount` DECIMAL(12, 2) NOT NULL,
      `gateway` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      `authority` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL UNIQUE,
      `ref_id` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL UNIQUE,
      `status` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
      `plan` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `completed_at` TIMESTAMP NULL DEFAULT NULL,
      INDEX `idx_payments_user` (`user_id`),
      INDEX `idx_payments_auth` (`authority`),
      INDEX `idx_payments_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `repair_requests` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT NOT NULL,
      `technician_id` INT DEFAULT NULL,
      `city` VARCHAR(50) NOT NULL,
      `appliance` VARCHAR(100) NOT NULL,
      `brand` VARCHAR(100) NOT NULL,
      `model` VARCHAR(100) NOT NULL,
      `problem_description` TEXT NOT NULL,
      `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
      `estimated_price` DECIMAL(12, 2) DEFAULT NULL,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX `idx_repairs_user` (`user_id`),
      INDEX `idx_repairs_tech` (`technician_id`),
      INDEX `idx_repairs_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `activity_logs` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT DEFAULT NULL,
      `activity_type` VARCHAR(100) NOT NULL,
      `description` TEXT NOT NULL,
      `ip_address` VARCHAR(45) DEFAULT NULL,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX `idx_logs_type` (`activity_type`),
      INDEX `idx_logs_user` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `settings` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `key_name` VARCHAR(100) NOT NULL UNIQUE,
      `value_data` LONGTEXT NOT NULL,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Seed standard plans/settings if empty
    $check_plans = $pdo->query("SELECT id FROM settings WHERE key_name='subscription_plans' LIMIT 1")->fetch();
    if (!$check_plans) {
        $pdo->exec("INSERT INTO `settings` (`key_name`, `value_data`) VALUES
        ('subscription_plans', '[
          {\"id\": \"1_month\", \"name\": \"اشتراک ۱ ماهه طلایی\", \"duration_days\": 30, \"price\": 49000, \"description\": \"بروزرسانی روزانه کدهای خطا و عیب‌یابی سریع\"},
          {\"id\": \"3_month\", \"name\": \"اشتراک ۳ ماهه نقره‌ای\", \"duration_days\": 90, \"price\": 129000, \"description\": \"پشتیبانی ویژه به همراه تخفیف دوره\"},
          {\"id\": \"6_month\", \"name\": \"اشتراک ۶ ماهه الماس\", \"duration_days\": 180, \"price\": 229000, \"description\": \"صرفه‌جویی عالی و دسترسی بدون محدودیت کدهای خطا\"},
          {\"id\": \"12_month\", \"name\": \"اشتراک ۱۲ ماهه یکساله لایف‌تایم\", \"duration_days\": 365, \"price\": 389000, \"description\": \"بهترین و اقتصادی‌ترین پلن برای مربیان و تعمیرکاران برتر\"}
        ]'),
        ('zarinpal_config', '{
          \"merchant_id\": \"zarinpal-test-merchant-placeholder-123456\",
          \"sandbox\": true,
          \"callback_url\": \"https://site.bniaz.ir/api/verify-payment\"
        }'),
        ('bazaar_config', '{
          \"package_name\": \"ir.bniaz.app\",
          \"client_id\": \"bazaar-client-placeholder\",
          \"client_secret\": \"bazaar-secret-placeholder\"
        }')");
    }

    // Seed default administrative account if missing
    $check_admin = $pdo->query("SELECT id FROM users WHERE phone='09121234567' LIMIT 1")->fetch();
    if (!$check_admin) {
        $pdo->exec("INSERT INTO `users` (`phone`, `password_hash`, `full_name`, `role`, `is_super_admin`)
        VALUES ('09121234567', '$2y$10\$yFEvqg7.k4lGZp.3mGgW/OQv1bWeB4dF1lX.2wIenjDszk9u6D/K.', 'مدیر کل سامانه', 'admin', 1)");
    }
} catch (Exception $schemaEx) {
    // Squelch schema exceptions to allow runtime handling if parts already exist due to indexes/Fks
}

// Route Routing Determination
$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Standardize route path
$parsedUrl = parse_url($uri);
$path = $parsedUrl['path'];

// Helper to fetch the unified central state merged with structural PostgreSQL/MySQL relation tables dynamically
function getCentralState($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT `state_data` FROM `global_state` WHERE `key_name` = 'central_db' LIMIT 1");
        $stmt->execute();
        $row = $stmt->fetch();
        if ($row) {
            $state = json_decode($row['state_data'], true) ?: array();
        } else {
            $pdo->exec("INSERT IGNORE INTO `global_state` (`key_name`, `state_data`) VALUES ('central_db', '{}')");
            $state = array();
        }
        
        // Dynamic load and merge: USERS
        $usersStmt = $pdo->query("SELECT id, phone, full_name, role, is_super_admin, city, created_at FROM users ORDER BY id ASC");
        if ($usersStmt) {
            $mysqlUsers = $usersStmt->fetchAll(PDO::FETCH_ASSOC);
            $mappedUsers = array();
            foreach ($mysqlUsers as $u) {
                $mappedUsers[] = array(
                    "id" => strval($u['id']),
                    "phone" => $u['phone'],
                    "full_name" => $u['full_name'] ? $u['full_name'] : 'کاربر گرامی',
                    "role" => $u['role'],
                    "is_super_admin" => intval($u['is_super_admin']) === 1,
                    "city" => $u['city'],
                    "created_at" => $u['created_at']
                );
            }
            $state['users'] = $mappedUsers;
        }

        // Dynamic load and merge: SUBSCRIPTIONS
        $subsStmt = $pdo->query("SELECT s.*, u.phone as phone FROM subscriptions s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC");
        if ($subsStmt) {
            $mysqlSubs = $subsStmt->fetchAll(PDO::FETCH_ASSOC);
            $mappedSubs = array();
            foreach ($mysqlSubs as $s) {
                $mappedSubs[] = array(
                    "id" => strval($s['id']),
                    "user_id" => strval($s['user_id']),
                    "user_phone" => $s['phone'],
                    "plan_name" => $s['plan_name'],
                    "start_date" => $s['start_date'],
                    "expiry_date" => $s['expiry_date'],
                    "is_active" => intval($s['is_active']) === 1
                );
            }
            $state['subscriptions'] = $mappedSubs;
        }

        // Dynamic load and merge: PAYMENTS
        $paymentsStmt = $pdo->query("SELECT p.*, u.phone as phone, u.full_name as full_name FROM payments p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC");
        if ($paymentsStmt) {
            $mysqlPayments = $paymentsStmt->fetchAll(PDO::FETCH_ASSOC);
            $mappedPayments = array();
            foreach ($mysqlPayments as $p) {
                $mappedPayments[] = array(
                    "id" => strval($p['id']),
                    "user_id" => strval($p['user_id']),
                    "user_phone" => $p['phone'],
                    "user_name" => $p['full_name'],
                    "amount" => floatval($p['amount']),
                    "gateway" => $p['gateway'],
                    "authority" => $p['authority'],
                    "ref_id" => $p['ref_id'],
                    "status" => $p['status'],
                    "plan" => $p['plan'],
                    "created_at" => $p['created_at'],
                    "completed_at" => $p['completed_at']
                );
            }
            $state['payments'] = $mappedPayments;
        }

        // Dynamic load and merge: REPAIR REQUESTS as repair orders
        $repairsStmt = $pdo->query("SELECT r.*, u.phone as phone, u.full_name as full_name FROM repair_requests r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC");
        if ($repairsStmt) {
            $mysqlRepairs = $repairsStmt->fetchAll(PDO::FETCH_ASSOC);
            $mysqlRepairsAsOrders = array();
            foreach ($mysqlRepairs as $r) {
                $statusMap = array(
                    'pending' => 'waiting',
                    'assigned' => 'accepted',
                    'in_progress' => 'repairing',
                    'completed' => 'completed',
                    'cancelled' => 'cancelled'
                );
                $status = isset($statusMap[$r['status']]) ? $statusMap[$r['status']] : 'waiting';
                
                $mysqlRepairsAsOrders[] = array(
                    "id" => "rep_" . $r['id'],
                    "customerName" => $r['full_name'] ? $r['full_name'] : 'مشتری گرامی',
                    "customerPhone" => $r['phone'],
                    "city" => $r['city'],
                    "region" => "عمومی",
                    "address" => "نیاز به هماهنگی تلفنی",
                    "category" => $r['appliance'],
                    "brand" => $r['brand'],
                    "model" => $r['model'] ? $r['model'] : 'عمومی',
                    "errorCode" => "ثبت شده آنلاین",
                    "description" => $r['problem_description'],
                    "status" => $status,
                    "date" => explode(' ', $r['created_at'])[0],
                    "timeSlot" => "هماهنگی بعدی",
                    "createdAt" => $r['created_at']
                );
            }
            
            $existingOrders = isset($state['orders']) && is_array($state['orders']) ? $state['orders'] : array();
            $allOrders = array();
            foreach ($existingOrders as $o) {
                if (isset($o['id'])) {
                    $allOrders[$o['id']] = $o;
                }
            }
            foreach ($mysqlRepairsAsOrders as $mo) {
                $allOrders[$mo['id']] = $mo;
            }
            $state['orders'] = array_values($allOrders);
        }

        return $state;
    } catch (Exception $e) {
        return array();
    }
}

// Helper to save unified state
function saveCentralState($pdo, $data) {
    // Before saving JSON dump, remove sql relation items which must stay separate in MySQL tables
    $toSave = $data;
    unset($toSave['users']);
    unset($toSave['subscriptions']);
    unset($toSave['payments']);
    
    $json = json_encode($toSave, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    $stmt = $pdo->prepare("INSERT INTO `global_state` (`key_name`, `state_data`) 
                           VALUES ('central_db', :state) 
                           ON DUPLICATE KEY UPDATE `state_data` = :state");
    return $stmt->execute(array(':state' => $json));
}

// ------------------------------------------------------------------
// ENDPOINT 1: GET DATABASE [ /api/get-database ]
// ------------------------------------------------------------------
if (strpos($path, 'get-database') !== false) {
    $state = getCentralState($pdo);
    echo json_encode($state, JSON_UNESCAPED_UNICODE);
    exit;
}

// ------------------------------------------------------------------
// ENDPOINT 2: SAVE DATABASE [ /api/save-database ]
// ------------------------------------------------------------------
if (strpos($path, 'save-database') !== false && $method === 'POST') {
    // Read raw input
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);
    
    if (!$payload || !is_array($payload)) {
        http_response_code(400);
        echo json_encode(array("status" => "error", "error" => "داده‌های دریافتی نامعتبر است."));
        exit;
    }
    
    // Fetch previous state, merge, and save
    $currentState = getCentralState($pdo);
    
    // Safe multi-user list merging by unique 'id' to prevent other users' additions/orders from being wiped
    $mergeableKeys = ['orders', 'technicians', 'errorCodes', 'spareParts', 'partPurchases', 'userFeedbacks'];
    foreach ($mergeableKeys as $key) {
        if (isset($payload[$key]) && is_array($payload[$key])) {
            $currentList = isset($currentState[$key]) && is_array($currentState[$key]) ? $currentState[$key] : [];
            $reqList = $payload[$key];
            
            if (empty($reqList)) {
                // Check if it's a global reset operation
                $emptyCount = 0;
                foreach ($mergeableKeys as $k) {
                    if (isset($payload[$k]) && empty($payload[$k])) {
                        $emptyCount++;
                    }
                }
                if ($emptyCount >= 3) {
                    $currentState[$key] = [];
                }
            } else {
                // Merge items by unique string or numeric ID
                $mergedList = [];
                foreach ($currentList as $item) {
                    if (is_array($item) && isset($item['id'])) {
                        $mergedList[$item['id']] = $item;
                    }
                }
                foreach ($reqList as $item) {
                    if (is_array($item) && isset($item['id'])) {
                        $mergedList[$item['id']] = $item;
                    }
                }
                $currentState[$key] = array_values($mergedList);
            }
            // Prevent standard loop from overwriting our safe merged list
            unset($payload[$key]);
        }
    }
    
    foreach ($payload as $key => $val) {
        $currentState[$key] = $val;
    }
    
    $success = saveCentralState($pdo, $currentState);
    
    if ($success) {
        echo json_encode(array("status" => "ok", "message" => "دیتابیس با موفقیت روی سرور ملی همگام‌سازی شد."));
    } else {
        http_response_code(500);
        echo json_encode(array("status" => "error", "error" => "خطا در بروزرسانی فیلدهای متناظر دیتابیس"));
    }
    exit;
}

// ------------------------------------------------------------------
// ENDPOINT 3: REAL OR SIMULATED SMS DISPATCH [ /api/send-sms ]
// ------------------------------------------------------------------
if (strpos($path, 'send-sms') !== false && $method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true);
    
    $rawPhone = isset($payload['phone']) ? trim($payload['phone']) : '';
    $message = isset($payload['message']) ? trim($payload['message']) : '';
    $templateVars = isset($payload['templateVars']) ? $payload['templateVars'] : null;
    $type = isset($payload['type']) ? trim($payload['type']) : 'status';
    
    if (empty($rawPhone) || empty($message)) {
        http_response_code(400);
        echo json_encode(array("status" => "error", "error" => "گیرنده یا متن پیام وارد نشده است."));
        exit;
    }

    // Clean phone formatting to English standard
    $farsiDigits = array('۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹');
    $arabicDigits = array('٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩');
    $engDigits = range(0, 9);
    $phone = str_replace($farsiDigits, $engDigits, $rawPhone);
    $phone = str_replace($arabicDigits, $engDigits, $phone);
    $phone = trim($phone);

    if (!preg_match('/^09\d{9}$/', $phone)) {
        http_response_code(400);
        echo json_encode(array("status" => "error", "error" => "فرمت شماره همراه نامعتبر است. شماره همراه باید با 09 شروع شود.")), JSON_UNESCAPED_UNICODE;
        exit;
    }
    
    // Fetch SMS settings from the database
    $currentState = getCentralState($pdo);
    $settings = isset($currentState['smsSettings']) ? $currentState['smsSettings'] : array(
        'provider' => 'simulated',
        'apiKey' => '',
        'lineNumber' => '',
        'otpPatternCode' => '',
        'statusNotificationPatternCode' => '',
        'enabled' => false
    );

    $dispatchStatus = 'sent_simulated';
    $errorMessage = '';

    if (!empty($settings['enabled']) && $settings['provider'] !== 'simulated' && !empty($settings['apiKey'])) {
        try {
            if ($settings['provider'] === 'farazsms') {
                $patternCode = ($type === 'otp') ? $settings['otpPatternCode'] : $settings['statusNotificationPatternCode'];
                $bodyPayload = array(
                    'code' => !empty($patternCode) ? $patternCode : 'DEFAULT_PATTERN',
                    'sender' => !empty($settings['lineNumber']) ? $settings['lineNumber'] : '3000505',
                    'recipient' => $phone,
                    'variable_values' => $templateVars ? $templateVars : array('code' => $message)
                );

                $ch = curl_init("https://api2.ippanel.com/api/v1/sms/pattern/normal/send");
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, array(
                    'Authorization: AccessKey ' . $settings['apiKey'],
                    'Content-Type: application/json'
                ));
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($bodyPayload));
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                
                $apiResponse = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode >= 200 && $httpCode < 300) {
                    $dispatchStatus = 'sent_real_farazsms';
                } else {
                    throw new Exception("FarazSMS IPPanel Gateway Error Status: " . $httpCode);
                }
            } else if ($settings['provider'] === 'kavenegar') {
                $patternCode = ($type === 'otp') ? $settings['otpPatternCode'] : $settings['statusNotificationPatternCode'];
                $tokenValue = ($templateVars && is_array($templateVars)) ? array_values($templateVars)[0] : $message;

                $queryParams = http_build_query(array(
                    'receptor' => $phone,
                    'token' => $tokenValue,
                    'template' => !empty($patternCode) ? $patternCode : 'DEFAULT_TEMPLATE'
                ));

                $url = "https://api.kavenegar.com/v1/" . $settings['apiKey'] . "/verify/lookup.json?" . $queryParams;

                $ch = curl_init($url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                
                $apiResponse = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode >= 200 && $httpCode < 300) {
                    $dispatchStatus = 'sent_real_kavenegar';
                } else {
                    throw new Exception("Kavenegar Gateway Error Status: " . $httpCode);
                }
            } else if ($settings['provider'] === 'smsir') {
                $patternCode = ($type === 'otp') ? $settings['otpPatternCode'] : $settings['statusNotificationPatternCode'];
                
                // Map parameters
                $parameters = array();
                if ($templateVars && is_array($templateVars)) {
                    foreach ($templateVars as $key => $val) {
                        $parameters[] = array(
                            'name' => strval($key),
                            'value' => strval($val)
                        );
                    }
                } else {
                    $parameters[] = array(
                        'name' => 'code',
                        'value' => strval($message)
                    );
                }

                $bodyPayload = array(
                    'mobile' => $phone,
                    'templateId' => intval($patternCode),
                    'parameters' => $parameters
                );

                $ch = curl_init("https://api.sms.ir/v1/send/verify");
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, array(
                    'X-API-KEY: ' . $settings['apiKey'],
                    'Accept: text/plain',
                    'Content-Type: application/json'
                ));
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($bodyPayload));
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);

                $apiResponse = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode >= 200 && $httpCode < 300) {
                    $dispatchStatus = 'sent_real_smsir';
                } else {
                    throw new Exception("SMS.ir Gateway Error Status: " . $httpCode . " Response: " . $apiResponse);
                }
            }
        } catch (Exception $e) {
            $dispatchStatus = 'failed_with_fallback';
            $errorMessage = $e->getMessage();
        }
    }
    
    // Create SMS log entry
    date_default_timezone_set('Asia/Tehran');
    $timeStr = date('H:i');
    $dateStr = date('Y-m-d');
    $logId = 'sms_' . round(microtime(true) * 1000);
    $smsLog = array(
        "id" => $logId,
        "phone" => $phone,
        "message" => $message,
        "time" => $timeStr,
        "type" => $type,
        "status" => $dispatchStatus,
        "error" => $errorMessage ? $errorMessage : null
    );
    
    // Append SMS log to unified database state
    if (!isset($currentState['smsLogs']) || !is_array($currentState['smsLogs'])) {
        $currentState['smsLogs'] = array();
    }
    array_unshift($currentState['smsLogs'], $smsLog);
    $currentState['smsLogs'] = array_slice($currentState['smsLogs'], 0, 500); // hard cap
    
    saveCentralState($pdo, $currentState);
    
    echo json_encode(array(
        "status" => "ok",
        "message" => $errorMessage ? "ارسال با شکست مواجه شد و به شبیه‌ساز منتقل گشت." : "پیامک با موفقیت ارسال شد و در سرور ثبت گردید.",
        "log" => $smsLog
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

// Fallback response for unmatched endpoints
http_response_code(404);
echo json_encode(array("status" => "error", "error" => "آدرس درخواست شده معتبر نمی‌باشد."));
exit;
