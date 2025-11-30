# ⚠️ BACKEND STARTUP ISSUE - MANUAL FIX REQUIRED

## Problem
Backend is starting but crashing immediately. Need to see the full error message.

## ✅ MANUAL STEPS (5 minutes)

### Step 1: Open NEW PowerShell Window
1. Press **Windows Key**
2. Type "PowerShell"
3. Click "Windows PowerShell"

### Step 2: Navigate to Backend
```powershell
cd C:\Users\sadil\Desktop\acad\backend
```

### Step 3: Start Backend and Watch for Errors
```powershell
npm run dev
```

**WAIT and WATCH for:**
- ✅ "Server running on port 5000" = SUCCESS
- ❌ Error messages = Copy them and share with me

### Common Errors and Fixes:

#### Error 1: "Cannot find module"
```
Fix: npm install
```

#### Error 2: "Port 5000 is already in use"
```powershell
# Find and kill process on port 5000
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force

# Then try again
npm run dev
```

#### Error 3: "Database connection failed"
```
Fix: Check .env file has correct DATABASE_URL
```

#### Error 4: TypeScript errors
```
Fix: npm run build
```

---

## 🎯 Once Backend Starts Successfully

### You Should See:
```
✅ Education Platform API Server Running
✅ Environment: development
✅ Port: 5000
✅ URL: http://localhost:5000
```

### Then Test These URLs in Browser:

#### 1. Health Check (should return JSON):
```
http://localhost:5000/api/health
```

#### 2. Boxes Endpoint (will need auth, but should not crash):
```
http://localhost:5000/api/boxes/pending
```

#### 3. Teacher Pricing (will need auth):
```
http://localhost:5000/api/teacher-pricing
```

---

## 📱 Then Start Frontend

### In ANOTHER PowerShell window:
```powershell
cd C:\Users\sadil\Desktop\acad\frontend
npm run dev
```

**Wait for:** "Ready on http://localhost:3001"

---

## 🌐 Then Test Your Admin Pages

### 1. Meeting Approval:
```
http://localhost:3001/admin/meetings/approval
```
**Should show:** 4 boxes with student names

### 2. Teacher Pricing:
```
http://localhost:3001/admin/teacher-pricing  
```
**Should show:** 3 teachers with prices

---

## 🐛 If Pages Still Show Empty

### Check Browser Console (F12):
Look for these errors:

#### Error: "Failed to load resource: 500"
= Backend is crashing on specific endpoints
= Share the backend console error with me

#### Error: "Failed to load resource: 401" or "Unauthorized"
= You're not logged in
= Go to http://localhost:3001 and sign in

#### Error: "Failed to load resource: 403" or "Forbidden"
= You're not admin
= Run in Supabase:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'YOUR_EMAIL';
```

---

## 📸 What to Share with Me

If backend won't start or crashes, share:

1. **Full error message from backend terminal**
   - Copy ALL the red text
   - Or screenshot the terminal

2. **Browser console errors (F12)**
   - Screenshot showing the errors

3. **Your current role**
   - Run in Supabase: `SELECT role, email FROM profiles WHERE email = 'YOUR_EMAIL'`

---

## 🚀 Quick Troubleshooting Checklist

- [ ] Opened NEW PowerShell window
- [ ] Navigated to backend folder
- [ ] Ran `npm run dev`
- [ ] Saw "Server running on port 5000" (or error message)
- [ ] If error, tried suggested fixes
- [ ] Opened ANOTHER PowerShell for frontend
- [ ] Ran frontend `npm run dev`
- [ ] Saw "Ready on http://localhost:3001"
- [ ] Logged into application
- [ ] Verified role is 'admin'
- [ ] Refreshed admin pages with Ctrl+Shift+R
- [ ] Checked browser console for errors

---

**Start with Step 1 now - open a NEW PowerShell and manually start the backend!** 🚀

Once it's running successfully, the admin pages should work!
