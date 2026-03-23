# 🗄️ Database Setup Guide

## ⚠️ Current Issue: Supabase Database Unreachable

**Error:** `ENOTFOUND db.ufmxviifrjubkhpywcpo.supabase.co`

This means your Supabase database cannot be reached. Here are the possible reasons and solutions:

---

## 🔍 Why This Happens:

### 1. **Supabase Project Paused** (Most Common)
- Free tier Supabase projects **pause after 7 days** of inactivity
- You need to go to Supabase dashboard and **resume** the project

### 2. **Wrong Connection URL**
- The database URL might have changed
- You need to get the current URL from Supabase dashboard

### 3. **Network/Firewall Issue**
- Your network might be blocking Supabase connections
- Try a different network or check firewall settings

---

## ✅ Solution Options:

### **Option 1: Resume Supabase Project** (Recommended if you want cloud database)

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard
   ```

2. **Check your project status:**
   - Look for your project: `ufmxviifrjubkhpywcpo`
   - If it says **"Paused"**, click **"Resume"**
   - Wait 2-3 minutes for it to activate

3. **Get the correct connection string:**
   - Go to: **Project Settings** → **Database**
   - Copy the **Connection String** (Session mode)
   - It should look like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.ufmxviifrjubkhpywcpo.supabase.co:5432/postgres
     ```

4. **Update `.env` file:**
   - Replace the `DATABASE_URL` with the new connection string
   - Make sure `DB_HOST` matches the hostname in DATABASE_URL

5. **Restart backend:**
   - The backend will auto-restart with nodemon
   - You should see: `✅ Database connected`

---

### **Option 2: Use Local PostgreSQL** (Recommended for development)

If you have PostgreSQL installed locally, you can use it instead:

#### **Step 1: Check if PostgreSQL is installed:**
```powershell
psql --version
```

If you see a version number (e.g., `psql (PostgreSQL) 14.x`), you're good!

If not, **install PostgreSQL**:
```
https://www.postgresql.org/download/windows/
```

#### **Step 2: Create the database:**
```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE academy;

# Exit
\q
```

#### **Step 3: Run the schema:**
```powershell
psql -U postgres -d academy -f "c:\Users\sadil\Desktop\acad\backend\database\schema.sql"
```

#### **Step 4: Update `.env` to use local database:**

Edit `c:\Users\sadil\Desktop\acad\.env`:

**Comment out Supabase (add # at the start):**
```env
# DATABASE_URL=postgresql://postgres:Adil0004@db.ufmxviifrjubkhpywcpo.supabase.co:5432/postgres
# DB_HOST=db.ufmxviifrjubkhpywcpo.supabase.co
```

**Uncomment local PostgreSQL:**
```env
DATABASE_URL=postgresql://postgres:Adil0004@localhost:5432/academy
DB_HOST=localhost
DB_PORT=5432
DB_NAME=academy
DB_USER=postgres
DB_PASSWORD=Adil0004
```

#### **Step 5: Restart backend**
- Backend will auto-restart with nodemon
- You should see: `✅ Database connected`

---

### **Option 3: Use Railway/Render/Neon** (Alternative cloud databases)

If Supabase isn't working, you can use these free alternatives:

#### **Railway:**
1. Go to: https://railway.app/
2. Create new project → **PostgreSQL**
3. Copy the connection URL
4. Update `DATABASE_URL` in `.env`

#### **Neon:**
1. Go to: https://neon.tech/
2. Create new project
3. Copy connection string
4. Update `DATABASE_URL` in `.env`

---

## 🎯 Recommended Approach:

### **For Local Development:**
✅ **Use Local PostgreSQL** - Faster, no network issues, free forever

### **For Production/Deployment:**
✅ **Use Supabase** - Managed, scalable, easy backups

---

## 🔄 Quick Fix Right Now:

**To get your app running immediately, use local PostgreSQL:**

```powershell
# 1. Install PostgreSQL (if not installed)
# Download from: https://www.postgresql.org/download/windows/

# 2. Create database
psql -U postgres -c "CREATE DATABASE academy;"

# 3. Run schema
psql -U postgres -d academy -f "c:\Users\sadil\Desktop\acad\backend\database\schema.sql"

# 4. Edit .env - change DB_HOST to localhost
# DB_HOST=localhost

# 5. Backend will auto-restart and connect!
```

---

## 📝 Current Status:

- ✅ Frontend: **Working** (http://localhost:3000)
- ⚠️ Backend: **Running** but database disconnected
- ❌ Database: **Cannot connect to Supabase**

**Choose one of the options above to fix the database connection!**

---

**Need help? Let me know which option you want to use and I'll guide you through it! 😊**
