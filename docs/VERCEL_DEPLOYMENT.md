# Vercel Deployment Guide

This guide covers deploying both the **Frontend** and **Backend** to Vercel.

## 📋 Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional) - `npm install -g vercel`
3. **GitHub Repository** - Push your code to GitHub
4. **Supabase Account** - Database hosted on Supabase
5. **Clerk Account** - Authentication provider
6. **Stripe Account** - Payment processing

---

## 🎯 Deployment Strategy

We'll deploy **two separate projects** on Vercel:
1. **Backend API** - `academy-api` (backend folder)
2. **Frontend** - `academy` (frontend folder)

---

## 🔧 Step 1: Backend Deployment

### A. Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"

2. **Import Backend Repository**
   - Select your GitHub repository
   - Choose the `backend` folder as the root directory
   - Click "Continue"

3. **Configure Build Settings**
   ```
   Framework Preset: Other
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   Development Command: npm run dev
   Root Directory: backend
   ```

4. **Environment Variables**
   
   Add these in Vercel Dashboard → Settings → Environment Variables:

   ```env
   # Database
   DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
   
   # Clerk Authentication
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   WEBHOOK_SECRET=whsec_...
   
   # Stripe Payments
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   
   # Google Calendar
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=https://your-backend-url.vercel.app/api/calendar/callback
   
   # Email (SendGrid or similar)
   SENDGRID_API_KEY=SG.xxx
   FROM_EMAIL=noreply@yourdomain.com
   
   # App Config
   NODE_ENV=production
   PORT=3000
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Copy the deployment URL (e.g., `https://academy-api.vercel.app`)

### B. Via Vercel CLI (Alternative)

```bash
cd backend
vercel
# Follow prompts
# Set root directory to current folder
# Configure environment variables when prompted
```

---

## 🎨 Step 2: Frontend Deployment

### A. Via Vercel Dashboard (Recommended)

1. **Import Frontend Repository**
   - Click "Add New Project"
   - Select your GitHub repository
   - Choose the `frontend` folder as root directory

2. **Configure Build Settings**
   ```
   Framework Preset: Next.js
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   Development Command: npm run dev
   Root Directory: frontend
   Node.js Version: 18.x
   ```

3. **Environment Variables**

   Add these in Vercel Dashboard:

   ```env
   # Backend API URL (from Step 1)
   NEXT_PUBLIC_API_URL=https://academy-api.vercel.app
   
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/student
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/student
   
   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   
   # Supabase (if using directly in frontend)
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

4. **Deploy**
   - Click "Deploy"
   - Your frontend will be live at `https://your-app.vercel.app`

### B. Via Vercel CLI (Alternative)

```bash
cd frontend
vercel
# Follow prompts
```

---

## 🔄 Step 3: Update CORS Configuration

After deployment, update your backend CORS settings:

1. **Edit `backend/src/app.ts`**

   Update the CORS configuration with your production frontend URL:

   ```typescript
   const allowedOrigins = [
     'http://localhost:3000',
     'http://localhost:3001',
     'https://your-frontend.vercel.app',  // Add your production URL
     'https://your-custom-domain.com'      // If using custom domain
   ];
   ```

2. **Commit and push changes**
   ```bash
   git add .
   git commit -m "Update CORS for production"
   git push
   ```

3. **Vercel will auto-deploy** the updated backend

---

## 🔐 Step 4: Configure Webhooks

### Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://academy-api.vercel.app/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy webhook signing secret
5. Add to Vercel backend environment variables as `STRIPE_WEBHOOK_SECRET`

### Clerk Webhooks

1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://academy-api.vercel.app/api/webhooks/clerk`
3. Subscribe to events:
   - `user.created`
   - `user.updated`
4. Copy signing secret
5. Add to Vercel backend environment variables as `WEBHOOK_SECRET`

---

## ✅ Step 5: Verify Deployment

### Test Backend
```bash
curl https://academy-api.vercel.app/api/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "database": "connected"
}
```

### Test Frontend
1. Visit `https://your-frontend.vercel.app`
2. Try signing in
3. Book a meeting slot
4. Verify payment flow

---

## 🚀 Step 6: Custom Domain (Optional)

### For Frontend
1. Go to Vercel Dashboard → Your Frontend Project → Settings → Domains
2. Add your domain (e.g., `academy.yourdomain.com`)
3. Follow DNS configuration instructions

### For Backend
1. Go to Vercel Dashboard → Your Backend Project → Settings → Domains
2. Add subdomain (e.g., `api.yourdomain.com`)
3. Update `NEXT_PUBLIC_API_URL` in frontend environment variables
4. Update CORS configuration in backend

---

## 🔍 Troubleshooting

### Backend Build Fails

**Issue**: TypeScript compilation errors

**Solution**:
```bash
# Test build locally
cd backend
npm run build

# Fix any TypeScript errors
# Commit and push
```

### Database Connection Issues

**Issue**: Can't connect to Supabase

**Solution**:
- Verify `DATABASE_URL` in Vercel environment variables
- Ensure Supabase allows connections from Vercel IPs
- Check Supabase connection pooling settings

### CORS Errors

**Issue**: Frontend can't reach backend

**Solution**:
- Add frontend URL to CORS whitelist in `backend/src/app.ts`
- Redeploy backend after changes

### Environment Variables Not Working

**Issue**: Features not working in production

**Solution**:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Verify all required variables are set
3. Click "Redeploy" after adding/updating variables

---

## 📊 Monitoring

### Vercel Analytics
- Go to Dashboard → Your Project → Analytics
- Monitor response times, errors, and traffic

### Logs
- Go to Dashboard → Your Project → Deployments → [Latest] → Logs
- Check for runtime errors

---

## 🔄 Continuous Deployment

Both projects are configured for **automatic deployments**:

- **Push to `main` branch** → Automatic production deployment
- **Push to other branches** → Preview deployments
- **Pull requests** → Automatic preview deployments with unique URLs

---

## 💰 Cost Considerations

### Vercel Hobby Plan (Free)
- ✅ 100 GB bandwidth/month
- ✅ 100 deployments/day
- ✅ Unlimited preview deployments
- ❌ Limited serverless function execution time (10 seconds)
- ❌ Limited concurrent builds

### Vercel Pro Plan ($20/month)
- ✅ 1 TB bandwidth
- ✅ 6000 deployments/day
- ✅ 60-second function execution
- ✅ 12 concurrent builds
- ✅ Better for production

**Recommendation**: Start with Hobby plan, upgrade to Pro when needed.

---

## 🎯 Alternative: Railway for Backend

If Vercel's serverless limitations are an issue, consider **Railway** for the backend:

### Why Railway?
- ✅ Always-on servers (no cold starts)
- ✅ Longer execution times
- ✅ Better for background jobs
- ✅ WebSocket support
- ✅ $5/month starter plan

### Deploy to Railway
```bash
cd backend
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Best Setup**: Frontend on Vercel + Backend on Railway

---

## 📝 Post-Deployment Checklist

- [ ] Backend health check responds
- [ ] Frontend loads correctly
- [ ] User authentication works
- [ ] Meeting booking flow works
- [ ] Payment processing works
- [ ] Email notifications send
- [ ] Google Calendar integration works
- [ ] Webhooks configured and tested
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificates valid
- [ ] CORS configured properly
- [ ] Environment variables set correctly
- [ ] Error monitoring enabled

---

## 🆘 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for frontend errors
3. Test API endpoints with curl/Postman
4. Verify all environment variables
5. Check Supabase connection

---

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

---

**Last Updated**: November 30, 2025
