# 🚀 MULTI-TENANT MIGRATION - EXECUTION GUIDE

## STATUS: ✅ Ready to Run

Your database is ready for multi-tenant migration. Tables don't exist yet, so this is a clean migration.

---

## 📝 STEP-BY-STEP INSTRUCTIONS

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard
2. Select your project: `kuusdjdjyhkxmyvafodl`
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

---

### Step 2: Copy Migration Script

The migration script is in: `database/multi_tenant_migration.sql`

**Open the file and copy ALL contents** (it's about 350 lines)

---

### Step 3: Paste and Run

1. Paste the entire SQL script into the SQL Editor
2. Click **"Run"** button (or press Ctrl+Enter)
3. Wait for execution (should take 30-60 seconds)

---

### Step 4: Verify Success

You should see messages like:
```
✅ Tenants Created:
✅ Routers Configured:
✅ Payment Configs:
✅ Record Migration Summary:
✅ Multi-tenant migration complete!
```

---

## ⚠️ EXPECTED CHANGES

The migration will:

1. **Create 3 new tables:**
   - `tenants` - Store all your clients
   - `tenant_routers` - Router configs per client
   - `tenant_payment_config` - M-Pesa settings per client

2. **Add `tenant_id` column to existing tables:**
   - admins
   - payments
   - sessions
   - devices
   - customers
   - packages
   - vouchers
   - audit_logs
   - notifications
   - network_stats
   - refunds

3. **Create default tenant:**
   - Code: `qonnect-default`
   - Business: "Qonnect WiFi"
   - Status: Active
   - Tier: Premium

4. **Migrate existing data:**
   - All your current 37 payments → assigned to default tenant
   - All 22 packages → assigned to default tenant
   - 1 admin account → assigned to default tenant

5. **Create useful views:**
   - `v_tenant_statistics` - Tenant analytics
   - `v_router_health` - Router status monitoring

---

## 🔐 POST-MIGRATION ACTIONS

After the migration completes successfully, you'll need to:

### Action 1: Update Router Password
```sql
UPDATE tenant_routers 
SET password = 'YOUR_REAL_MIKROTIK_PASSWORD'
WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default');
```

### Action 2: Update M-Pesa Credentials
```sql
UPDATE tenant_payment_config
SET 
  mpesa_consumer_key = 'YOUR_CONSUMER_KEY',
  mpesa_consumer_secret = 'YOUR_CONSUMER_SECRET',
  mpesa_passkey = 'YOUR_PASSKEY',
  callback_url = 'https://oneal-wifi-pfe7vc1ax-drewgalowaydevs-projects.vercel.app/api/payment/callback',
  validation_url = 'https://oneal-wifi-pfe7vc1ax-drewgalowaydevs-projects.vercel.app/api/payment/validation'
WHERE tenant_id = (SELECT id FROM tenants WHERE tenant_code = 'qonnect-default');
```

---

## ✅ VERIFICATION SCRIPT

After migration, run this to verify:

```bash
node scripts/checkMultiTenantStatus.js
```

You should see:
```
✅ MIGRATION STATUS: COMPLETE
   Multi-tenant system is ready to use!
```

---

## 🆘 TROUBLESHOOTING

### Error: "permission denied"
- Solution: Make sure you're using the correct Supabase credentials
- Check: Your SUPABASE_URL and SUPABASE_ANON_KEY in .env

### Error: "column already exists"
- Solution: Migration may have already been partially run
- Action: Contact me to create a rollback/fix script

### Error: "timeout"
- Solution: The migration script is large
- Action: Try running it in smaller sections
- Alternative: Run via Supabase dashboard API

---

## 🎉 SUCCESS CRITERIA

Migration is successful when:

- ✅ All 3 new tables created
- ✅ All existing tables have `tenant_id` column
- ✅ 1 default tenant exists
- ✅ All existing data assigned to default tenant
- ✅ No errors in SQL output
- ✅ Verification script shows "COMPLETE"

---

## 📞 READY?

**I'm ready to assist if you encounter any issues!**

Just let me know:
1. ✅ Migration completed successfully
2. ⚠️ Got an error (share the error message)
3. ❓ Need help with post-migration steps

**Let's do this! 🚀**
