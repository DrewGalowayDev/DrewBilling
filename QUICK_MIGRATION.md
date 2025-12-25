# 🚀 Quick Migration Commands

## Step 1: Export MySQL Database
```bash
node scripts/exportDatabaseInteractive.js
```
**Output:** `database/mysql_complete_export.sql`

---

## Step 2: Convert to PostgreSQL
```bash
node scripts/convertToPostgreSQL.js
```
**Output:** `database/postgresql_export.sql`

---

## Step 3: Deploy to Supabase

1. Create project at https://supabase.com
2. Go to SQL Editor
3. Copy/paste contents of `database/postgresql_export.sql`
4. Click "Run"

---

## Step 4: Update Environment

```bash
# Add to .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

---

## Step 5: Verify

```sql
-- Run in Supabase SQL Editor
SELECT tablename, n_live_tup as rows
FROM pg_stat_user_tables
ORDER BY tablename;
```

---

## 📁 Files Generated

- `database/mysql_complete_export.sql` - Full MySQL dump
- `database/postgresql_export.sql` - PostgreSQL version
- `database/export_summary.json` - Export stats
- `database/conversion_report.json` - Conversion details

---

## ⏱️ Estimated Time

- Export: **2-5 min**
- Convert: **1 min**
- Deploy: **5-10 min**
- **Total: ~10-15 min**

---

## 💰 Cost

**$0.00/month** - Everything is FREE! 🎉

---

## 📚 Full Guide

See `database/MIGRATION_GUIDE.md` for detailed instructions.
