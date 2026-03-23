# 🚨 QUICK FIX FOR 500 ERRORS

## Problem
Backend is returning 500 errors:
- `/api/boxes/pending` - 500 error
- `/api/teacher-pricing` - 500 error  
- `/api/meetings/all` - 404 error

## Root Cause
Backend needs to restart after database changes (fixing `teacher_slot_id`)

---

## ✅ SOLUTION (2 minutes)

### Method 1: Simple Restart

**In your backend terminal (where npm run dev is running):**

1. Press **Ctrl + C** to stop
2. Run:
   ```powershell
   npm run dev
   ```
3. Wait for: `Server running on port 5000`

**In your frontend terminal:**

1. Press **Ctrl + C** to stop
2. Run:
   ```powershell
   npm run dev
   ```
3. Wait for: `Ready on http://localhost:3001`

---

### Method 2: PowerShell Script

Run this in PowerShell (from acad folder):

```powershell
# Kill all node processes
Get-Process -Name node | Stop-Process -Force

# Start backend
cd C:\Users\sadil\Desktop\acad\backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

# Wait 5 seconds
Start-Sleep -Seconds 5

# Start frontend
cd C:\Users\sadil\Desktop\acad\frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
```

---

## 🔍 After Restart - Test These URLs

### 1. Backend API (should return JSON, not errors):
```
http://localhost:5000/api/boxes/pending
```
Should see: Authentication error (expected) or boxes data

### 2. Frontend Pages:
```
http://localhost:3001/admin/meetings/approval
```
Should show: **4 boxes** with student names

```
http://localhost:3001/admin/teacher-pricing
```
Should show: **3 teachers** with prices

---

## 📊 Expected Results After Restart

### Meeting Approval Page:
✅ 4 boxes visible
✅ Each box shows:
- Teacher name
- Date & time
- Student names (1-2 students per box)
- "Approve Box" button

### Teacher Pricing Page:
✅ 3 teachers visible
✅ Each shows:
- Teacher name
- Current price (₹100 default)
- "Edit" button

---

## 🐛 If Still Not Working

### Check 1: Backend Console
Look for errors like:
- Database connection errors
- Query syntax errors
- Missing environment variables

### Check 2: Frontend Console (F12)
Look for:
- 401 errors = Not logged in as admin
- 403 errors = Wrong role
- 500 errors = Backend crashed

### Check 3: Your Role
Run in Supabase:
```sql
SELECT role FROM profiles WHERE email = 'YOUR_EMAIL';
-- Should return 'admin'

-- If not, fix it:
UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL';
```

---

## 🎯 Quick Checklist

- [ ] Stopped backend (Ctrl+C)
- [ ] Stopped frontend (Ctrl+C)
- [ ] Started backend (npm run dev)
- [ ] Saw "Server running on port 5000"
- [ ] Started frontend (npm run dev)
- [ ] Saw "Ready on http://localhost:3001"
- [ ] Refreshed browser (Ctrl+Shift+R)
- [ ] Logged in as admin
- [ ] Checked Meeting Approval page
- [ ] Checked Teacher Pricing page

---

## 💡 Why This Fixes It

**Before:**
- Database had `teacher_slot_id = NULL`
- Backend queries filtered these out
- Pages showed empty

**After SQL Fix:**
- Database now has `teacher_slot_id` populated
- 4 boxes exist with 5 students

**After Backend Restart:**
- Backend picks up new database state
- Queries return data
- Pages show content

---

**Run the restart now and refresh your browser!** 🚀
