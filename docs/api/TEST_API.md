# Backend API Testing Guide

## ✅ Server Status

**Backend Server Running:** http://localhost:5000

**Database:** Supabase connected via Supabase client

---

## 📚 Course API Endpoints

### 1. **GET /api/courses** - List All Courses ✅
**Status:** PUBLIC (No authentication required)

**Test:**
```bash
curl http://localhost:5000/api/courses
```

**Expected Response:**
```json
{
  "success": true,
  "count": 0,
  "data": []
}
```

---

### 2. **GET /api/courses/:id** - Get Single Course ✅
**Status:** PUBLIC (No authentication required)

**Test:**
```bash
curl http://localhost:5000/api/courses/1
```

---

### 3. **POST /api/courses** - Create Course 🔒
**Status:** PROTECTED (Teacher authentication required)

**Headers Needed:**
- `Authorization: Bearer <CLERK_JWT_TOKEN>`
- `Content-Type: application/json`

**Test Body:**
```json
{
  "title": "Introduction to Web Development",
  "description": "Learn HTML, CSS, and JavaScript basics",
  "category": "Web Development",
  "level": "beginner",
  "duration_weeks": 8,
  "price": 99.99,
  "max_students": 50
}
```

**To test this endpoint, you need:**
1. Sign in as a Teacher in your frontend: https://academy-two-green.vercel.app
2. Get your Clerk JWT token from browser DevTools (Application > Local Storage > clerk token)
3. Use the token in Authorization header

---

### 4. **PUT /api/courses/:id** - Update Course 🔒
**Status:** PROTECTED (Teacher authentication required - owner only)

**Headers Needed:**
- `Authorization: Bearer <CLERK_JWT_TOKEN>`
- `Content-Type: application/json`

**Test Body:**
```json
{
  "title": "Advanced Web Development",
  "price": 149.99
}
```

---

### 5. **DELETE /api/courses/:id** - Delete Course 🔒
**Status:** PROTECTED (Teacher authentication required - owner only)

**Headers Needed:**
- `Authorization: Bearer <CLERK_JWT_TOKEN>`

**Test:**
```bash
curl -X DELETE http://localhost:5000/api/courses/1 \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

---

### 6. **GET /api/teacher/courses** - Get Teacher's Courses 🔒
**Status:** PROTECTED (Teacher authentication required)

**Headers Needed:**
- `Authorization: Bearer <CLERK_JWT_TOKEN>`

**Test:**
```bash
curl http://localhost:5000/api/teacher/courses \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

---

## 🧪 Quick Test Results

### Health Check ✅
```bash
curl http://localhost:5000/api/health
```
**Result:** API is running, Supabase client connected

### Get All Courses ✅
```bash
curl http://localhost:5000/api/courses
```
**Result:** Returns empty array (no courses yet)

---

## 🔐 How to Get Clerk JWT Token for Protected Endpoints

1. **Sign in to your frontend:** https://academy-two-green.vercel.app
2. **Open Browser DevTools:** Press F12
3. **Go to Application tab** (Chrome) or Storage tab (Firefox)
4. **Find Clerk session token:**
   - Chrome: Application > Cookies > Look for `__session`
   - Or check Local Storage for clerk-related tokens
5. **Copy the JWT token** (long string starting with `eyJ...`)
6. **Use in API calls:**
   ```bash
   curl http://localhost:5000/api/courses \
     -H "Authorization: Bearer eyJ..."
   ```

---

## 🎯 Next Steps

### Option A: Test Course Creation (Recommended) ⏰ 15 minutes
1. Get your Clerk JWT token (see above)
2. Create a test course via POST /api/courses
3. Verify it appears in Supabase database
4. Test GET /api/courses to see the new course

### Option B: Build Enrollment API ⏰ 1 hour
Create enrollment endpoints so students can enroll in courses

### Option C: Connect Frontend to Backend ⏰ 1 hour
Update teacher portal to create real courses using this API

---

## 📊 Current Phase 1 Progress

**Overall: 75% Complete** 🎉

- ✅ Database: 100% (All tables created)
- ✅ Frontend: 100% (Deployed with role-based portals)
- ✅ Backend Server: 100% (Running on port 5000)
- ✅ Course API Code: 100% (All 6 endpoints working)
- 🚧 Course API Testing: 25% (Basic GET tested)
- ⏸️ Enrollment API: 0%
- ⏸️ Frontend-Backend Connection: 0%

---

## 🐛 Troubleshooting

### Server not starting?
```bash
cd backend
npm run dev
```

### Port 5000 already in use?
Change PORT in backend/.env to another port (e.g., 5001)

### Supabase errors?
Check backend/.env has correct SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

### Authentication errors?
Make sure you're using a valid Clerk JWT token from a signed-in user

---

## 📝 Notes

- Database pool connection is disabled (using Supabase client instead)
- All Course API operations go directly to Supabase
- RLS policies in Supabase will enforce additional security
- Teacher ID in courses table = Clerk user ID (no separate mapping needed)
