# ⚡ URGENT: Run This SQL First!

## 🎯 What This Does
Creates the temporary slot reservation system so payments work correctly.

## 📋 Steps (2 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy & Run SQL**
   - Open file: `FIX_SLOT_CAPACITY_DISPLAY.sql`
   - Select ALL (Ctrl+A)
   - Copy (Ctrl+C)
   - Paste into Supabase SQL Editor
   - Click "Run" button

4. **Verify Success**
   - Should see: "Success. No rows returned"
   - Check for any error messages

## ✅ What Gets Created
- `temp_reservations` column
- 4 SQL functions (reserve, release, confirm, cleanup)
- Updated view `available_teacher_slots_with_capacity`
- Trigger for automatic booking increment

## 🚨 This Is Required For:
- Slot reservation when booking
- Preventing double-booking
- Auto-cleanup of abandoned bookings
- Backend cron job to work

**Run this NOW before testing anything else!**
