# ⚡ Quick Test Guide - 2 Minutes

## ✅ What Was Fixed

1. **Past Slots (Nov 6)** - Removed from list
2. **Status Text** - Changed to "Waiting for admin approval"
3. **Backend** - Restarted cleanly on port 5000

---

## 🧪 Quick Tests

### Test 1: Past Slots Removed (30 seconds)
1. Open: http://localhost:3001
2. Login as student
3. Click "Schedule Meeting"
4. Select any teacher
5. ✅ **Check**: Nov 6 slots should be GONE
6. ✅ **Check**: Only today (Dec 6) and future dates visible

### Test 2: Status Text (30 seconds)
1. If you have a pending meeting, go to "My Meetings"
2. ✅ **Check**: Status says "⏳ Waiting for admin approval"
3. ✅ **Not**: "Waiting for teacher assignment"

### Test 3: Price Display (30 seconds)
1. Go to slot selection
2. Look at the price shown
3. **If it shows ₹500**: 
   - This is the default
   - You need to configure it in admin settings
4. **To change**:
   - Login as admin
   - Go to Settings
   - Set "Meeting Price" to ₹100
   - Save
   - Refresh student page
   - Should now show ₹100

---

## 🔍 Backend Logs to Watch

While testing, check backend terminal for these messages:

### Good Signs ✅
```
🔍 Checking slots for teacher: user_xxx
📅 Current date: 2024-12-06
🗑️ REMOVING past slot: 2024-11-06 09:00:00
✅ KEEPING available slot: 2024-12-07 10:00:00
✅ 5 slots available after filtering
```

### Bad Signs ❌
```
❌ Error:...
❌ Failed to...
```

---

## 🎯 Expected Results

After testing, you should see:
- ✅ No Nov 6 slots in the list
- ✅ Only today (if >3 hours from now) and future slots
- ✅ Status text says "admin approval"
- ✅ Price shows admin-configured amount (default ₹500 until you change it)
- ✅ No errors in backend console

---

## 🐛 If Something's Wrong

### Nov 6 Slots Still Showing?
1. Check backend logs for `🗑️ REMOVING` messages
2. If not seeing them, backend might not have restarted
3. Restart backend: `Ctrl+C` in backend terminal, then `npm run dev`

### Status Text Not Changed?
1. Clear browser cache
2. Hard refresh: `Ctrl+Shift+R`
3. Check "My Meetings" page specifically

### Price Still ₹500?
1. This is expected if admin hasn't configured it
2. Go to Admin → Settings → Meeting Price
3. Set to ₹100 and save
4. Refresh student page

---

## 📊 System Status

- ✅ Backend: Running on port 5000
- ✅ Frontend: Running on port 3001
- ✅ Database: Connected to Supabase
- ✅ Filters: Active (past slots, deadlines, 3-hour buffer)
- ✅ Cron Job: Running (cleanup every 10 min)

---

**Test now and report back!** 🚀

If all tests pass, we can move on to fixing:
- Admin dashboard showing "0"
- Payment success page missing details
