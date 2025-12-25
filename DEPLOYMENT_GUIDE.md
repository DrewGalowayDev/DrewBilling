# 🚀 Deployment Guide - Qonnect WiFi Billing System

## Domain: myqonnectwifi.tech

---

## ⭐ RECOMMENDED: Render.com (100% FREE)

### Why Render?
- ✅ **Completely FREE tier** (750 hours/month web service)
- ✅ Free PostgreSQL database (1GB storage)
- ✅ Custom domain with free SSL
- ✅ Auto-deploys from GitHub
- ✅ Simple setup, no credit card required
- ⚠️ Note: Need to migrate from MySQL to PostgreSQL (easy)

### Step-by-Step Deployment

#### 1. Prepare Your Repository
```bash
cd c:\Users\user\Oneal-wifi
git init
git add .
git commit -m "Initial commit for deployment"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

#### 2. Sign Up on Render
1. Go to https://render.com
2. Sign up with GitHub (no credit card needed!)
3. Authorize Render to access your repositories

#### 3. Create PostgreSQL Database (FREE)
1. Click **"New +"** → **"PostgreSQL"**
2. Name: `qonnect-wifi-db`
3. Database: `wifi_billing`
4. User: `wifi_admin`
5. Region: Choose closest to your location
6. Plan: **FREE**
7. Click **"Create Database"**
8. Copy the **Internal Database URL** (starts with `postgres://`)

#### 4. Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Choose your `Oneal-wifi` repository
4. Configuration:
   - **Name**: `qonnect-wifi`
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: **FREE** (750 hours/month)

#### 5. Set Environment Variables
In Render Web Service → Environment:

```env
NODE_ENV=production
PORT=10000

# Database (Copy from Render PostgreSQL Internal Database URL)
DATABASE_URL=postgres://user:pass@host:5432/wifi_billing
# Or break it down:
DB_HOST=your-postgres-host.render.com
DB_USER=wifi_admin
DB_PASSWORD=your_generated_password
DB_NAME=wifi_billing
DB_PORT=5432

# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://qonnect-wifi.onrender.com/api/mpesa/callback

# JWT Secret (generate random string)
JWT_SECRET=your_random_64_character_secret_key_here

# MikroTik Router (if applicable)
ROUTER_HOST=your_router_ip
ROUTER_USER=admin
ROUTER_PASSWORD=your_router_password
```

#### 6. Deploy Backend + Frontend
Render will automatically:
- Install dependencies
- Build frontend (`npm run build`)
- Start backend (`npm start`)
- Deploy in ~5 minutes

#### 7. Connect Your Domain
1. In Render Dashboard → Your Web Service → **Settings**
2. Scroll to **Custom Domain**
3. Click **"Add Custom Domain"**
4. Enter: `myqonnectwifi.tech`
5. Render provides DNS records:
   ```
   Type: CNAME
   Name: myqonnectwifi.tech (or @)
   Value: qonnect-wifi.onrender.com
   
   Type: CNAME
   Name: www
   Value: qonnect-wifi.onrender.com
   ```
6. Add these records in your domain registrar's DNS settings
7. Wait 10-60 minutes for DNS propagation
8. Render auto-provisions FREE SSL certificate

#### 8. Initialize Database
Once deployed, use Render Shell or connect to PostgreSQL:
```bash
# Option 1: Use Render Shell (in dashboard)
# Go to your Web Service → Shell tab
node scripts/createAdmin.js

# Option 2: Connect to PostgreSQL directly
# Use the PSQL Command from Render PostgreSQL dashboard
# Run the SQL from database/schema.sql (after converting to PostgreSQL)
```

---

## 🌟 ALTERNATIVE 1: Split Deployment (Better Performance, 100% FREE)

### Frontend on Vercel + Backend on Render

#### **Frontend Deployment (Vercel)**

1. **Prepare Frontend**
```bash
cd frontend
npm install
npm run build
```

2. **Deploy to Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod
```

3. **Configure Environment**
Create `frontend/.env.production`:
```env
VITE_API_URL=https://api.myqonnectwifi.tech
```

4. **Connect Domain**
- In Vercel dashboard → Settings → Domains
- Add `myqonnectwifi.tech`
- Follow DNS instructions
- **100% FREE, unlimited bandwidth**

#### **Backend Deployment (Render)**

1. **Deploy Backend Only**
- Create Render Web Service
- Deploy from same repo
- Set build command to skip frontend build

2. **Set Environment Variables** (same as above)

3. **Connect Subdomain**
- Add custom domain: `api.myqonnectwifi.tech`
- Update DNS:
  ```
  Type: CNAME
  Name: api
  Value: qonnect-wifi-api.onrender.com
  ```

---

## 🌟 ALTERNATIVE 2: Netlify (Frontend) + Render (Backend)

Same as Vercel option, but use Netlify for frontend:
- **Netlify**: 100% free, 100GB bandwidth/month
- **Render Backend**: Free tier
- Both support custom domains with free SSL

---

## 🔧 Other Free Platform Options

### **Option 3: Koyeb (100% FREE)**

#### Advantages:
- ✅ **Completely free tier** (no credit card)
- ✅ 2 free web services + 1 database
- ✅ Custom domain + SSL
- ✅ Auto-deploy from GitHub
- ✅ Support for Docker

#### Steps:
1. Push code to GitHub
2. Go to https://koyeb.com
3. Sign up with GitHub
4. Create **Web Service** from GitHub repo
5. Add PostgreSQL database
6. Connect domain in dashboard

---

### **Option 4: Fly.io**

#### Advantages:
- ✅ Free tier: 3 VMs, 3GB storage
- ✅ Always-on (doesn't sleep)
- ✅ Custom domain + SSL
- ⚠️ Requires credit card (for verification, not charged)

#### Steps:
1. Install Fly CLI:
```bash
# Windows PowerShell
iwr https://fly.io/install.ps1 -useb | iex
```

2. Login and Deploy:
```bash
fly auth login
fly launch
fly deploy
```

3. Add Domain:
```bash
fly certs add myqonnectwifi.tech
```

---

### **Option 5: Cyclic.sh (Backend) - EASIEST!**

#### Advantages:
- ✅ **100% FREE, no credit card**
- ✅ Supports MySQL (via external DB)
- ✅ 3-click deployment from GitHub
- ✅ Custom domain included
- ✅ No sleep/spin-down

#### Steps:
1. Go to https://cyclic.sh
2. Connect GitHub repository
3. Click Deploy
4. Add environment variables
5. Connect domain

**Perfect for your Node.js backend!**

---

## 🔒 Security Checklist Before Deployment

- [ ] Change default admin password after first deployment
- [ ] Set strong JWT_SECRET (random 64-character string)
- [ ] Enable HTTPS only (auto with Railway/Vercel)
- [ ] Add CORS configuration for your domain
- [ ] Set secure M-Pesa callback URL
- [ ] Never commit `.env` file (already in .gitignore)
- [ ] Enable database backups (Railway/Render provide this)

---

## 📊 Post-Deployment Testing

1. **Test Domain**
```bash
curl https://myqonnectwifi.tech
```

2. **Test API**
```bash
curl https://myqonnectwifi.tech/api/health
# or
curl https://api.myqonnectwifi.tech/health
```

3. **Test Admin Login**
- Go to: `https://myqonnectwifi.tech/admin`
- Login: `admin` / `admin123`
- **Change password immediately!**

4. **Test M-Pesa Payment**
- Go to main page
- Select package
- Enter test phone number
- Verify STK push

---

## 🔄 Continuous Deployment

Railway/Vercel automatically redeploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Railway/Vercel auto-deploys in ~2 minutes
```

---

## 💰 Cost Breakdown (100% FREE Options)

### ⭐ Option 1: Render (All-in-One) - RECOMMENDED
- **Render Web Service**: 100% FREE (750 hours/month)
- **Render PostgreSQL**: 100% FREE (1GB storage)
- **Custom Domain + SSL**: FREE
- **Total**: **$0.00/month** ✅
- **Limitation**: Sleeps after 15 min inactivity (wakes in 30s)

### ⭐ Option 2: Vercel + Render Split - BEST PERFORMANCE
- **Vercel Frontend**: 100% FREE (unlimited bandwidth)
- **Render Backend**: 100% FREE (750 hours/month)
- **Render PostgreSQL**: 100% FREE (1GB)
- **Total**: **$0.00/month** ✅
- **Benefit**: Frontend never sleeps, super fast globally

### Option 3: Cyclic + Vercel
- **Cyclic Backend**: 100% FREE (no sleep!)
- **Vercel Frontend**: 100% FREE
- **External MySQL**: Use FreeSQLDatabase.com (free 5MB)
- **Total**: **$0.00/month** ✅
- **Benefit**: Backend never sleeps

### Domain Cost
- **myqonnectwifi.tech**: Already paid for 1 year ✅
- **SSL Certificate**: FREE (auto-provisioned)

---

## 🆘 Troubleshooting

### Build Fails
```bash
# Check build logs in Render/Vercel dashboard
# Common fix: ensure package.json scripts are correct
# Ensure all dependencies are in package.json (not devDependencies)
```

### Database Connection Error
```bash
# Verify environment variables in Render dashboard
# Check DATABASE_URL or individual DB_* variables
# For PostgreSQL, ensure connection string format:
# postgres://user:password@host:5432/database
```

### Domain Not Working
```bash
# Check DNS propagation
dig myqonnectwifi.tech

# Wait up to 24 hours for full propagation
# Try clearing browser cache
```

### M-Pesa Callback Fails
```bash
# Update callback URL in M-Pesa portal
# Format: https://myqonnectwifi.tech/api/mpesa/callback
# Ensure Render logs show incoming requests
# Check that service is not sleeping (Render free tier sleeps)
```

### Service Sleeping (Render Free Tier)
```bash
# Render free tier sleeps after 15 minutes of inactivity
# First request after sleep takes ~30 seconds to wake up
# Solutions:
# 1. Use Cron-job.org to ping your site every 10 minutes
# 2. Upgrade to paid plan ($7/month for always-on)
# 3. Use Cyclic.sh instead (never sleeps, free)
```

---

## 📈 Monitoring

### Render Dashboard
- View logs in real-time
- Monitor service status
- Check deployment history
- View metrics (paid plans)

### Free Monitoring Tools
- **UptimeRobot**: Monitor uptime (free)
- **Sentry**: Error tracking (free tier)
- **LogRocket**: Session replay (free tier)

---

## 🎯 Quick Start Summary - 100% FREE

**Fastest Path to Production (Render.com):**

1. ✅ Push code to GitHub
2. ✅ Sign up on Render.com (no credit card!)
3. ✅ Create PostgreSQL database (free)
4. ✅ Create Web Service from GitHub repo
5. ✅ Set environment variables (Database URL, M-Pesa, JWT)
6. ✅ Let Render deploy automatically (~5 min)
7. ✅ Connect myqonnectwifi.tech domain
8. ✅ Wait for DNS propagation (10-60 min)
9. ✅ Access your live site!

**Estimated Time**: 30-60 minutes (mostly waiting for DNS)
**Total Cost**: $0.00 (completely FREE)

---

**Best Performance Path (Vercel + Render):**

1. ✅ Deploy frontend to Vercel (3 minutes)
2. ✅ Deploy backend to Render (5 minutes)
3. ✅ Point myqonnectwifi.tech to Vercel
4. ✅ Point api.myqonnectwifi.tech to Render
5. ✅ Both 100% FREE, no credit card required!

---

## 📞 Support

- Render: https://render.com/docs
- Vercel: https://vercel.com/support  
- Cyclic: https://docs.cyclic.sh
- DNS Help: Check your domain registrar docs

## 🔄 MySQL to PostgreSQL Migration

If using Render's free PostgreSQL, you'll need to convert MySQL syntax:

**Key Differences:**
```sql
# MySQL → PostgreSQL
AUTO_INCREMENT → SERIAL
DATETIME → TIMESTAMP
NOW() → CURRENT_TIMESTAMP
TINYINT(1) → BOOLEAN
```

I can help you convert the database schema if needed!

---

**Your WiFi billing system will be live at:**
🌐 **https://myqonnectwifi.tech** 🎉
