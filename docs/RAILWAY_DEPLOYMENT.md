# Railway Deployment Guide (Recommended for Backend)

## Why Railway for Backend?

Railway is **better suited** for backend APIs compared to Vercel because:

- ✅ **Always-on servers** (no cold starts)
- ✅ **Longer execution times** (no 10-second limit)
- ✅ **Background jobs & cron** support
- ✅ **WebSocket support**
- ✅ **Better for stateful applications**
- ✅ **Affordable pricing** ($5/month starter)

---

## 🚀 Recommended Setup

**Frontend**: Vercel (Next.js optimized)  
**Backend**: Railway (Always-on API server)  
**Database**: Supabase (Managed PostgreSQL)

---

## 📋 Prerequisites

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **GitHub Account** - Push code to repository
3. **Supabase Database** - Already configured
4. **Clerk & Stripe** accounts

---

## 🔧 Step 1: Prepare Backend for Railway

### Update `railway.json`

Already exists in your backend! Let's verify:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Verify `package.json` scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "nodemon src/server.ts"
  }
}
```

✅ Already configured!

---

## 🚂 Step 2: Deploy Backend to Railway

### Method 1: Via Railway Dashboard (Easiest)

1. **Go to Railway**
   - Visit [railway.app/new](https://railway.app/new)
   - Click "Deploy from GitHub repo"

2. **Select Repository**
   - Authorize Railway to access your GitHub
   - Select your `academy` repository
   - Click "Deploy Now"

3. **Configure Root Directory**
   - Railway will detect your project
   - Set **Root Directory**: `backend`
   - Railway auto-detects Node.js and uses `railway.json`

4. **Add Environment Variables**
   
   In Railway Dashboard → Your Service → Variables tab:

   ```env
   # Database
   DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
   
   # Clerk
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   WEBHOOK_SECRET=whsec_...
   
   # Stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   
   # Google Calendar
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=https://your-service.up.railway.app/api/calendar/callback
   
   # Email
   SENDGRID_API_KEY=SG.xxx
   FROM_EMAIL=noreply@yourdomain.com
   
   # Config
   NODE_ENV=production
   PORT=5000
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build (usually 2-3 minutes)
   - Copy your service URL: `https://[project-name].up.railway.app`

### Method 2: Via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Navigate to backend
cd backend

# Initialize project
railway init

# Link to Railway project
railway link

# Add environment variables (one by one)
railway variables set DATABASE_URL="postgresql://..."
railway variables set CLERK_SECRET_KEY="sk_test_..."
# ... add all variables

# Deploy
railway up
```

---

## 🎨 Step 3: Deploy Frontend to Vercel

### Quick Deploy

1. **Go to Vercel**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository

2. **Configure**
   ```
   Framework: Next.js
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: .next
   ```

3. **Add Environment Variables**
   ```env
   NEXT_PUBLIC_API_URL=https://[your-railway-service].up.railway.app
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

4. **Deploy**
   - Frontend will be live at `https://[your-app].vercel.app`

---

## 🔄 Step 4: Connect Frontend & Backend

### Update Backend CORS

Edit `backend/src/app.ts`:

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://[your-frontend].vercel.app',  // Add production URL
  'https://your-custom-domain.com'        // If using custom domain
];
```

Commit and push:
```bash
git add .
git commit -m "Update CORS for production"
git push
```

Railway will auto-deploy the update.

---

## 🔐 Step 5: Configure Webhooks

### Stripe Webhooks
1. Stripe Dashboard → Webhooks
2. Add endpoint: `https://[your-railway-service].up.railway.app/api/webhooks/stripe`
3. Copy signing secret → Add to Railway variables

### Clerk Webhooks
1. Clerk Dashboard → Webhooks
2. Add endpoint: `https://[your-railway-service].up.railway.app/api/webhooks/clerk`
3. Copy signing secret → Add to Railway variables

---

## ✅ Step 6: Verify Deployment

### Test Backend
```bash
curl https://[your-service].up.railway.app/api/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### Test Frontend
- Visit your Vercel URL
- Sign in
- Book a meeting
- Complete payment

---

## 📊 Monitoring

### Railway Dashboard
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Deployments**: Build and deployment history

### View Logs
```bash
# Via CLI
railway logs

# Or in Railway Dashboard → Deployments → Logs
```

---

## 💰 Pricing Comparison

### Railway
| Plan | Price | Includes |
|------|-------|----------|
| **Trial** | Free | $5 credit, no card required |
| **Hobby** | $5/month | Ideal for small apps |
| **Pro** | $20/month | Higher limits, priority support |

### Vercel
| Plan | Price | Backend Limitations |
|------|-------|---------------------|
| **Hobby** | Free | 10-second function timeout ⚠️ |
| **Pro** | $20/month | 60-second timeout |

**Recommendation**: Railway for backend, Vercel for frontend

---

## 🚀 Advanced: Custom Domain

### Add Custom Domain to Railway

1. Railway Dashboard → Your Service → Settings → Domains
2. Click "Add Domain"
3. Enter: `api.yourdomain.com`
4. Add CNAME record to your DNS:
   ```
   CNAME api.yourdomain.com → [your-service].up.railway.app
   ```
5. SSL certificate is auto-generated

### Add Custom Domain to Vercel

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add domain: `yourdomain.com`
3. Follow DNS instructions
4. Update `NEXT_PUBLIC_API_URL` to `https://api.yourdomain.com`

---

## 🔄 Auto-Deployment

Railway automatically deploys when you push to GitHub:

- **Push to `main`** → Production deployment
- **Push to `dev`** → Create separate service for staging
- **Pull requests** → Preview deployments (Pro plan)

---

## 🛠️ Troubleshooting

### Backend Not Starting

**Check Logs:**
```bash
railway logs
```

**Common Issues:**
- Missing environment variables
- Database connection timeout
- Port configuration (Railway auto-assigns `PORT`)

**Solution:** Ensure `server.ts` uses `process.env.PORT`:
```typescript
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Database Connection Fails

**Issue:** Can't connect to Supabase

**Solution:**
- Verify `DATABASE_URL` in Railway variables
- Check Supabase connection pooler settings
- Use connection pooling URL from Supabase

### Build Fails

**Check:**
```bash
# Test build locally
cd backend
npm install
npm run build
```

Fix TypeScript errors and push again.

---

## 📝 Deployment Checklist

- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured on both
- [ ] CORS updated with production URLs
- [ ] Webhooks configured (Stripe + Clerk)
- [ ] Health check endpoint working
- [ ] Database migrations run
- [ ] Custom domains configured (optional)
- [ ] SSL certificates active
- [ ] Monitoring and logs accessible

---

## 🎯 Best Practices

1. **Use separate environments**
   - Production: `main` branch
   - Staging: `dev` branch
   - Create separate Railway services for each

2. **Database Backups**
   - Supabase auto-backs up daily
   - Download manual backups before major changes

3. **Monitor Logs**
   - Check Railway logs regularly
   - Set up error alerts

4. **Version Control**
   - Tag releases: `git tag v1.0.0`
   - Use semantic versioning

---

## 🆘 Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: Community support
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)

---

## 🔗 Quick Commands

```bash
# View Railway logs
railway logs

# View Railway variables
railway variables

# Open Railway dashboard
railway open

# Deploy to Railway
railway up

# Deploy to Vercel
cd frontend
vercel --prod
```

---

**Last Updated**: November 30, 2025

**Recommended Setup**: Railway (Backend) + Vercel (Frontend) + Supabase (Database)
