const db = require('../config/db');

async function initializePackagesAndVouchers() {
    try {
        console.log('🔧 Initializing packages and vouchers tables...');

        // Create packages table
        await db.query(`
            CREATE TABLE IF NOT EXISTS packages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                duration VARCHAR(50) NOT NULL,
                duration_minutes INT NOT NULL,
                speed_limit VARCHAR(20) NOT NULL,
                description TEXT,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_amount (amount)
            )
        `);
        console.log('✅ Packages table created/verified');

        // Create vouchers table
        await db.query(`
            CREATE TABLE IF NOT EXISTS vouchers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                voucher_code VARCHAR(50) NOT NULL UNIQUE,
                amount DECIMAL(10, 2) NOT NULL,
                duration_minutes INT NOT NULL,
                speed_limit VARCHAR(20) NOT NULL DEFAULT '5M',
                description TEXT,
                status ENUM('active', 'used', 'expired') DEFAULT 'active',
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NULL,
                used_by_phone VARCHAR(20),
                used_by_mac VARCHAR(20),
                used_at TIMESTAMP NULL,
                FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
                INDEX idx_status (status),
                INDEX idx_voucher_code (voucher_code)
            )
        `);
        console.log('✅ Vouchers table created/verified');

        console.log('🎉 Database initialization complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
}

initializePackagesAndVouchers();
