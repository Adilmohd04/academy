# Quick Deployment Checklist

## ⚡ Fastest Path to Production

### Option 1: Railway (Backend) + Vercel (Frontend) - RECOMMENDED ⭐

**Why?** Always-on backend, optimized frontend hosting

1. **Deploy Backend to Railway** (5 minutes)
   - Visit [railway.app/new](https://railway.app/new)
   - Connect GitHub repo
   - Set root directory: `backend`
   - Add environment variables
   - Deploy
   - Copy URL: `https://[project].up.railway.app`

2. **Deploy Frontend to Vercel** (5 minutes)
   - Visit [vercel.com/new](https://vercel.com/new)
   - Connect GitHub repo
   - Set root directory: `frontend`
   - Add environment variables (use Railway URL for `NEXT_PUBLIC_API_URL`)
   - Deploy
   - Copy URL: `https://[project].vercel.app`

3. **Configure Webhooks** (5 minutes)
   - Stripe: Add webhook for Railway URL + `/api/webhooks/stripe`
   - Clerk: Add webhook for Railway URL + `/api/webhooks/clerk`

**Total Time: ~15 minutes**

---

### Option 2: Both on Vercel (Simpler, but limitations)

**Why?** Single platform, easier management, but 10-second function timeout

1. **Deploy Backend** (5 minutes)
   - [vercel.com/new](https://vercel.com/new) → backend folder
   - Add environment variables
   - Deploy

2. **Deploy Frontend** (5 minutes)
   - [vercel.com/new](https://vercel.com/new) → frontend folder
   - Add backend URL to `NEXT_PUBLIC_API_URL`
   - Deploy

3. **Configure Webhooks** (5 minutes)

**Total Time: ~15 minutes**

⚠️ **Limitation**: Vercel has 10-second serverless function timeout (60s on Pro plan)

---

## 📋 Required Environment Variables

### Backend (Railway/Vercel)
```env
DATABASE_URL=                    # From Supabase
CLERK_PUBLISHABLE_KEY=           # From Clerk
CLERK_SECRET_KEY=                # From Clerk
WEBHOOK_SECRET=                  # From Clerk webhooks
STRIPE_SECRET_KEY=               # From Stripe
STRIPE_WEBHOOK_SECRET=           # From Stripe webhooks
STRIPE_PUBLISHABLE_KEY=          # From Stripe
GOOGLE_CLIENT_ID=                # From Google Cloud Console
GOOGLE_CLIENT_SECRET=            # From Google Cloud Console
GOOGLE_REDIRECT_URI=             # Your backend URL + /api/calendar/callback
SENDGRID_API_KEY=                # From SendGrid (optional)
FROM_EMAIL=                      # Your sender email
NODE_ENV=production
FRONTEND_URL=                    # Your Vercel frontend URL
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=             # Your backend URL (Railway or Vercel)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## ✅ Post-Deployment Checklist

- [ ] Backend health check: `curl https://[backend-url]/api/health`
- [ ] Frontend loads
- [ ] Sign in works
- [ ] Booking works
- [ ] Payment works
- [ ] Email notifications work
- [ ] Webhooks configured

---

## 🆘 Quick Fixes

### CORS Error
```typescript
// backend/src/app.ts - Add your frontend URL
const allowedOrigins = [
  'https://[your-frontend].vercel.app'
];
```

### Database Connection Failed
- Check `DATABASE_URL` in environment variables
- Use Supabase connection pooling URL

### Webhooks Not Working
- Verify webhook URLs match your deployment
- Check signing secrets in environment variables

---

## 📖 Full Guides

- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Complete Vercel guide
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) - Complete Railway guide (recommended)

---

**Recommended**: Railway (Backend) + Vercel (Frontend)  
**Simpler**: Both on Vercel (with limitations)
