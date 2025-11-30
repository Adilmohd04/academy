# Islamic Academy Platform

> A complete booking and management system for Islamic education with teacher scheduling, student bookings, and admin controls.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

## 📁 Project Structure

```
islamic-academy/
├── frontend/          # Next.js 14 frontend (React 18 + TypeScript)
├── backend/           # Express.js backend API (Node.js + TypeScript)
└── docs/              # Complete project documentation
```

**📖 Full Structure Details:** See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

## 🚀 Quick Deploy

### Recommended: Railway (Backend) + Vercel (Frontend)

**Why?** Always-on backend server, no cold starts, optimized frontend hosting.

1. **Backend → Railway**: [railway.app/new](https://railway.app/new)
   - Root directory: `backend`
   - Add environment variables
   - Deploy (~5 min)

2. **Frontend → Vercel**: [vercel.com/new](https://vercel.com/new)
   - Root directory: `frontend`
   - Set `NEXT_PUBLIC_API_URL` to Railway URL
   - Deploy (~5 min)

3. **Configure Webhooks** (Stripe & Clerk)

**📖 Detailed Guides:**
- [Quick Deploy Checklist](docs/QUICK_DEPLOY.md) - 15-minute deployment
- [Railway Deployment](docs/RAILWAY_DEPLOYMENT.md) - Complete Railway guide (recommended)
- [Vercel Deployment](docs/VERCEL_DEPLOYMENT.md) - Deploy both to Vercel

---

## 🚀 Quick Deploy to Vercel

### Alternative: Both on Vercel

**Simpler but with limitations** (10-second serverless function timeout)

### Frontend Deployment

1. **Deploy to Vercel:**
   ```bash
   cd frontend
   vercel
   ```

2. **Set Environment Variables in Vercel Dashboard:**
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_API_URL` (your backend URL)

### Backend Deployment

1. **Deploy to Vercel:**
   ```bash
   cd backend
   vercel
   ```

2. **Set Environment Variables in Vercel Dashboard:**
   - `DATABASE_URL` (Supabase connection string)
   - `CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `WEBHOOK_SECRET`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RESEND_API_KEY`

### Database Setup (Supabase)

1. Create a Supabase project
2. Run SQL files from `database/` folder in this order:
   - `create-tables.sql`
   - `CREATE_TEACHER_TABLES.sql`
   - `add-teacher-profiles.sql`
   - Other migration files as needed

3. Copy the connection string and add to backend env vars

## 📦 Local Development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

## 🔧 Technologies

- **Frontend:** Next.js 14, React, TypeScript, TailwindCSS, Clerk Auth
- **Backend:** Node.js, Express, PostgreSQL
- **Database:** Supabase (PostgreSQL)
- **Payments:** Razorpay
- **Email:** Resend

## 📝 Documentation

- **[🚀 Deployment Ready](docs/DEPLOYMENT_READY.md)** - Complete optimization & deployment summary
- **[⚡ Quick Deploy (15 min)](docs/QUICK_DEPLOY.md)** - Fastest path to production
- **[🚂 Railway Deployment](docs/RAILWAY_DEPLOYMENT.md)** - Recommended for backend (always-on)
- **[▲ Vercel Deployment](docs/VERCEL_DEPLOYMENT.md)** - Deploy both on Vercel
- **[📦 GitHub Setup](docs/GITHUB_SETUP.md)** - Push to GitHub & auto-deploy
- **[📁 Project Structure](docs/PROJECT_STRUCTURE.md)** - Complete folder organization
- **[📡 API Documentation](docs/api/)** - API endpoints and usage
- **[✨ Features](docs/features/)** - Feature guides and implementation

---

## 🚀 Quick Start

### Local Development

**Backend:**
```bash
cd backend
npm install
npm run dev  # http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # http://localhost:3000
```

### Deploy to Production

1. **Push to GitHub** - See [docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md)
2. **Deploy Backend** - Railway (recommended) or Vercel
3. **Deploy Frontend** - Vercel
4. **Configure Webhooks** - Stripe & Clerk

**Total Time:** ~15 minutes • **Cost:** $5-10/month (Railway + Vercel)

---

## 🔧 Technology Stack

**Frontend:** Next.js 14 • React 18 • TypeScript • TailwindCSS • Clerk Auth  
**Backend:** Node.js 18 • Express • TypeScript • PostgreSQL (Supabase)  
**Payments:** Stripe • Webhooks • Secure processing  
**Integrations:** Google Calendar • Email notifications • Automated workflows

---

## 💰 Deployment Costs

| Option | Monthly Cost | Best For |
|--------|-------------|----------|
| **Railway + Vercel** | $5-10 | ⭐ Production (recommended) |
| **Both on Vercel** | Free - $20 | Testing / MVPs |

---

## 🗄️ Database

All SQL schemas, migrations, seeds, and utilities are organized in the `database/` folder:
- `database/migrations/` - Version-controlled schema changes
- `database/seeds/` - Test data and initial setup
- `database/utilities/` - Maintenance and fix scripts

---

**Ready for Production Deployment! 🎉**

For detailed architecture and code organization, see [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)
