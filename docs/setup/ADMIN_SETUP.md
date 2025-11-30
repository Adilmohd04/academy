# 🔐 Admin Access Guide

## Quick Steps to Become Admin:

### 1️⃣ Sign In to Your App
- Visit: http://localhost:3000
- Click "Get Started" or "Sign In"
- Sign in with Google or email

### 2️⃣ Get Your User ID from Clerk
- Go to: https://dashboard.clerk.com/
- Sign in with your Clerk account
- Click **"Users"** in sidebar
- Find your user and click on it
- You'll see your user ID (starts with `user_`)

### 3️⃣ Set Admin Role
While viewing your user in Clerk Dashboard:

1. Scroll down to **"Metadata"** section
2. Click **"Edit"** button next to **"Public metadata"**
3. Paste this JSON:
```json
{
  "role": "admin"
}
```
4. Click **"Save"**

### 4️⃣ Refresh Your Dashboard
- Go back to: http://localhost:3000/dashboard
- Press **F5** to refresh
- You should now see **"Admin Panel"** at the top!

---

## 🎨 What You'll See as Admin:

### **Dashboard Sections:**

#### **📊 Statistics**
- Total Students
- Total Courses
- Active Enrollments
- Total Revenue

#### **👥 User Management**
- View all users
- Assign roles (admin/teacher/student)
- Delete users
- See user activity

#### **📚 Course Management** (Coming Soon)
- Create new courses
- Edit existing courses
- Upload videos
- Set pricing
- Manage enrollments

#### **💰 Payment Overview** (Coming Soon)
- View all transactions
- Track revenue
- Refund management
- Payment analytics

---

## 🔐 Other User Roles:

### **Teacher Role:**
To make someone a teacher:
```json
{
  "role": "teacher"
}
```

**Teacher can:**
- Create and manage their own courses
- Upload videos
- View enrolled students
- Access teacher dashboard

### **Student Role (Default):**
```json
{
  "role": "student"
}
```

**Student can:**
- Browse courses
- Enroll in courses
- Watch videos
- Track progress
- Download certificates

---

## 🚨 Important Notes:

1. **First User Should Be Admin**
   - Make your first account an admin
   - Use admin panel to assign other roles

2. **Role Changes Take Effect Immediately**
   - Just refresh the page after changing roles
   - No need to sign out/in

3. **Multiple Admins Allowed**
   - You can have multiple admin users
   - All admins have full access

4. **Default Role is Student**
   - New signups automatically get "student" role
   - Admins can change roles later

---

## 🔗 Quick Links:

- **Your App**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard
- **Clerk Dashboard**: https://dashboard.clerk.com/
- **Sign In**: http://localhost:3000/sign-in

---

## 🆘 Troubleshooting:

**Problem: Still don't see Admin Panel**
- Make sure you saved the metadata in Clerk
- Hard refresh with **Ctrl + F5**
- Clear browser cache
- Check browser console for errors (F12)

**Problem: Can't access Clerk Dashboard**
- Make sure you're using the same account you used to create the Clerk app
- Check your email for Clerk verification

**Problem: Role not changing**
- Wait 10 seconds after saving in Clerk
- Sign out and sign back in
- Check that JSON is valid (no syntax errors)

---

**Once you're admin, you'll have full control over the platform! 🎉**
