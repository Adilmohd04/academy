# 🚀 Quick Setup Guide

Follow these steps to get your education platform running in minutes!

---

## ✅ Prerequisites Checklist

Before you begin, make sure you have:

- [ ] **Node.js** v18 or higher installed ([Download](https://nodejs.org/))
- [ ] **PostgreSQL** v14 or higher installed ([Download](https://www.postgresql.org/download/))
- [ ] **Clerk Account** created ([Sign up free](https://dashboard.clerk.com/sign-up))
- [ ] **Code editor** (VS Code recommended)
- [ ] **Terminal** (PowerShell on Windows)

---

## 📝 Step 1: Clone & Setup Project

```powershell
# Navigate to your project
cd c:\Users\sadil\Desktop\acad

# You should see two folders: backend and frontend
```

---

## 🗄️ Step 2: Setup PostgreSQL Database

### Create Database

```powershell
# Open PostgreSQL command line
psql -U postgres

# Create database
CREATE DATABASE education_platform;

# Exit psql
\q
```

### Initialize Schema

```powershell
# Run schema file
psql -U postgres -d education_platform -f backend/database/schema.sql
```

**✅ Database is ready!**

---

## 🔐 Step 3: Setup Clerk Authentication

### Create Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Click **"Create Application"**
3. Name it: **"Education Platform"**
4. Enable authentication methods:
   - ✅ Email/Password
   - ✅ Google OAuth
5. Click **"Create Application"**

### Get Your Keys

1. In Clerk Dashboard, go to **API Keys**
2. Copy:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)

**Keep these keys safe!** You'll need them in the next step.

---

## ⚙️ Step 4: Configure Backend

```powershell
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env
```

### Edit `backend/.env`

Open `backend/.env` in your editor and update:

```env
# Server
PORT=5000
NODE_ENV=development

# Clerk (paste your keys here!)
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here
CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here

# PostgreSQL
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/education_platform
DB_HOST=localhost
DB_PORT=5432
DB_NAME=education_platform
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_MAX_CONNECTIONS=20

# CORS
CORS_ORIGIN=http://localhost:3000
```

**Important:** Replace:
- `sk_test_your_actual_secret_key_here` with your Clerk Secret Key
- `pk_test_your_actual_publishable_key_here` with your Clerk Publishable Key  
- `your_postgres_password` with your PostgreSQL password

---

## 🎨 Step 5: Configure Frontend

```powershell
# Navigate to frontend (from backend folder)
cd ../frontend

# Install dependencies
npm install

# Create .env.local file from example
cp .env.example .env.local
```

### Edit `frontend/.env.local`

Open `frontend/.env.local` in your editor and update:

```env
# Clerk (paste your keys here!)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here

# Clerk URLs (keep these as-is)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Important:** Replace with your actual Clerk keys!

---

## 🚀 Step 6: Start the Application

### Terminal 1: Start Backend

```powershell
cd backend
npm run dev
```

You should see:
```
✅ Database connected successfully
🚀 ============================================
🚀 Education Platform API Server Running
🚀 Environment: development
🚀 Port: 5000
🚀 URL: http://localhost:5000
🚀 ============================================
```

**Leave this terminal running!**

### Terminal 2: Start Frontend

Open a **new terminal** and run:

```powershell
cd frontend
npm run dev
```

You should see:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

## 🎉 Step 7: Test Your Application

1. **Open browser:** http://localhost:3000
2. You should see the beautiful landing page!
3. Click **"Get Started"** or **"Sign Up"**
4. Create an account with email or Google
5. After sign up, you'll be redirected to the dashboard!

---

## ✅ Verification Checklist

Make sure everything works:

- [ ] Landing page loads at http://localhost:3000
- [ ] Click "Sign Up" opens Clerk authentication
- [ ] Can create account with email
- [ ] Can sign in with Google
- [ ] After login, redirected to `/dashboard`
- [ ] Dashboard shows your name and role
- [ ] Backend API responds at http://localhost:5000/api/health

---

## 🎯 Next Steps

### Assign User Roles

By default, new users are "students". To make someone a teacher or admin:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Click **"Users"**
3. Select a user
4. Click **"Metadata"** tab
5. Add to **Public Metadata**:

**For Teacher:**
```json
{
  "role": "teacher"
}
```

**For Admin:**
```json
{
  "role": "admin"
}
```

6. Save changes
7. User must sign out and sign back in to see changes

---

## 🆘 Troubleshooting

### Backend won't start

**Error:** "Database connection failed"
- ✅ Check PostgreSQL is running: `psql -U postgres`
- ✅ Verify password in `backend/.env`
- ✅ Ensure database exists: `CREATE DATABASE education_platform;`

**Error:** "Missing environment variables"
- ✅ Check `backend/.env` file exists
- ✅ Verify Clerk keys are set

### Frontend won't start

**Error:** "Cannot find module '@clerk/nextjs'"
```powershell
cd frontend
npm install @clerk/nextjs
```

**Error:** "Invalid Clerk keys"
- ✅ Check `frontend/.env.local` file exists
- ✅ Verify keys copied correctly from Clerk Dashboard
- ✅ Make sure keys start with `pk_test_` and `sk_test_`

### Authentication not working

- ✅ Check Clerk Dashboard → Application is active
- ✅ Verify both backend and frontend have correct Clerk keys
- ✅ Clear browser cache and cookies
- ✅ Try incognito/private browsing mode

### API calls failing

- ✅ Verify backend is running on port 5000
- ✅ Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
- ✅ Check `CORS_ORIGIN` in `backend/.env`
- ✅ Look for errors in backend terminal

---

## 📚 Additional Resources

- **[Full Backend Documentation](./backend/README.md)**
- **[Full Frontend Documentation](./frontend/README.md)**
- **[Clerk Documentation](https://clerk.com/docs)**
- **[Next.js Documentation](https://nextjs.org/docs)**
- **[PostgreSQL Documentation](https://www.postgresql.org/docs/)**

---

## 🎓 You're All Set!

Your education platform is now running! Here's what you can do:

1. **Explore the landing page** - See the features showcase
2. **Create test accounts** - Sign up as different users
3. **Assign different roles** - Test admin, teacher, and student views
4. **Start building features** - Add courses, videos, payments, etc.

**Next Phase:** Implement course management system! 🚀

---

**Need help?** Check the troubleshooting section above or review the full documentation.

**Happy building! 🎉**
