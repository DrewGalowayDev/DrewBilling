# 🔄 Complete Database Migration Guide
## MySQL → Supabase PostgreSQL

This guide provides step-by-step instructions for exporting your complete MySQL database and migrating it to Supabase PostgreSQL.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Export MySQL Database](#export-mysql-database)
3. [Convert to PostgreSQL](#convert-to-postgresql)
4. [Deploy to Supabase](#deploy-to-supabase)
5. [Verify Migration](#verify-migration)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

Before starting the migration, ensure you have:

- ✓ MySQL database running with `wifi_billing` database
- ✓ MySQL credentials (host, user, password, database, port)
- ✓ Node.js installed (for running export scripts)
- ✓ Supabase account (free tier: https://supabase.com)
- ✓ All dependencies installed: `npm install`

---

## 📤 Export MySQL Database

### Option 1: Interactive Script (Recommended)

This script will prompt you for MySQL credentials and export everything:

```bash
node scripts/exportDatabaseInteractive.js
```

**What it prompts for:**
- Host (default: localhost)
- User (default: root)
- Password (default: empty)
- Database (default: wifi_billing)
- Port (default: 3306)

**What it exports:**
- ✓ All table structures (CREATE TABLE statements)
- ✓ All data (INSERT statements)
- ✓ All views
- ✓ All stored procedures
- ✓ All functions
- ✓ All triggers
- ✓ All indexes and constraints

**Output files:**
- `database/mysql_complete_export.sql` - Complete MySQL dump
- `database/export_summary.json` - Summary of what was exported

### Option 2: Manual mysqldump

If you prefer using mysqldump directly:

```bash
# With password
mysqldump -u root -p wifi_billing --routines --triggers --events --single-transaction > database/mysql_complete_export.sql

# Without password
mysqldump -u root wifi_billing --routines --triggers --events --single-transaction > database/mysql_complete_export.sql
```

---

## 🔄 Convert to PostgreSQL

After exporting your MySQL database, convert it to PostgreSQL format:

```bash
node scripts/convertToPostgreSQL.js
```

**What it converts:**
- `AUTO_INCREMENT` → `SERIAL`/`BIGSERIAL`
- Backticks `` ` `` → Double quotes `"`
- `INT(n)` → `INTEGER`
- `TINYINT(1)` → `BOOLEAN`
- `DATETIME` → `TIMESTAMP`
- `ENUM` → `CHECK` constraints
- `KEY` → `CREATE INDEX`
- MySQL procedures → PostgreSQL functions
- Removes MySQL-specific attributes

**Output files:**
- `database/postgresql_export.sql` - PostgreSQL-compatible SQL
- `database/conversion_report.json` - Conversion details

---

## 🚀 Deploy to Supabase

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign in or create an account
3. Click "New Project"
4. Fill in:
   - **Name**: qonnect-wifi
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to Kenya (e.g., ap-southeast-1)
5. Click "Create new project"
6. Wait 2-3 minutes for project to initialize

### Step 2: Run PostgreSQL Export

1. In Supabase dashboard, click "SQL Editor" in left menu
2. Click "New Query"
3. Open `database/postgresql_export.sql` in a text editor
4. Copy ALL contents
5. Paste into Supabase SQL Editor
6. Click "Run" (bottom right)
7. Wait for execution to complete

**Expected result:**
```
Success. No rows returned
```

### Step 3: Verify Tables Created

1. Click "Table Editor" in left menu
2. You should see all tables:
   - admins
   - audit_logs
   - customers
   - devices
   - network_stats
   - notifications
   - packages
   - payments
   - refunds
   - sessions
   - system_settings
   - vouchers

### Step 4: Get Connection Details

1. Click "Project Settings" (gear icon)
2. Click "API" in left menu
3. Copy these values:

```
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 5: Update Environment Variables

Create/update `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Legacy MySQL (keep for now as backup)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wifi_billing
DB_PORT=3306
```

---

## ✅ Verify Migration

### Check Table Counts

Run this in Supabase SQL Editor:

```sql
-- Check all tables and row counts
SELECT 
    schemaname,
    tablename,
    (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
    SELECT 
        table_schema as schemaname,
        table_name as tablename,
        table_type,
        query_to_xml(format('SELECT count(*) as cnt FROM %I.%I', table_schema, table_name), false, true, '') as xml_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
) t
ORDER BY tablename;
```

### Test Queries

```sql
-- Test admins table
SELECT * FROM admins LIMIT 5;

-- Test payments table
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;

-- Test sessions table
SELECT * FROM sessions WHERE status = 'active';

-- Test packages table
SELECT * FROM packages WHERE is_active = true ORDER BY price;

-- Test views
SELECT * FROM v_dashboard_stats;
```

### Test Functions (if any)

```sql
-- List all functions
SELECT 
    routine_schema,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

---

## 🔧 Troubleshooting

### Issue: Export Script Access Denied

**Error:** `Access denied for user 'root'@'localhost'`

**Solution:**
1. Check your MySQL password
2. When prompted by script, enter correct password
3. Or grant access: `GRANT ALL PRIVILEGES ON wifi_billing.* TO 'root'@'localhost';`

### Issue: Conversion Errors

**Error:** `mysql_complete_export.sql not found`

**Solution:**
1. Run export script first: `node scripts/exportDatabaseInteractive.js`
2. Verify `database/mysql_complete_export.sql` exists
3. Then run conversion script

### Issue: PostgreSQL Syntax Errors in Supabase

**Common issues:**

1. **ENUM conversion problems**
   ```sql
   -- If ENUM doesn't convert properly, manually replace:
   status ENUM('active', 'inactive')
   -- with:
   status VARCHAR(20) CHECK (status IN ('active', 'inactive'))
   ```

2. **Stored procedure errors**
   ```sql
   -- PostgreSQL functions require explicit RETURNS clause
   CREATE OR REPLACE FUNCTION my_function()
   RETURNS void AS $$  -- Add this
   BEGIN
       -- function body
   END;
   $$ LANGUAGE plpgsql;
   ```

3. **AUTO_INCREMENT not converted**
   ```sql
   -- If you see: id INT AUTO_INCREMENT
   -- Replace with: id SERIAL PRIMARY KEY
   ```

### Issue: Missing Data After Migration

**Check:**
1. Compare row counts between MySQL and PostgreSQL
   ```sql
   -- In MySQL:
   SELECT TABLE_NAME, TABLE_ROWS 
   FROM INFORMATION_SCHEMA.TABLES 
   WHERE TABLE_SCHEMA = 'wifi_billing';
   
   -- In PostgreSQL (Supabase):
   SELECT tablename, n_live_tup 
   FROM pg_stat_user_tables;
   ```

2. Re-run export if counts don't match

### Issue: Foreign Key Constraint Errors

**Solution:**
1. Temporarily disable foreign key checks during import:
   ```sql
   SET session_replication_role = 'replica';
   -- Run your INSERT statements
   SET session_replication_role = 'origin';
   ```

2. Or import tables in correct order (parent tables first)

---

## 📊 Migration Checklist

Use this checklist to track your migration:

- [ ] Export MySQL database successfully
  - [ ] All tables exported
  - [ ] All data exported
  - [ ] All views exported
  - [ ] All procedures exported
  - [ ] Export summary generated

- [ ] Convert to PostgreSQL
  - [ ] Conversion completed without errors
  - [ ] Review postgresql_export.sql
  - [ ] Check conversion report

- [ ] Deploy to Supabase
  - [ ] Supabase project created
  - [ ] PostgreSQL export run successfully
  - [ ] All tables visible in Table Editor
  - [ ] Environment variables updated

- [ ] Verify Migration
  - [ ] Row counts match
  - [ ] Sample queries work
  - [ ] Views working
  - [ ] Functions working (if any)
  - [ ] Foreign keys intact
  - [ ] Indexes created

- [ ] Update Application
  - [ ] Install Supabase client: `npm install @supabase/supabase-js`
  - [ ] Update database queries to use Supabase
  - [ ] Test all CRUD operations
  - [ ] Test authentication
  - [ ] Test payment flow

---

## 🔐 Security Notes

1. **Never commit sensitive data:**
   - Add `.env` to `.gitignore`
   - Never commit MySQL export files with real data
   - Keep Supabase keys secure

2. **Use environment variables:**
   ```javascript
   // ✅ Good
   const supabase = createClient(
       process.env.SUPABASE_URL,
       process.env.SUPABASE_ANON_KEY
   );
   
   // ❌ Bad
   const supabase = createClient(
       'https://xxxxx.supabase.co',
       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   );
   ```

3. **Enable Row Level Security (RLS):**
   ```sql
   -- In Supabase SQL Editor
   ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
   -- Add policies as needed
   ```

---

## 📈 Next Steps After Migration

1. **Test Locally:**
   ```bash
   # Update code to use Supabase
   # Test all features
   npm run dev
   ```

2. **Deploy to Vercel:**
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Migrate to Supabase"
   git push
   
   # Deploy to Vercel
   # See SUPABASE_VERCEL_DEPLOYMENT.md
   ```

3. **Monitor:**
   - Check Supabase dashboard for usage
   - Monitor query performance
   - Set up error tracking

---

## 📞 Support

If you encounter issues:

1. Check Supabase logs:
   - Dashboard → Database → Logs

2. Check PostgreSQL compatibility:
   - https://www.postgresql.org/docs/

3. Supabase documentation:
   - https://supabase.com/docs

---

## 📝 Summary

**Files Created During Migration:**

```
database/
├── mysql_complete_export.sql      ← Full MySQL dump
├── postgresql_export.sql          ← PostgreSQL-compatible SQL
├── export_summary.json            ← Export metadata
├── conversion_report.json         ← Conversion details
├── supabase-schema.sql           ← Pre-created Supabase schema
└── MIGRATION_GUIDE.md            ← This file

scripts/
├── exportDatabaseInteractive.js   ← Interactive export tool
└── convertToPostgreSQL.js        ← MySQL→PostgreSQL converter
```

**Estimated Time:**
- Export MySQL: 2-5 minutes
- Convert to PostgreSQL: 1 minute
- Deploy to Supabase: 5-10 minutes
- Verify migration: 5-10 minutes
- **Total: ~20-30 minutes**

**Cost:**
- Supabase: **$0.00/month** (500MB storage, 2GB bandwidth)
- Vercel: **$0.00/month** (unlimited bandwidth)
- Domain (myqonnectwifi.tech): Already owned
- **Total: $0.00/month** ✅

---

✅ **You're ready to migrate!** Run the export script to get started.
