// Check existing multi-tenant setup
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkMultiTenantSetup() {
  console.log('🔍 CHECKING EXISTING MULTI-TENANT SETUP');
  console.log('='.repeat(60));
  
  try {
    // Check tenants table
    console.log('\n📋 TENANTS:');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*');
    
    if (tenantsError) {
      console.log('  ❌ Error:', tenantsError.message);
    } else if (tenants && tenants.length > 0) {
      tenants.forEach(tenant => {
        console.log(`  ✅ ${tenant.business_name} (${tenant.tenant_code})`);
        console.log(`     Status: ${tenant.status} | Tier: ${tenant.subscription_tier}`);
        console.log(`     Email: ${tenant.email}`);
      });
    } else {
      console.log('  ⚠️  No tenants found - migration not complete');
    }
    
    // Check tenant routers
    console.log('\n🌐 TENANT ROUTERS:');
    const { data: routers, error: routersError } = await supabase
      .from('tenant_routers')
      .select('*');
    
    if (routersError) {
      console.log('  ❌ Error:', routersError.message);
    } else if (routers && routers.length > 0) {
      routers.forEach(router => {
        console.log(`  ✅ ${router.name} @ ${router.host}`);
        console.log(`     Status: ${router.status}`);
      });
    } else {
      console.log('  ⚠️  No routers configured - needs setup');
    }
    
    // Check payment configs
    console.log('\n💳 PAYMENT CONFIGS:');
    const { data: configs, error: configsError } = await supabase
      .from('tenant_payment_config')
      .select('tenant_id, mpesa_shortcode, mpesa_environment, is_active');
    
    if (configsError) {
      console.log('  ❌ Error:', configsError.message);
    } else if (configs && configs.length > 0) {
      configs.forEach(config => {
        console.log(`  ✅ Tenant ${config.tenant_id}: Shortcode ${config.mpesa_shortcode}`);
        console.log(`     Environment: ${config.mpesa_environment} | Active: ${config.is_active}`);
      });
    } else {
      console.log('  ⚠️  No payment configs - needs setup');
    }
    
    // Check if existing data has tenant_id
    console.log('\n📊 DATA MIGRATION STATUS:');
    
    const { data: admins } = await supabase
      .from('admins')
      .select('id, tenant_id, username, role');
    
    const adminsWithTenant = admins?.filter(a => a.tenant_id !== null).length || 0;
    console.log(`  Admins: ${adminsWithTenant}/${admins?.length || 0} have tenant_id`);
    if (admins && admins.length > 0) {
      admins.forEach(admin => {
        console.log(`    - ${admin.username}: tenant_id=${admin.tenant_id}, role=${admin.role || 'not set'}`);
      });
    }
    
    const { data: payments } = await supabase
      .from('payments')
      .select('id, tenant_id', { count: 'exact', head: true });
    
    const { count: paymentsWithTenant } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .not('tenant_id', 'is', null);
    
    console.log(`  Payments: ${paymentsWithTenant || 0}/${payments?.length || 0} have tenant_id`);
    
    const { data: packages } = await supabase
      .from('packages')
      .select('id, tenant_id', { count: 'exact', head: true });
    
    const { count: packagesWithTenant } = await supabase
      .from('packages')
      .select('id', { count: 'exact', head: true })
      .not('tenant_id', 'is', null);
    
    console.log(`  Packages: ${packagesWithTenant || 0}/${packages?.length || 0} have tenant_id`);
    
    // Determine migration status
    console.log('\n' + '='.repeat(60));
    
    if (!tenants || tenants.length === 0) {
      console.log('❌ MIGRATION STATUS: NOT STARTED');
      console.log('   Action: Run the full migration SQL script');
    } else if (adminsWithTenant === 0 || paymentsWithTenant === 0) {
      console.log('⚠️  MIGRATION STATUS: INCOMPLETE');
      console.log('   Tables exist but data not migrated');
      console.log('   Action: Run data migration section of SQL script');
    } else {
      console.log('✅ MIGRATION STATUS: COMPLETE');
      console.log('   Multi-tenant system is ready to use!');
      console.log('\n📝 NEXT STEPS:');
      console.log('   1. Update router password in tenant_routers');
      console.log('   2. Update M-Pesa credentials in tenant_payment_config');
      console.log('   3. Update backend routes with tenant middleware');
      console.log('   4. Test with tenant header: X-Tenant-Code: qonnect-default');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkMultiTenantSetup();
