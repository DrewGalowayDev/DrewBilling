# Supabase + Vercel - Quick Setup Steps

## ✅ What You Need:
- Your domain: **myqonnectwifi.tech** ✓
- Supabase account (FREE)
- Vercel account (FREE)
- GitHub account

---

## 🚀 Step 1: Setup Supabase (10 min)

### 1. Create Account
1. Go to https://supabase.com
2. Sign up with GitHub (FREE, no credit card)

### 2. Create Project
1. Click "New Project"
2. Name: `qonnect-wifi`
3. Generate strong database password (SAVE IT!)
4. Region: Choose closest (e.g., Singapore)
5. Click "Create project" (wait 2-3 min)

### 3. Setup Database
1. In Supabase Dashboard → **SQL Editor**
2. Copy from `database/supabase-schema.sql`
3. Paste and click **Run**
4. Should see: ✅ Success!

### 4. Get API Keys
Go to Settings → API:
- **Project URL**: `https://xxxxx.supabase.co`
- **anon key**: `eyJhbGc...` (public key)
- **service_role key**: `eyJhbGc...` (secret - keep safe!)

Save these - you'll need them!

---

## 🚀 Step 2: Deploy to Vercel (10 min)

### 1. Install Supabase Package
```cmd
cd c:\Users\user\Oneal-wifi
npm install @supabase/supabase-js
```

### 2. Push to GitHub
```cmd
git init
git add .
git commit -m "Ready for deployment"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 3. Deploy on Vercel
1. Go to https://vercel.com
2. Sign up with GitHub (FREE)
3. Click "Add New Project"
4. Import your `Oneal-wifi` repository
5. Click "Deploy" (takes ~2 min)

### 4. Add Environment Variables
In Vercel Dashboard → Your Project → Settings → Environment Variables:

Add these:
```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGc...your-anon-key
SUPABASE_SERVICE_KEY = eyJhbGc...your-service-key
MPESA_CONSUMER_KEY = your_key
MPESA_CONSUMER_SECRET = your_secret
MPESA_SHORTCODE = your_shortcode
MPESA_PASSKEY = your_passkey
MPESA_CALLBACK_URL = https://myqonnectwifi.tech/api/mpesa/callback
JWT_SECRET = your_random_secret_64_chars
```

### 5. Redeploy
Click "Deployments" → Latest → "..." → "Redeploy"

---

## 🌐 Step 3: Connect Domain (15 min)

### 1. In Vercel
1. Go to Settings → Domains
2. Add domain: `myqonnectwifi.tech`
3. Vercel shows DNS records

### 2. In Your Domain Registrar
Add these DNS records:

**A Record:**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: Automatic
```

**CNAME Record:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Automatic
```

### 3. Wait
- DNS propagates in 10-60 minutes
- Check: https://dnschecker.org
- Vercel auto-adds FREE SSL!

---

## ✅ That's It!

**Your site will be live at:**
🌐 **https://myqonnectwifi.tech**

### Test Everything:
1. Visit main page - select package
2. Test payment flow
3. Login to admin: https://myqonnectwifi.tech/admin
   - Username: `admin`
   - Password: `admin123` (change immediately!)

---

## 💰 Cost: $0.00/month

- Supabase: FREE (500MB DB, 2GB bandwidth)
- Vercel: FREE (unlimited bandwidth)
- SSL: FREE (auto-included)
- Domain: Already paid! ✓

---

## 🆘 Need Help?

See detailed guide: **SUPABASE_VERCEL_DEPLOYMENT.md**

Common issues:
- **Build fails**: Check package.json has `@supabase/supabase-js`
- **Database errors**: Verify environment variables in Vercel
- **Domain not working**: Wait longer (up to 24hr), check DNS records
