# Admin Authentication Fix & Password Reset System

## 🎯 Overview

This update fixes admin authentication for the multi-tenant WiFi billing system and adds a complete password reset functionality.

## 📋 What's Included

### 1. Database Changes
- **Enhanced admins table** with proper email, password, role management
- **password_reset_tokens table** for secure password resets
- **admin_activity_logs table** for security auditing
- Account lockout after 5 failed login attempts (30 min lockout)
- Password reset tokens with 1-hour expiry

### 2. New Features
✅ Email-based authentication (replaces username)
✅ Forgot password functionality
✅ Password reset with secure tokens
✅ Change password for logged-in users
✅ Login attempt tracking
✅ Account lockout protection
✅ Activity logging
✅ Multi-tenant role management (super_admin, tenant_admin, tenant_operator)

## 🚀 Installation Steps

### Step 1: Run Database Migration

1. Open Supabase SQL Editor: https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy the entire contents of `database/fix_admin_auth.sql`
5. Paste and run

This will:
- Update admins table structure
- Create password reset system
- Create activity logging
- Create 2 default admin accounts

### Step 2: Update Backend Routes

Option A: Replace existing auth.js
```bash
# Backup old file
copy routes\auth.js routes\auth.js.backup

# Replace with new version
copy routes\authNew.js routes\auth.js
```

Option B: Update index.js to use new auth routes
```javascript
// In index.js, replace:
const authRoutes = require('./routes/auth');

// With:
const authRoutes = require('./routes/authNew');
```

### Step 3: Install Required Dependencies

```bash
npm install bcryptjs jsonwebtoken crypto
```

(These should already be installed, but verify)

### Step 4: Update Environment Variables

Add to `.env` if not present:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FRONTEND_URL=http://localhost:5173
```

Generate a secure JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Redeploy to Vercel

```bash
vercel --prod
```

## 🔐 Default Credentials

After running the migration, you can login with:

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

⚠️ **IMPORTANT:** Change these passwords immediately after first login!

## 📡 API Endpoints

### 1. Login
```http
POST /auth/admin/login
Content-Type: application/json

{
  "email": "admin@myqonnectwifi.tech",
  "password": "admin123"
}

Response:
{
  "message": "Login successful",
  "token": "jwt-token-here",
  "admin": {
    "id": 1,
    "email": "admin@myqonnectwifi.tech",
    "role": "super_admin",
    ...
  }
}
```

### 2. Forgot Password
```http
POST /auth/admin/forgot-password
Content-Type: application/json

{
  "email": "admin@myqonnectwifi.tech"
}

Response:
{
  "message": "If an account exists with this email, a password reset link has been sent",
  "debug": {
    "reset_link": "http://localhost:5173/reset-password?token=..."
  }
}
```

### 3. Reset Password
```http
POST /auth/admin/reset-password
Content-Type: application/json

{
  "token": "token-from-email",
  "newPassword": "newSecurePassword123"
}

Response:
{
  "message": "Password has been reset successfully"
}
```

### 4. Change Password (Authenticated)
```http
POST /auth/admin/change-password
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "currentPassword": "admin123",
  "newPassword": "newSecurePassword123"
}

Response:
{
  "message": "Password changed successfully"
}
```

### 5. Get Current Admin Info
```http
GET /auth/admin/me
Authorization: Bearer <jwt-token>

Response:
{
  "admin": {
    "id": 1,
    "email": "admin@myqonnectwifi.tech",
    "role": "super_admin",
    "tenant": { ... }
  }
}
```

### 6. Logout
```http
POST /auth/admin/logout
Authorization: Bearer <jwt-token>

Response:
{
  "message": "Logged out successfully"
}
```

## 🔨 Utility Scripts

### Hash Custom Passwords
```bash
node scripts/hashPassword.js
```

This generates bcrypt hashes for passwords that you can use in SQL INSERT statements.

## 🎨 Frontend Integration

### Login Form
```javascript
const handleLogin = async (email, password) => {
  try {
    const response = await fetch('/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('admin', JSON.stringify(data.admin));
      // Redirect to dashboard
    } else {
      // Show error
      if (data.attempts_remaining) {
        alert(`Invalid credentials. ${data.attempts_remaining} attempts remaining`);
      }
    }
  } catch (error) {
    console.error('Login error:', error);
  }
};
```

### Forgot Password Form
```javascript
const handleForgotPassword = async (email) => {
  try {
    const response = await fetch('/auth/admin/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    alert(data.message);
    
    // In development, show the reset link
    if (data.debug?.reset_link) {
      console.log('Reset link:', data.debug.reset_link);
    }
  } catch (error) {
    console.error('Forgot password error:', error);
  }
};
```

### Reset Password Form
```javascript
const handleResetPassword = async (token, newPassword) => {
  try {
    const response = await fetch('/auth/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('Password reset successful! Please login.');
      // Redirect to login page
    } else {
      alert(data.error);
    }
  } catch (error) {
    console.error('Reset password error:', error);
  }
};
```

## 🔒 Security Features

### Account Lockout
- After 5 failed login attempts, account is locked for 30 minutes
- Lock is automatically released after timeout
- Can be manually reset by super admin

### Password Requirements
- Minimum 8 characters
- Should include mix of uppercase, lowercase, numbers, symbols (frontend validation)

### Token Security
- Reset tokens expire after 1 hour
- Tokens can only be used once
- Tokens are hashed in database (SHA-256)
- Old tokens are automatically cleaned up

### Activity Logging
All authentication events are logged:
- Login attempts (success/failure)
- Password resets
- Password changes
- Account lockouts
- Includes IP address and user agent

## 📊 Database Views

### Check Admin Activity
```sql
SELECT * FROM admin_activity_logs 
WHERE admin_id = 1 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Active Reset Tokens
```sql
SELECT * FROM password_reset_tokens 
WHERE used = false 
AND expires_at > NOW();
```

### Admin Overview
```sql
SELECT * FROM v_admin_overview;
```

## 🧪 Testing

### Test Login
```bash
curl -X POST http://localhost:3000/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@myqonnectwifi.tech","password":"admin123"}'
```

### Test Forgot Password
```bash
curl -X POST http://localhost:3000/auth/admin/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@myqonnectwifi.tech"}'
```

## 🐛 Troubleshooting

### Can't Login
1. Check admin exists: Visit `/auth/check-admin`
2. Verify password hash is correct
3. Check account status (should be 'active')
4. Check if account is locked (locked_until column)

### Reset Password Not Working
1. Check token hasn't expired (1 hour limit)
2. Verify token hasn't been used already
3. Check password_reset_tokens table

### Account Locked
Run in Supabase:
```sql
UPDATE admins 
SET login_attempts = 0, locked_until = NULL 
WHERE email = 'admin@myqonnectwifi.tech';
```

## 📝 Next Steps

1. ✅ Run database migration
2. ✅ Update backend routes
3. ✅ Test login with default credentials
4. ✅ Change default passwords
5. ⏳ Add frontend forgot password UI
6. ⏳ Set up email service for password reset links
7. ⏳ Add password strength indicator on frontend
8. ⏳ Remove debug reset links in production

## 🚨 Production Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET
- [ ] Remove debug endpoints (`/check-admin`)
- [ ] Remove reset link from forgot password response
- [ ] Set up email service for reset links
- [ ] Enable HTTPS (secure cookies)
- [ ] Test password reset flow end-to-end
- [ ] Review activity logs
- [ ] Set up monitoring for failed login attempts

## 📧 Email Service Setup (TODO)

To send password reset emails, integrate a service like:
- SendGrid
- AWS SES
- Mailgun
- Resend

Example with SendGrid:
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendResetEmail = async (email, resetLink) => {
  await sgMail.send({
    to: email,
    from: 'noreply@myqonnectwifi.tech',
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `
  });
};
```

## 💡 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review activity logs in admin_activity_logs table
3. Check console logs for errors
4. Verify all environment variables are set

---

**Last Updated:** December 7, 2025
**Version:** 1.0.0
