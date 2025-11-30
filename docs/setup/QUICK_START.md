# 🚀 Quick Start Guide

## ✅ Current Status
- ✅ Backend dependencies installed
- ✅ TypeScript errors fixed
- ✅ Universal .env system created
- ⏳ Frontend dependencies need installation
- ⏳ Clerk configuration needed
- ⏳ Database setup needed

---

## 📋 Step-by-Step Setup (5-10 minutes)

### **Step 1: Install Frontend Dependencies**
```powershell
cd c:\Users\sadil\Desktop\acad\frontend
npm install
```

### **Step 2: Get Clerk API Keys** (2 minutes)
1. Go to https://dashboard.clerk.com/
2. Create a free account (or sign in)
3. Click **"Create application"**
4. Name it **"Education Platform"**
5. Enable **Google** authentication
6. Copy your keys from the **API Keys** page:
   - `CLERK_PUBLISHABLE_KEY` (starts with `pk_test_`)
   - `CLERK_SECRET_KEY` (starts with `sk_test_`)

### **Step 3: Configure Environment File**

**IMPORTANT:** There is now **ONE MAIN .env file** at the root level!  
Both backend and frontend read from: `c:\Users\sadil\Desktop\acad\.env`

Edit the `.env` file and update these values:

```env
# Clerk Authentication Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE

# Database Password
DB_PASSWORD=your_postgresql_password

# Keep everything else as default
```

✅ **That's it! No need to edit multiple .env files anymore!**

### **Step 4: Setup PostgreSQL Database**

**Option A: Using pgAdmin** (GUI)
1. Open pgAdmin
2. Right-click **Databases** → **Create** → **Database**
3. Name: `education_platform`
4. Click **Save**
5. Right-click `education_platform` → **Query Tool**
6. Open file: `c:\Users\sadil\Desktop\acad\backend\database\schema.sql`
7. Click **Execute** (▶ button)

**Option B: Using Command Line**
```powershell
# Create database
psql -U postgres -c "CREATE DATABASE education_platform;"

# Run schema
psql -U postgres -d education_platform -f "c:\Users\sadil\Desktop\acad\backend\database\schema.sql"
```

### **Step 5: Start Development Servers**

**Terminal 1 - Backend:**
```powershell
cd c:\Users\sadil\Desktop\acad\backend
npm run dev
```
✅ You should see: `✅ Database connected` and `🚀 Server running on port 5000`

**Terminal 2 - Frontend:**
```powershell
cd c:\Users\sadil\Desktop\acad\frontend
npm run dev
```
✅ You should see: `Ready - started server on 0.0.0.0:3000`

---

## 🧪 Test Your Setup

### **1. Open the Application**
Visit: http://localhost:3000

### **2. Create Your First Admin User**
1. Click **"Get Started"**
2. Sign up with Google (or email)
3. You'll be redirected to the dashboard

### **3. Make Yourself Admin**
1. Go to Clerk Dashboard: https://dashboard.clerk.com/
2. Click **Users** in sidebar
3. Click on your user
4. Scroll to **"Metadata"** section
5. Click **"Edit"** next to **Public metadata**
6. Add this JSON:
```json
{
  "role": "admin"
}
```
7. Click **Save**
8. Refresh your dashboard page - you should now see **"Admin Panel"**

### **4. Test API Connection**
Open browser console (F12) and run:
```javascript
fetch('http://localhost:5000/api/health')
  .then(r => r.json())
  .then(d => console.log('Backend Status:', d))
```
✅ Should show: `Backend Status: {status: "OK", ...}`

---

## 🎯 What You Have Now

### **Frontend Features**
- ✅ Landing page with hero section
- ✅ Google authentication (Clerk)
- ✅ Protected dashboard with role-based views
- ✅ Responsive design (mobile-friendly)
- ✅ Sign-in/Sign-up pages

### **Backend Features**
- ✅ RESTful API (Express + TypeScript)
- ✅ JWT authentication middleware
- ✅ PostgreSQL database with connection pooling
- ✅ Role-based access control (admin/teacher/student)
- ✅ Rate limiting (security)
- ✅ User management API
- ✅ Health check endpoints

### **Database Schema**
- ✅ Users table with role management
- ✅ Courses table with pricing
- ✅ Enrollments tracking
- ✅ Videos with progress tracking
- ✅ Meetings (Zoom integration ready)
- ✅ Messages/chat system
- ✅ Certificates
- ✅ Payments tracking

---

## 📚 Next Steps (Features to Build)

### **Phase 1: Course Management** (Week 1)
- [ ] Create course UI (admin/teacher)
- [ ] Course listing page
- [ ] Course details page
- [ ] Video upload functionality
- [ ] Student enrollment flow

### **Phase 2: Payments** (Week 2)
- [ ] Stripe integration
- [ ] Payment processing
- [ ] Free course access
- [ ] Enrollment confirmation

### **Phase 3: Live Classes** (Week 3)
- [ ] Zoom integration
- [ ] Meeting scheduling (teacher)
- [ ] Student meeting access
- [ ] Recording management

### **Phase 4: Student Features** (Week 4)
- [ ] Video player with progress tracking
- [ ] Course completion tracking
- [ ] Certificate generation
- [ ] Student analytics dashboard

### **Phase 5: Communication** (Week 5)
- [ ] Real-time chat (Socket.io)
- [ ] Announcements system
- [ ] Email notifications
- [ ] Push notifications

### **Phase 6: Mobile App** (Week 6+)
- [ ] React Native setup
- [ ] Mobile authentication
- [ ] Mobile course viewer
- [ ] Mobile video player

---

## 🆘 Troubleshooting

### **"Cannot connect to database"**
- Make sure PostgreSQL is running
- Check your database password in `backend/.env`
- Verify database exists: `psql -U postgres -l`

### **"Invalid publishable key"**
- Check Clerk keys are copied correctly
- Make sure keys start with `pk_test_` and `sk_test_`
- Verify no extra spaces in .env files

### **"Port 3000 already in use"**
```powershell
# Find and kill the process
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### **"Module not found" errors**
```powershell
# Reinstall dependencies
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### **TypeScript errors in VS Code**
1. Press `Ctrl+Shift+P`
2. Type: `TypeScript: Restart TS Server`
3. Press Enter

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `SETUP.md` | Detailed setup instructions |
| `ENV_SETUP.md` | Environment variables guide |
| `FIXES_SUMMARY.md` | TypeScript fixes applied |
| `backend/README.md` | Backend API documentation |
| `.env.example` | Master environment template |

---

## 💡 Pro Tips

1. **Always run both servers** - Frontend needs backend to function
2. **Check Clerk Dashboard** - Monitor user signups and manage roles
3. **Use pgAdmin** - Easier to view database records visually
4. **Enable hot reload** - Both servers auto-refresh on code changes
5. **Test API with Postman** - Easier than browser for API testing

---

## 🔗 Important URLs

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **API Docs**: http://localhost:5000/api/health
- **Clerk Dashboard**: https://dashboard.clerk.com/
- **Database**: localhost:5432

---

## ✅ Success Checklist

Before considering setup complete:
- [ ] Frontend shows landing page
- [ ] Can sign up with Google
- [ ] Redirected to dashboard after signup
- [ ] Backend console shows "Database connected"
- [ ] No error messages in browser console
- [ ] Can make yourself admin via Clerk
- [ ] Admin dashboard shows extra features

---

**Ready to build? Start with Step 1! 🚀**
