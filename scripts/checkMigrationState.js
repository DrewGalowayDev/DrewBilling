// Pre-migration database check
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkDatabaseState() {
  console.log('📊 CHECKING CURRENT DATABASE STATE');
  console.log('='.repeat(50));
  
  try {
    // Check if multi-tenant tables already exist
    const { data: existingTenants, error: tenantError } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true });
    
    if (!tenantError) {
      console.log('⚠️  WARNING: Multi-tenant tables already exist!');
      console.log('   This migration may have already been run.');
      console.log('   Please verify before proceeding.\n');
    } else {
      console.log('✅ Multi-tenant tables not found (expected for first-time migration)\n');
    }
    
    // Check current record counts
    console.log('Current Record Counts:');
    const tables = ['admins', 'payments', 'sessions', 'devices', 'customers', 'packages', 'vouchers'];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`  ✅ ${table.padEnd(15)} : ${count || 0} records`);
      } else {
        console.log(`  ❌ ${table.padEnd(15)} : Error - ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Database check complete');
    console.log('\n📝 NEXT STEP: Run the SQL migration in Supabase');
    console.log('   1. Open https://supabase.com/dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Copy contents of database/multi_tenant_migration.sql');
    console.log('   4. Click "Run"');
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  }
}

checkDatabaseState();
