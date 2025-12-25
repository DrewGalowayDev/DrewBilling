# 🚀 Vercel Deployment Guide - Qonnect WiFi

## ✅ Pre-Deployment Checklist

- [x] Supabase database set up at: `https://kuusdjdjyhkxmyvafodl.supabase.co`
- [x] All tables created successfully (12 tables)
- [x] Data migrated (admins, packages, payments, system_settings)
- [x] Frontend built successfully (`frontend/dist`)
- [x] Environment variables configured
- [x] Code pushed to GitHub

---

## 📋 Deployment Steps

### Step 1: Install Vercel CLI (if not installed)

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

This will open your browser to authenticate.

### Step 3: Deploy to Vercel

```bash
vercel
```

**When prompted:**
- Set up and deploy? **Yes**
- Which scope? Select your account
- Link to existing project? **No**
- Project name: `qonnect-wifi` (or press Enter)
- In which directory is your code located? **./`** (press Enter)
- Want to override settings? **No**

### Step 4: Set Environment Variables

After initial deployment, add environment variables:

```bash
vercel env add SUPABASE_URL
# Paste: https://kuusdjdjyhkxmyvafodl.supabase.co

vercel env add SUPABASE_ANON_KEY
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dXNkamRqeWhreG15dmFmb2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTY3MzUsImV4cCI6MjA3OTI5MjczNX0.Y9kT8laNVdHEJkHdvBlPSY4002wZEPtjSQB-v1ztEr0

vercel env add JWT_SECRET
# Paste: dK8_secure_random_key_change_in_production_2024

vercel env add MPESA_CONSUMER_KEY
# Paste: 2XvtvviqoLjKhGd2erFdSYYxryzqM0YOi0pp2FEMo2gW94In

vercel env add MPESA_CONSUMER_SECRET
# Paste: nk8Bt2nLBw1YHyr5ZzIXhEDCAUWTmEeP6YASr3oz28bHAtrljrOSEZ4qqb1JFk05

vercel env add MPESA_SHORTCODE
# Paste: 174379

vercel env add MPESA_PASSKEY
# Paste: bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919

vercel env add MPESA_CALLBACK_URL
# Paste: https://your-app.vercel.app/api/mpesa/callback (update after deployment)

vercel env add MIKROTIK_HOST
# Paste: 192.168.1.1

vercel env add MIKROTIK_USER
# Paste: admin

vercel env add MIKROTIK_PASS
# Paste: your_mikrotik_password
```

**For each variable, select:**
- Environments: **Production, Preview, Development** (use spacebar to select all)

### Step 5: Deploy to Production

```bash
vercel --prod
```

### Step 6: Update M-Pesa Callback URL

After deployment, you'll get a URL like: `https://qonnect-wifi.vercel.app`

Update the M-Pesa callback:
```bash
vercel env rm MPESA_CALLBACK_URL
vercel env add MPESA_CALLBACK_URL
# Paste: https://qonnect-wifi.vercel.app/api/mpesa/callback
```

Then redeploy:
```bash
vercel --prod
```

### Step 7: Connect Custom Domain

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Domains**
4. Add domain: `myqonnectwifi.tech`
5. Follow DNS configuration instructions

**DNS Records to add at your domain registrar:**

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

Wait 5-10 minutes for DNS propagation.

---

## 🔧 Alternative: Deploy via Vercel Dashboard

### Option A: GitHub Integration (Recommended)

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository: `DrewGalowayDev/Oneal-wifi`
4. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist`
5. Add all environment variables (see Step 4 above)
6. Click "Deploy"

### Option B: Deploy with Vercel CLI (Quick)

```bash
# One-command deployment
vercel --prod --yes
```

---

## ✅ Post-Deployment Checklist

- [ ] Site is accessible at Vercel URL
- [ ] Admin login works (`admin` / check database)
- [ ] Packages are displayed on user portal
- [ ] M-Pesa payment flow works
- [ ] Custom domain connected: `myqonnectwifi.tech`
- [ ] SSL certificate active (automatic with Vercel)

---

## 🧪 Test Your Deployment

### 1. Test User Portal
```
https://your-app.vercel.app
```
- Should see package selection
- Click package → Modal opens → Enter phone → Send STK

### 2. Test Admin Dashboard
```
https://your-app.vercel.app/admin
```
- Login: `admin` / (password from database)
- Should see dashboard with stats
- Check payments table
- Check active sessions

### 3. Test API Endpoints
```bash
# Health check
curl https://your-app.vercel.app/api/health

# Get packages
curl https://your-app.vercel.app/api/packages
```

---

## 🐛 Troubleshooting

### Issue: "Function Timeout"
**Solution**: Vercel free tier has 10s timeout. Optimize database queries.

### Issue: "Module not found"
**Solution**: 
```bash
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### Issue: "Database connection failed"
**Solution**: 
1. Check Supabase URL in environment variables
2. Verify anon key is correct
3. Check Supabase dashboard → Settings → API

### Issue: "Frontend not loading"
**Solution**:
```bash
cd frontend
npm run build
cd ..
git add frontend/dist
git commit -m "Rebuild frontend"
git push
```

### Issue: "M-Pesa callback not working"
**Solution**:
1. Ensure callback URL matches deployed domain
2. Check M-Pesa sandbox logs
3. Verify shortcode and passkey are correct

---

## 📊 Expected Results

After successful deployment:

- **URL**: `https://qonnect-wifi.vercel.app` (or custom domain)
- **Admin**: `https://qonnect-wifi.vercel.app/admin`
- **API**: `https://qonnect-wifi.vercel.app/api/*`
- **Cost**: **$0.00/month** (100% FREE) ✅
- **Uptime**: 99.99%
- **SSL**: Automatic & FREE
- **Bandwidth**: Unlimited
- **Deployments**: Unlimited

---

## 🎉 You're Live!

Once deployed, your WiFi billing system will be:
- ✅ Accessible worldwide at `myqonnectwifi.tech`
- ✅ Running on Vercel's global CDN
- ✅ Using Supabase PostgreSQL database
- ✅ Accepting M-Pesa payments
- ✅ 100% FREE hosting forever
- ✅ Automatic HTTPS/SSL
- ✅ Auto-scaling based on traffic

**Total Cost: $0.00/month** 🎉

---

## 📞 Support

**Vercel Issues:**
- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord

**Supabase Issues:**
- Dashboard: https://supabase.com/dashboard
- Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com

---

## 🚀 Quick Deploy Commands

```bash
# Deploy now
vercel --prod

# Check deployment status
vercel ls

# View deployment logs
vercel logs

# Open in browser
vercel open
```

---

✨ **Ready to deploy!** Run `vercel` to get started.
