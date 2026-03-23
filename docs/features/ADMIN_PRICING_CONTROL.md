# 💰 ADMIN PRICING CONTROL - Complete Guide

## ✅ **PERFECT! Admin can now control pricing dynamically!**

You already have a **fully functional admin settings page** where you can:
- Set meeting price to **any amount** (₹50, ₹100, ₹200, ₹500, ₹1000, etc.)
- Set to **₹0 for FREE meetings**
- Update price anytime - **changes apply immediately**

---

## 🎯 How to Use Admin Settings

### Step 1: Access Admin Settings Page

**Option A - From Admin Dashboard:**
1. Go to admin dashboard
2. Click on **"Meeting Settings"** card (purple gradient card)
3. Or click **"Settings"** tab in navigation

**Option B - Direct URL:**
```
http://localhost:3000/admin/settings
```

### Step 2: Update Meeting Price

1. You'll see a form with current price
2. Enter new price (e.g., `100` for ₹100)
3. Click **"Save Changes"** button
4. You'll see: ✅ "Meeting price updated successfully!"

### Step 3: Verify Changes

1. Students will **immediately** see new price when:
   - Browsing teachers
   - Selecting time slots
   - Going to payment page

2. Check student view:
   - Go to `/student/schedule-meeting`
   - Price should show updated amount

---

## 🎨 What Students See

### When Admin Sets ₹100:
```
📅 Schedule Meeting

Teacher: John Doe
Date: November 8, 2025
Time: 10:00 AM - 11:00 AM

💰 Price: ₹100
```

### When Admin Sets ₹0 (FREE):
```
📅 Schedule Meeting

Teacher: John Doe
Date: November 8, 2025
Time: 10:00 AM - 11:00 AM

💰 Price: FREE 🎁
```

### When Admin Sets ₹500:
```
📅 Schedule Meeting

Teacher: John Doe
Date: November 8, 2025
Time: 10:00 AM - 11:00 AM

💰 Price: ₹500
```

---

## 🔧 Initial Setup Required

### Step 1: Update Database (ONE TIME ONLY)

Run this SQL in **Supabase SQL Editor**:

```sql
UPDATE system_settings
SET setting_value = '100', updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'meeting_price';
```

**Why?**: Database currently has '500' but you want '100' as starting price.

### Step 2: Restart Backend (if running)

```powershell
cd C:\Users\sadil\Desktop\acad\backend
npm run dev
```

### Step 3: Test Admin Settings Page

1. Go to `http://localhost:3000/admin/settings`
2. You should see: **₹100**
3. Try changing to ₹200
4. Click "Save Changes"
5. Should show: ✅ Success message

---

## 📊 How It Works Behind the Scenes

### Admin Updates Price:

```
Admin Settings Page
      ↓
PUT /api/settings/meeting-price
      ↓
Database: UPDATE system_settings SET setting_value = '200'
      ↓
✅ Price Updated to ₹200
```

### Student Books Meeting:

```
Student Booking Page
      ↓
GET /api/settings/meeting-price
      ↓
Database: SELECT setting_value FROM system_settings
      ↓
Returns: { price: 200 }
      ↓
Student sees: ₹200
      ↓
Payment: ₹200 sent to Razorpay
```

---

## 🎯 Common Use Cases

### 1. **Regular Meetings at ₹100**
```
Admin Settings → Enter 100 → Save
Students see: ₹100
```

### 2. **Premium Meetings at ₹500**
```
Admin Settings → Enter 500 → Save
Students see: ₹500
```

### 3. **FREE Promotional Week**
```
Admin Settings → Enter 0 → Save
Students see: FREE 🎁
(No payment required)
```

### 4. **Discount Period at ₹50**
```
Admin Settings → Enter 50 → Save
Students see: ₹50
```

---

## 🚀 Advanced: Per-Teacher Pricing (Coming Soon)

In the future implementation, you'll be able to set:

```
Teacher A: ₹100 (Regular)
Teacher B: ₹200 (Senior)
Teacher C: ₹500 (Expert)
Teacher D: FREE (Promotional)
```

Students will see different prices based on which teacher they select.

**Current Status**: Global price (all teachers same)  
**Coming Soon**: Per-teacher custom pricing (Phase 2)

---

## ✅ Testing Checklist

### Admin Side:
- [ ] Can access `/admin/settings`
- [ ] Current price loads correctly
- [ ] Can change price to any amount
- [ ] Save button works
- [ ] Success message appears
- [ ] Refresh shows updated price

### Student Side:
- [ ] Student sees correct price on booking page
- [ ] Price matches admin setting
- [ ] Payment shows correct amount
- [ ] Razorpay receives correct amount
- [ ] FREE meetings skip payment (if ₹0)

---

## 🔒 Security Notes

- ✅ **Only admins** can access settings page
- ✅ **Authentication required** via Clerk
- ✅ **Backend validates** admin role
- ✅ **Input validation** prevents negative prices
- ✅ **Database constraints** ensure data integrity

---

## 📱 Screenshots of Admin Settings Page

### Header Section:
```
┌─────────────────────────────────────────────┐
│  ⚙️  System Settings                      🔄 │
│     Configure platform settings and pricing  │
└─────────────────────────────────────────────┘
```

### Meeting Price Form:
```
┌─────────────────────────────────────────────┐
│  💵  Meeting Price                          │
│                                              │
│  Set the default price for one-on-one        │
│  meetings with teachers.                     │
│                                              │
│  Price (INR)                                 │
│  ┌────────────┐                             │
│  │ ₹ 100      │                             │
│  └────────────┘                             │
│                                              │
│  Current students will see: ₹100            │
│                                              │
│  💡 How it works:                           │
│  • Students see this price when scheduling  │
│  • Price is shown before payment            │
│  • Changes apply immediately to new         │
│  • Existing bookings are not affected       │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │      💾  Save Changes                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 🎉 Summary

### What You Get:
✅ **Full admin control** over meeting prices  
✅ **Easy-to-use interface** with instant updates  
✅ **Flexible pricing** - any amount or FREE  
✅ **Real-time changes** - no server restart needed  
✅ **Student-friendly display** - shows price before booking  
✅ **Secure system** - admin-only access

### What's Changed:
- Default price: `₹500 → ₹100`
- Admin can change anytime via settings page
- Students always see current price from database
- No hardcoded values anywhere

### Next Steps:
1. ✅ Run SQL update (one time only)
2. ✅ Test admin settings page
3. ✅ Verify student sees correct price
4. 🎯 Ready to go live!

---

**Access Admin Settings**: `http://localhost:3000/admin/settings`  
**Current Default**: ₹100  
**Can Change To**: Any amount (₹0, ₹50, ₹100, ₹500, ₹1000, etc.)  
**Changes Take Effect**: Immediately upon save

🎉 **You're all set! Admin has full control over pricing!**
