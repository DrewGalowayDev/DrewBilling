require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function testAdminLogin() {
    try {
        // Check if admin exists
        const [admins] = await db.query('SELECT * FROM admins WHERE username = ?', ['admin']);
        
        if (admins.length === 0) {
            console.log('❌ Admin user not found');
            console.log('Creating admin user with password: admin123');
            
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.query(
                'INSERT INTO admins (username, password, email, role) VALUES (?, ?, ?, ?)',
                ['admin', hashedPassword, 'admin@oneal-wifi.com', 'admin']
            );
            
            console.log('✅ Admin user created successfully');
        } else {
            const admin = admins[0];
            console.log('✅ Admin user found:', {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                is_active: admin.is_active
            });
            
            // Test password
            const validPassword = await bcrypt.compare('admin123', admin.password);
            console.log(`\n🔐 Password 'admin123' is ${validPassword ? 'CORRECT ✅' : 'INCORRECT ❌'}`);
            
            if (!validPassword) {
                console.log('\n🔄 Resetting password to: admin123');
                const hashedPassword = await bcrypt.hash('admin123', 10);
                await db.query('UPDATE admins SET password = ? WHERE id = ?', [hashedPassword, admin.id]);
                console.log('✅ Password reset successfully');
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testAdminLogin();
