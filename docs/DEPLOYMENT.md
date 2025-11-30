# 🚀 Vercel Deployment Guide

## Project Structure

```
academy/
├── frontend/           # Next.js 14 application (Deploy to Vercel)
├── backend/           # Express API (Deploy as Vercel Serverless Functions)
├── database/          # SQL files organized by purpose
│   ├── migrations/    # Schema changes & migrations
│   ├── seeds/         # Test data & initial data
│   └── utilities/     # Diagnostic & cleanup queries
├── docs/              # All documentation
│   ├── setup/         # Setup guides
│   ├── features/      # Feature documentation
│   ├── fixes/         # Fix logs
│   └── api/           # API documentation
└── DEPLOYMENT.md      # This file
```

---

## 🎯 Deployment Overview

### **Frontend**: Next.js App → Vercel
- **Framework**: Next.js 14 with App Router
- **Platform**: Vercel (optimized for Next.js)
- **Build Time**: ~2-3 minutes

### **Backend**: Express API → Vercel Serverless Functions
- **Framework**: Express.js + TypeScript
- **Platform**: Vercel Serverless
- **Execution**: On-demand serverless functions

### **Database**: Supabase PostgreSQL
- **Platform**: Supabase (already hosted)
- **Connection**: Remote PostgreSQL connection

---

## 📋 Prerequisites

### 1. Accounts Needed
- ✅ **Vercel Account** (free tier works): [vercel.com](https://vercel.com)
- ✅ **GitHub Account**: Repository must be pushed to GitHub
- ✅ **Supabase Account**: Database already set up
- ✅ **Clerk Account**: Authentication already configured

### 2. Environment Variables
Prepare these from your `.env` files:

#### Frontend Environment Variables
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_BACKEND_URL=https://your-backend.vercel.app
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
```

#### Backend Environment Variables
```env
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...
FRONTEND_URL=https://your-frontend.vercel.app
PORT=5001
NODE_ENV=production
```

---

## 🚀 Step 1: Prepare Your Repository

### A. Push to GitHub (if not already done)
```bash
cd c:\Users\sadil\Desktop\acad

# Initialize git (if needed)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Vercel deployment"

# Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

### B. Update .gitignore
Make sure these are in your root `.gitignore`:
```
node_modules/
.env
.env.local
.next/
dist/
*.log
.DS_Store
```

---

## 🎨 Step 2: Deploy Frontend to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"

2. **Import from GitHub**
   - Select your repository: `academy`
   - Vercel will auto-detect Next.js

3. **Configure Project**
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add all frontend env vars from above
   - **Important**: Add to all environments (Production, Preview, Development)

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - You'll get a URL like: `https://your-app.vercel.app`

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Navigate to frontend
cd frontend

# Deploy
vercel

# Follow prompts:
# - Set up and deploy: Y
# - Which scope: (your account)
# - Link to existing project: N
# - Project name: academy-frontend
# - Directory: ./
# - Override settings: N

# For production deployment:
vercel --prod
```

---

## 🔧 Step 3: Deploy Backend to Vercel Serverless

### A. Create `vercel.json` in Backend

Create `backend/vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.ts"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### B. Update `package.json` in Backend

Ensure your `backend/package.json` has:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "vercel-build": "npm run build"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### C. Deploy Backend via Vercel Dashboard

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"

2. **Import SAME Repository Again**
   - Select your repository: `academy`
   - This time for backend

3. **Configure Project**
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Add Environment Variables**
   - Add all backend env vars from above
   - **Critical**: Include all Supabase, Clerk, Razorpay variables

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - You'll get a URL like: `https://your-api.vercel.app`

### D. Update Frontend Environment

After backend deployment:

1. Go to **Frontend Project** in Vercel
2. Settings → Environment Variables
3. Update `NEXT_PUBLIC_BACKEND_URL` to your backend Vercel URL:
   ```
   https://your-api.vercel.app
   ```
4. Redeploy frontend (Deployments → ... → Redeploy)

---

## 🗄️ Step 4: Set Up Database (Supabase)

Your database is already on Supabase, but ensure migrations are run:

### Run Migrations in Order

1. **Go to Supabase Dashboard**
   - Visit [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in sidebar

3. **Run Migration Files in Order**

   Execute these files from `database/migrations/` folder **IN THIS ORDER**:

   ```sql
   -- 1. Base tables
   RUN: create-tables.sql
   
   -- 2. Meeting tables
   RUN: create-meeting-tables.sql
   
   -- 3. Teacher tables
   RUN: CREATE_TEACHER_TABLES.sql
   
   -- 4. Views and pricing
   RUN: CREATE_AVAILABLE_TIME_SLOTS_VIEW.sql
   RUN: CREATE_TEACHER_PRICING_TABLE.sql
   
   -- 5. Enhancements
   RUN: ADD_TEACHER_AVAILABILITY_FIXED.sql
   RUN: ADD_DEADLINE_TO_SLOTS.sql
   RUN: ADD_PERFORMANCE_INDEXES.sql
   
   -- 6. Final optimization
   RUN: PERFORMANCE_OPTIMIZATION_INDEXES.sql
   ```

4. **Run Seed Data** (Optional - for testing)
   ```sql
   -- From database/seeds/ folder
   RUN: add-test-users.sql
   RUN: add-teacher-profiles.sql
   RUN: add-default-time-slots.sql
   ```

---

## ✅ Step 5: Test Your Deployment

### 1. Test Frontend
- Visit: `https://your-app.vercel.app`
- Test sign-in/sign-up flows
- Check student dashboard
- Try booking a meeting

### 2. Test Backend API
- Visit: `https://your-api.vercel.app/health` (should return "OK")
- Check: `https://your-api.vercel.app/api/teachers` (should return data)

### 3. Test Database Connection
- Check logs in Vercel → Your Backend Project → Logs
- Look for successful database connections
- No connection errors

### 4. Test Full Flow
1. Sign up as a student
2. View available teachers
3. Book a time slot
4. Check if meeting appears in dashboard
5. Teacher should see booking in their portal

---

## 🔒 Step 6: Configure Custom Domain (Optional)

### For Frontend
1. Vercel Dashboard → Your Frontend Project
2. Settings → Domains
3. Add your domain: `www.yourdomain.com`
4. Follow DNS configuration instructions
5. Wait for SSL certificate (automatic)

### For Backend
1. Vercel Dashboard → Your Backend Project
2. Settings → Domains
3. Add subdomain: `api.yourdomain.com`
4. Update frontend env var `NEXT_PUBLIC_BACKEND_URL` to new domain
5. Redeploy frontend

---

## 🐛 Troubleshooting

### Build Errors

#### Frontend Build Fails
```bash
# Check locally first
cd frontend
npm run build

# Common fixes:
npm install --legacy-peer-deps
npm run build
```

#### Backend Build Fails
```bash
# Check TypeScript compilation
cd backend
npm run build

# If errors, fix TypeScript issues
# Ensure all dependencies are in package.json
```

### Runtime Errors

#### API Returns 500 Errors
- **Check**: Vercel → Backend Project → Logs
- **Common Issues**:
  - Missing environment variables
  - Database connection string incorrect
  - Supabase IP allowlist (set to allow all: `0.0.0.0/0`)

#### Database Connection Timeout
- **Go to**: Supabase Dashboard → Settings → Database
- **Connection Pooling**: Enable (recommended)
- **IPv4 Allow List**: Add `0.0.0.0/0` (allows Vercel serverless IPs)

#### CORS Errors
- **Check**: Backend CORS configuration in `src/app.ts`
- **Should include**:
  ```typescript
  app.use(cors({
    origin: [
      'https://your-app.vercel.app',
      'http://localhost:3000'
    ],
    credentials: true
  }));
  ```

### Environment Variable Issues

#### "Cannot find module" or Undefined Variables
1. Go to Vercel Project → Settings → Environment Variables
2. Verify ALL variables are set
3. Check for typos in variable names
4. Redeploy after adding variables

---

## 📊 Monitoring & Logs

### View Logs
1. **Frontend Logs**: Vercel → Frontend Project → Logs
2. **Backend Logs**: Vercel → Backend Project → Logs
3. **Database Logs**: Supabase → Logs

### Performance Monitoring
- **Vercel Analytics**: Enable in project settings (free on Pro plan)
- **Speed Insights**: Automatically enabled for Next.js
- **Function Execution Time**: Visible in backend logs

---

## 🔄 Continuous Deployment

### Automatic Deployments
Vercel automatically deploys when you push to GitHub:

- **Push to `main` branch** → Production deployment
- **Push to other branches** → Preview deployment
- **Pull Requests** → Preview URLs for testing

### Manual Deployment
```bash
# From frontend or backend directory
vercel --prod
```

---

## 💰 Cost Estimates

### Vercel Pricing
- **Hobby (Free)**:
  - 100GB bandwidth/month
  - Unlimited deployments
  - Serverless function execution: 100 hours/month
  - **Good for**: Testing, small projects (<1000 users)

- **Pro ($20/month)**:
  - 1TB bandwidth/month
  - Serverless function execution: 1000 hours/month
  - **Good for**: Production apps (1000-10000 users)

### Supabase Pricing
- **Free Tier**:
  - 500MB database storage
  - 2GB bandwidth/month
  - 50,000 monthly active users

- **Pro ($25/month)**:
  - 8GB database storage
  - 50GB bandwidth/month
  - 100,000 monthly active users

### Estimated Total Cost
- **Free Tier**: $0/month (suitable for testing)
- **Production**: $45-50/month (Vercel Pro + Supabase Pro)

---

## 📚 Additional Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Clerk Docs**: [clerk.com/docs](https://clerk.com/docs)

---

## ✨ Quick Reference Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy frontend
cd frontend && vercel --prod

# Deploy backend
cd backend && vercel --prod

# View deployment logs
vercel logs [deployment-url]

# Environment variables
vercel env add   # Add new variable
vercel env ls    # List variables
```

---

## 🎉 Success Checklist

- [ ] GitHub repository created and pushed
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Vercel as serverless
- [ ] All environment variables configured
- [ ] Database migrations run in Supabase
- [ ] Frontend can reach backend API
- [ ] Authentication (Clerk) working
- [ ] Payment integration (Razorpay) working
- [ ] Student booking flow tested
- [ ] Teacher portal accessible
- [ ] Admin panel functional
- [ ] Custom domain configured (optional)

---

**🚀 Your application is now live on Vercel!**

Frontend: `https://your-app.vercel.app`  
Backend: `https://your-api.vercel.app`

For support, check logs in Vercel dashboard or Supabase dashboard.
