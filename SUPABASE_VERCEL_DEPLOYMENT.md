# 🚀 Supabase + Vercel Deployment Guide
## myqonnectwifi.tech - 100% FREE Forever

---

## ⭐ Why This Stack?

### Supabase (Database)
- ✅ **100% FREE** - 500MB database, 2GB bandwidth/month
- ✅ PostgreSQL (more powerful than MySQL)
- ✅ Auto-generates REST APIs
- ✅ Real-time subscriptions
- ✅ Built-in authentication
- ✅ Auto-backups

### Vercel (Full-Stack Hosting)
- ✅ **100% FREE** - Unlimited bandwidth
- ✅ Supports Next.js/Node.js API routes
- ✅ Global CDN (super fast)
- ✅ Custom domain + SSL
- ✅ Auto-deploy from GitHub
- ✅ Serverless functions for backend

**Total Cost: $0.00/month Forever!**

---

## 📋 Step-by-Step Setup

### Part 1: Setup Supabase Database (10 minutes)

#### 1. Create Supabase Account
1. Go to https://supabase.com
2. Click **"Start your project"**
3. Sign up with GitHub (free, no credit card)
4. Create new organization (name it anything)

#### 2. Create New Project
1. Click **"New Project"**
2. **Project name**: `qonnect-wifi`
3. **Database Password**: (generate strong password - save it!)
4. **Region**: Choose closest to Kenya (e.g., Singapore, Frankfurt)
5. **Pricing Plan**: Free ($0/month)
6. Click **"Create new project"** (takes 2-3 minutes)

#### 3. Run Database Schema
1. In Supabase Dashboard → Click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Copy the entire content from `database/supabase-schema.sql`
4. Paste into SQL Editor
5. Click **"Run"** (bottom right)
6. Should see: ✅ "Database schema created successfully!"

#### 4. Get Connection Details
1. In Supabase Dashboard → Click **"Settings"** → **"API"**
2. Copy and save these values:
   ```
   Project URL: https://xxxxx.supabase.co
   anon/public key: eyJhbGc...
   service_role key: eyJhbGc... (keep secret!)
   ```

---

### Part 2: Prepare Your App for Vercel (5 minutes)

#### 1. Install Supabase Client
```bash
cd c:\Users\user\Oneal-wifi
npm install @supabase/supabase-js
```

#### 2. Update Environment Variables
Create `.env.local` (for local testing):
```env
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_KEY=eyJhbGc...your-service-key

# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://myqonnectwifi.tech/api/mpesa/callback

# JWT Secret
JWT_SECRET=your_random_64_character_secret_key

# MikroTik Router (optional)
ROUTER_HOST=your_router_ip
ROUTER_USER=admin
ROUTER_PASSWORD=your_password
```

#### 3. Convert API Routes to Vercel Format
Your existing Express routes will work, but we need to adapt them for Vercel's serverless functions.

I'll create the conversion files for you.

---

### Part 3: Deploy to Vercel (10 minutes)

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Prepare for Deployment
```bash
cd c:\Users\user\Oneal-wifi

# Login to Vercel
vercel login

# Initialize (follow prompts)
vercel
```

During setup:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No
- **Project name?** → qonnect-wifi
- **Directory?** → ./ (just press Enter)
- **Override settings?** → No

#### 3. Configure Environment Variables
1. Go to https://vercel.com/dashboard
2. Select your `qonnect-wifi` project
3. Click **"Settings"** → **"Environment Variables"**
4. Add all variables from `.env.local`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `MPESA_CONSUMER_KEY`
   - `MPESA_CONSUMER_SECRET`
   - `MPESA_SHORTCODE`
   - `MPESA_PASSKEY`
   - `MPESA_CALLBACK_URL`
   - `JWT_SECRET`
   - (MikroTik variables if applicable)

#### 4. Deploy to Production
```bash
vercel --prod
```

Vercel will:
- Build your frontend
- Deploy backend as serverless functions
- Give you a URL: `qonnect-wifi.vercel.app`

---

### Part 4: Connect Your Domain (15 minutes)

#### 1. Add Domain in Vercel
1. In Vercel Dashboard → Your Project → **"Settings"** → **"Domains"**
2. Click **"Add"**
3. Enter: `myqonnectwifi.tech`
4. Click **"Add"**

#### 2. Configure DNS (at your domain registrar)
Vercel will show you DNS records to add:

**For Root Domain (@):**
```
Type: A
Name: @ (or leave blank)
Value: 76.76.21.21
```

**For WWW:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Alternative (if A record doesn't work):**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

#### 3. Wait for DNS Propagation
- Usually takes 10-60 minutes
- Check status: https://dnschecker.org
- Vercel auto-provisions SSL certificate (FREE)

#### 4. Set as Primary Domain
1. In Vercel → Domains
2. Click on `myqonnectwifi.tech`
3. Click **"Set as Primary"**
4. Your app is now live! 🎉

---

## 🔄 Database Query Conversion (MySQL → PostgreSQL)

I've already converted the schema. Here are key differences to note:

### Syntax Changes
```sql
-- MySQL → PostgreSQL
AUTO_INCREMENT → SERIAL
TINYINT(1) → BOOLEAN
DATETIME → TIMESTAMP
NOW() → CURRENT_TIMESTAMP
LIMIT x,y → LIMIT y OFFSET x
```

### Node.js Query Changes (if any remain)
```javascript
// OLD (MySQL)
const [rows] = await db.query('SELECT * FROM payments WHERE id = ?', [id]);

// NEW (Supabase)
const { data, error } = await supabase
  .from('payments')
  .select('*')
  .eq('id', id)
  .single();
```

I can help convert any specific queries if needed!

---

## 📦 Project Structure for Vercel

Vercel expects this structure:
```
Oneal-wifi/
├── api/                    # Vercel Serverless Functions
│   └── *.js               # Each file = API endpoint
├── frontend/              # React app (built to /public)
│   ├── src/
│   └── dist/ → ../public/ # Symlink or copy
├── public/                # Static files (Vercel serves this)
├── vercel.json            # Vercel configuration
└── package.json
```

---

## ⚙️ Advanced Configuration

### vercel.json (already created)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/dist/$1"
    }
  ]
}
```

---

## 🔒 Security Best Practices

- ✅ Never commit `.env` or `.env.local`
- ✅ Use `SUPABASE_SERVICE_KEY` only in backend
- ✅ Use `SUPABASE_ANON_KEY` in frontend
- ✅ Enable RLS (Row Level Security) in Supabase
- ✅ Change default admin password immediately
- ✅ Use strong JWT_SECRET (64+ characters)

---

## 🧪 Testing Locally

```bash
# Install dependencies
npm install

# Start Vercel dev server
vercel dev

# Access locally
http://localhost:3000
```

---

## 📊 Monitoring & Analytics

### Supabase Dashboard
- View database tables
- Check API usage
- Monitor performance
- View logs

### Vercel Dashboard
- Deployment logs
- Function invocations
- Bandwidth usage
- Error tracking

---

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Test connection in Supabase SQL Editor
SELECT current_database();

# Check environment variables in Vercel
# Settings → Environment Variables
```

### API Routes Not Working
```bash
# Check Vercel function logs
vercel logs

# Ensure API routes are in /api folder
# Each file should export default function
```

### Domain Not Working
```bash
# Check DNS propagation
nslookup myqonnectwifi.tech

# Verify DNS records in Vercel
# Settings → Domains → [your domain]
```

### Build Fails
```bash
# Check build logs in Vercel dashboard
# Common issues:
# - Missing dependencies in package.json
# - Incorrect build command
# - Environment variables not set
```

---

## 💰 Free Tier Limits

### Supabase Free
- ✅ 500MB database
- ✅ 2GB bandwidth/month
- ✅ 50MB file storage
- ✅ 2GB database backups
- ⚠️ Project pauses after 7 days inactivity (instant resume)

### Vercel Free
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ 100 serverless function executions/day (generous)
- ✅ Unlimited team members

**Both are more than enough for a WiFi hotspot!**

---

## 🚀 Continuous Deployment

Every time you push to GitHub:
```bash
git add .
git commit -m "Update feature"
git push origin main
```

Vercel automatically:
1. Detects the push
2. Builds your app
3. Deploys to production
4. Live in ~2 minutes! 🎉

---

## 📈 Scaling Up (When Needed)

### Supabase Pro ($25/month)
- 8GB database
- 50GB bandwidth
- Point-in-time recovery
- No inactivity pause

### Vercel Pro ($20/month)
- Unlimited bandwidth
- Advanced analytics
- Preview deployments
- Better support

**But FREE tier is perfect for starting!**

---

## ✅ Success Checklist

- [ ] Supabase account created
- [ ] Database schema deployed
- [ ] Connection strings saved
- [ ] Vercel account created
- [ ] App deployed to Vercel
- [ ] Environment variables set
- [ ] Domain DNS configured
- [ ] SSL certificate active
- [ ] Test payment flow
- [ ] Admin panel accessible
- [ ] M-Pesa callbacks working

---

## 🎯 Quick Commands Reference

```bash
# Local development
vercel dev

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls

# Remove project
vercel remove qonnect-wifi
```

---

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Vercel Community**: https://github.com/vercel/vercel/discussions

---

## 🎉 Final Steps

Once everything is deployed:

1. Visit: **https://myqonnectwifi.tech**
2. Test user payment flow
3. Login to admin: **https://myqonnectwifi.tech/admin**
   - Username: `admin`
   - Password: `admin123`
   - **Change password immediately!**
4. Test M-Pesa integration
5. Share your WiFi hotspot! 🎉

---

**Your WiFi billing system will be live at:**
🌐 **https://myqonnectwifi.tech**

**Total Setup Time**: ~40 minutes
**Monthly Cost**: $0.00 (FREE forever!)
**Performance**: Global CDN, super fast! ⚡
