# 🚀 QUICK START - Admin Authentication Fix

## What's Been Created

### 1. Files Created
✅ `database/fix_admin_auth.sql` - Complete database migration
✅ `routes/authNew.js` - New authentication routes with password reset
✅ `scripts/hashPassword.js` - Utility to hash passwords
✅ `ADMIN_AUTH_SETUP.md` - Complete documentation

### 2. What Gets Fixed
- ✅ Admin login issues
- ✅ Multi-tenant admin management
- ✅ Password reset functionality
- ✅ Account security (lockout after 5 attempts)
- ✅ Activity logging

## 🎯 3-Step Setup

### Step 1: Run Database Migration

1. Open: https://supabase.com/dashboard
2. Go to: SQL Editor
3. Copy & Paste: `database/fix_admin_auth.sql`
4. Click: Run

**Expected Result:**
```
✅ Admins Table Structure updated
✅ Created Admins: 2 accounts
✅ Password Reset System: enabled
✅ Admin Activity Log: enabled
```

### Step 2: Update Backend

Replace old auth routes with new one:

```bash
# Backup old file
copy routes\auth.js routes\auth.js.backup

# Use new auth routes
copy routes\authNew.js routes\auth.js
```

### Step 3: Redeploy

```bash
vercel --prod
```

## 🔐 Login Credentials

After migration, use these credentials:

### Super Admin
```
Email: admin@myqonnectwifi.tech
Password: admin123
```

### Tenant Admin
```
Email: tenantadmin@myqonnectwifi.tech
Password: admin123
```

⚠️ **Change these passwords immediately after first login!**

## ✅ Test It

### 1. Test Login
Visit: `https://your-app.vercel.app/admin`

Try logging in with the credentials above.

### 2. Check Admins Exist
Visit: `https://your-app.vercel.app/auth/check-admin`

Should show:
```json
{
  "count": 2,
  "admins": [
    {
      "id": 1,
      "email": "admin@myqonnectwifi.tech",
      "role": "super_admin",
      ...
    },
    ...
  ]
}
```

### 3. Test Password Reset
```bash
curl -X POST https://your-app.vercel.app/auth/admin/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@myqonnectwifi.tech"}'
```

Should return a reset link in the response (in development mode).

## 🆘 Troubleshooting

### Problem: Can't login
**Solution:** Make sure you ran the SQL migration and created the admin accounts.

Check admins exist:
```sql
SELECT * FROM admins;
```

### Problem: "Account is locked"
**Solution:** Reset the lockout in Supabase SQL Editor:
```sql
UPDATE admins 
SET login_attempts = 0, locked_until = NULL 
WHERE email = 'admin@myqonnectwifi.tech';
```

### Problem: "Invalid email or password"
**Solution:** 
1. Verify email is exact (lowercase)
2. Verify password is `admin123`
3. Check password hash is correct in database

### Problem: Backend not using new routes
**Solution:** Make sure you replaced `routes/auth.js` with the new version, or update `index.js` to use `authNew.js`

## 📋 What Changed in Database

### New Tables
- `password_reset_tokens` - Stores password reset tokens
- `admin_activity_logs` - Logs all admin actions

### Updated Tables
- `admins` - Added columns:
  - `email` (UNIQUE)
  - `full_name`
  - `phone`
  - `role` (super_admin, tenant_admin, tenant_operator)
  - `status` (active, inactive, suspended)
  - `reset_token` & `reset_token_expires`
  - `last_login`
  - `login_attempts`
  - `locked_until`
  - `permissions` (JSONB)

## 🎨 Frontend TODO

You'll need to add these pages:

1. **Login Page** - Use email instead of username
2. **Forgot Password Page** - Request reset link
3. **Reset Password Page** - Set new password with token
4. **Change Password Page** - Change password when logged in

See `ADMIN_AUTH_SETUP.md` for frontend code examples.

## 📞 Need Help?

1. Check `ADMIN_AUTH_SETUP.md` for detailed docs
2. Look at `routes/authNew.js` for API examples
3. Check activity logs: `SELECT * FROM admin_activity_logs ORDER BY created_at DESC LIMIT 10;`

---

**Next:** After verifying login works, proceed with frontend integration for password reset UI.
