# 🔧 Environment Configuration Helper

This guide explains how to configure environment variables for both frontend and backend using a **single unified `.env.example` file**.

---

## 📁 File Structure

```
acad/
├── .env.example          # ⭐ MASTER template (this file)
├── backend/
│   └── .env              # Copy from .env.example
└── frontend/
    └── .env.local        # Copy from .env.example
```

---

## 🚀 Quick Setup

### Option 1: Automated (Recommended)

Run the setup script:

```powershell
.\setup.ps1
```

This will:
- ✅ Install all dependencies
- ✅ Copy `.env.example` to both directories
- ✅ Guide you through next steps

### Option 2: Manual

```powershell
# Copy .env.example to both locations
cp .env.example backend\.env
cp .env.example frontend\.env.local
```

Then edit both files with your actual values.

---

## 🔑 Required Values

### 1. Clerk Authentication Keys

**Where to get them:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application (or select existing)
3. Navigate to **API Keys**
4. Copy both keys:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)

**Where to paste:**
```env
CLERK_SECRET_KEY=sk_test_xxxxx                           # Your actual secret key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx          # Your actual publishable key
```

### 2. Database Password

**Where to set:**
```env
DB_PASSWORD=your_postgres_password     # Your PostgreSQL password
DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/education_platform
```

**Default PostgreSQL password:**
- If you just installed PostgreSQL, use the password you set during installation
- Default username is usually `postgres`

---

## 📋 Environment Variables Explained

### Used by Backend Only

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `PORT` | Backend server port | `5000` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `CLERK_SECRET_KEY` | Clerk auth (backend) | - | ✅ Yes |
| `DB_HOST` | PostgreSQL host | `localhost` | Yes |
| `DB_PORT` | PostgreSQL port | `5432` | Yes |
| `DB_NAME` | Database name | `education_platform` | Yes |
| `DB_USER` | Database user | `postgres` | Yes |
| `DB_PASSWORD` | Database password | - | ✅ Yes |
| `DB_MAX_CONNECTIONS` | Connection pool size | `20` | No |
| `CORS_ORIGIN` | Allowed frontend URL | `http://localhost:3000` | Yes |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | No |

### Used by Frontend Only

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (frontend) | - | ✅ Yes |
| `CLERK_SECRET_KEY` | Clerk server-side | - | ✅ Yes |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign in page path | `/sign-in` | No |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign up page path | `/sign-up` | No |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Redirect after sign in | `/dashboard` | No |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Redirect after sign up | `/dashboard` | No |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:5000` | Yes |

### Shared (Used by Both)

| Variable | Used By | Purpose |
|----------|---------|---------|
| `CLERK_SECRET_KEY` | Both | Backend verification & frontend SSR |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Both | Client-side auth & backend token generation |

---

## 🎯 Common Scenarios

### Development (Local)

**Backend `.env`:**
```env
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
DATABASE_URL=postgresql://postgres:password@localhost:5432/education_platform
CORS_ORIGIN=http://localhost:3000
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Production

**Backend `.env`:**
```env
NODE_ENV=production
CLERK_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
DATABASE_URL=postgresql://user:password@production-db:5432/edu_platform
CORS_ORIGIN=https://yourdomain.com
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## ✅ Verification

### Check Backend Configuration

```powershell
cd backend
npm run dev
```

You should see:
```
✅ Database connected successfully
🚀 Education Platform API Server Running
🚀 Port: 5000
```

### Check Frontend Configuration

```powershell
cd frontend
npm run dev
```

You should see:
```
ready - started server on 0.0.0.0:3000
```

### Test Full Stack

1. **Backend health:** http://localhost:5000/api/health
2. **Frontend:** http://localhost:3000
3. **Sign up flow:** Click "Get Started" → Create account
4. **Dashboard:** Should redirect to `/dashboard` after login

---

## 🔒 Security Best Practices

### ✅ DO:
- Keep `.env` and `.env.local` in `.gitignore`
- Use different keys for development and production
- Rotate keys regularly
- Store production keys in secure vaults (AWS Secrets Manager, etc.)

### ❌ DON'T:
- Commit `.env` files to git
- Share keys in chat/email
- Use production keys in development
- Hardcode secrets in source code

---

## 🆘 Troubleshooting

### "Missing environment variables" warning

**Problem:** Backend warns about missing Clerk keys

**Solution:**
1. Check `backend/.env` file exists
2. Verify `CLERK_SECRET_KEY` is set
3. Restart backend: `npm run dev`

### Frontend shows "Invalid Clerk configuration"

**Problem:** Clerk authentication doesn't work

**Solution:**
1. Check `frontend/.env.local` file exists
2. Verify both Clerk keys are set
3. Clear browser cache
4. Restart frontend: `npm run dev`

### Database connection failed

**Problem:** Backend can't connect to PostgreSQL

**Solution:**
1. Check PostgreSQL is running: `psql -U postgres`
2. Verify `DB_PASSWORD` in `backend/.env`
3. Ensure database exists: `CREATE DATABASE education_platform;`
4. Check `DATABASE_URL` format

### CORS errors

**Problem:** Frontend can't call backend API

**Solution:**
1. Check `CORS_ORIGIN` in `backend/.env` matches frontend URL
2. Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
3. Restart both servers

---

## 📚 Additional Resources

- [Clerk Documentation](https://clerk.com/docs/quickstarts/nextjs)
- [Next.js Environment Variables](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables)
- [Node.js dotenv Package](https://github.com/motdotla/dotenv)

---

**💡 Pro Tip:** Use the universal `.env.example` as a single source of truth. Update it when adding new variables, then sync to both locations!
