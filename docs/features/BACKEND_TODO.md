# Phase 1 Backend API - To-Do List

## 🎯 Backend API Endpoints Needed

### **1. Course Management API**
- `POST /api/courses` - Teacher creates a new course
- `GET /api/courses` - Get all courses (with filters)
- `GET /api/courses/:id` - Get single course details
- `PUT /api/courses/:id` - Teacher updates their course
- `DELETE /api/courses/:id` - Teacher deletes their course
- `GET /api/teacher/courses` - Get courses by teacher ID

### **2. Enrollment API**
- `POST /api/enrollments` - Student enrolls in a course
- `GET /api/enrollments/student/:id` - Get student's enrollments
- `GET /api/enrollments/course/:id` - Get course's enrolled students
- `DELETE /api/enrollments/:id` - Unenroll from course

### **3. Meeting/Scheduling API**
- `POST /api/meetings` - Student requests a meeting
- `GET /api/meetings/teacher/:id` - Teacher's meeting requests
- `GET /api/meetings/student/:id` - Student's meetings
- `PUT /api/meetings/:id/approve` - Teacher approves meeting
- `PUT /api/meetings/:id/reject` - Teacher rejects meeting

### **4. Admin API**
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - All users (already exists in frontend)
- `PUT /api/admin/users/:id/role` - Change user role (already exists)

---

## 🛠️ Backend Tech Stack
- Node.js + Express + TypeScript
- Supabase as database
- Clerk for authentication
- Deployed on Railway or Render

---

## 📦 Backend Project Structure

```
backend/
├── src/
│   ├── app.ts              # Express app setup
│   ├── server.ts           # Server entry point
│   ├── config/
│   │   ├── database.ts     # Supabase connection
│   │   └── env.ts          # Environment variables
│   ├── middleware/
│   │   ├── auth.ts         # Clerk authentication middleware
│   │   └── errorHandler.ts
│   ├── routes/
│   │   ├── courses.ts      # Course routes
│   │   ├── enrollments.ts  # Enrollment routes
│   │   ├── meetings.ts     # Meeting routes
│   │   └── admin.ts        # Admin routes
│   ├── controllers/
│   │   ├── courseController.ts
│   │   ├── enrollmentController.ts
│   │   └── meetingController.ts
│   ├── services/
│   │   ├── courseService.ts
│   │   ├── enrollmentService.ts
│   │   └── meetingService.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── .env
```

---

## ⏱️ Time Estimate
- Setup Express + TypeScript: 30 min
- Course CRUD endpoints: 1 hour
- Enrollment endpoints: 45 min
- Meeting endpoints: 45 min
- Testing & debugging: 30 min
- **TOTAL: ~3 hours**

---

## 🚀 Deployment
- Railway (recommended) or Render
- Set environment variables
- Deploy and get API URL
- Update frontend to use API URL
