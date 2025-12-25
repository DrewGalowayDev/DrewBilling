const { supabase } = require('../config/db');
const bcrypt = require('bcryptjs');

const checkAdmins = async () => {
    console.log('🔍 CHECKING ADMIN ACCOUNTS\n');
    console.log('========================================\n');
    
    try {
        // Get all admins
        const { data: admins, error } = await supabase
            .from('admins')
            .select('*');
        
        if (error) {
            console.error('❌ Error fetching admins:', error.message);
            return;
        }
        
        if (!admins || admins.length === 0) {
            console.log('❌ NO ADMINS FOUND IN DATABASE');
            console.log('\nPlease run the fix_admin_auth.sql migration script in Supabase SQL Editor\n');
            return;
        }
        
        console.log(`✅ Found ${admins.length} admin(s):\n`);
        
        for (const admin of admins) {
            console.log(`Admin ID: ${admin.id}`);
            console.log(`  Username: ${admin.username || 'N/A'}`);
            console.log(`  Email: ${admin.email || 'N/A'}`);
            console.log(`  Full Name: ${admin.full_name || 'N/A'}`);
            console.log(`  Role: ${admin.role || 'N/A'}`);
            console.log(`  Status: ${admin.status || 'N/A'}`);
            console.log(`  Tenant ID: ${admin.tenant_id || 'N/A'}`);
            console.log(`  Password Hash: ${admin.password ? admin.password.substring(0, 20) + '...' : 'MISSING!'}`);
            console.log(`  Login Attempts: ${admin.login_attempts || 0}`);
            console.log(`  Locked Until: ${admin.locked_until || 'Not locked'}`);
            console.log(`  Last Login: ${admin.last_login || 'Never'}`);
            
            // Test password verification
            if (admin.password) {
                const testPassword = 'admin123';
                try {
                    const isMatch = await bcrypt.compare(testPassword, admin.password);
                    console.log(`  Password Test (admin123): ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
                } catch (err) {
                    console.log(`  Password Test: ❌ ERROR - ${err.message}`);
                }
            }
            console.log('');
        }
        
        console.log('========================================');
        console.log('\n💡 LOGIN CREDENTIALS TO TRY:\n');
        console.log('Option 1 (Username):');
        console.log('  Username: superadmin');
        console.log('  Password: admin123\n');
        console.log('Option 2 (Email):');
        console.log('  Email: admin@myqonnectwifi.tech');
        console.log('  Password: admin123\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    process.exit(0);
};

checkAdmins();
