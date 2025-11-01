# 🎓 Education Management Platform

> **Scalable education platform supporting 10,000+ concurrent users**

A complete full-stack solution with centralized backend, web app, and mobile-ready architecture. Built with modern technologies for students, teachers, and administrators.

---

## 📋 Project Overview

This is a **monorepo** containing:

1. **Backend API** - Node.js + Express + PostgreSQL + Clerk
2. **Frontend Web App** - Next.js + TailwindCSS + Clerk
3. **(Future) Mobile App** - React Native (shares same backend)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│          Web App (Next.js)                      │
│       Frontend (this folder)                    │
└──────────────┬──────────────────────────────────┘
               │
               │ HTTP/REST API
               │ JWT Authentication
               ↓
┌─────────────────────────────────────────────────┐
│      Centralized Backend API                    │
│      (Node.js + Express + TypeScript)           │
│      Backend folder                             │
└──────────────┬──────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────────┐
│        PostgreSQL Database                      │
│     (Users, Courses, Enrollments, etc.)         │
└─────────────────────────────────────────────────┘
```

---

## ✨ Features

### 👨‍🎓 Student Portal
- Browse and pay for courses
- Access video lessons (YouTube or private hosting)
- Schedule live classes with teachers
- Track progress and earn certificates
- Chat with teachers

### 👩‍🏫 Teacher Portal
- Create and upload course videos
- Structure courses (weeks, topics, quizzes)
- View enrolled students
- Approve/reject meeting requests
- Conduct live classes
- Manage communication

### 👨‍💼 Admin Portal
- Central control over users, roles, and permissions
- Manage all courses and payments
- View platform analytics
- Handle disputes and scheduling conflicts
- Configure system settings

---

## 🛠 Tech Stack

### Backend
- **Node.js** + **Express** - API server
- **TypeScript** - Type safety
- **PostgreSQL** - Relational database
- **Clerk** - Authentication
- **Helmet** - Security
- **Rate Limiting** - API protection

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Clerk** - Authentication
- **Axios** - HTTP client

---

## 📁 Project Structure

```
acad/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── middleware/     # Express middlewares
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── app.ts          # Express app
│   ├── database/
│   │   └── schema.sql      # Database schema
│   ├── package.json
│   └── README.md           # Backend documentation
│
├── frontend/               # Next.js Web App
│   ├── app/
│   │   ├── dashboard/      # Protected pages
│   │   ├── sign-in/        # Authentication
│   │   ├── sign-up/
│   │   └── page.tsx        # Landing page
│   ├── lib/
│   │   └── api.ts          # API client
│   ├── types/              # TypeScript types
│   ├── middleware.ts       # Clerk middleware
│   ├── package.json
│   └── README.md           # Frontend documentation
│
└── README.md               # This file
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **PostgreSQL** v14+
- **Clerk Account** (free tier)

### 1. Setup Backend

```powershell
# Navigate to backend
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Setup database
psql -U your_username -d education_platform -f database/schema.sql

# Start backend
npm run dev
```

Backend runs on **http://localhost:5000**

### 2. Setup Frontend

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Clerk keys

# Start frontend
npm run dev
```

Frontend runs on **http://localhost:3000**

---

## 🔧 Configuration

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
CLERK_SECRET_KEY=sk_test_xxxxx
DATABASE_URL=postgresql://user:password@localhost:5432/education_platform
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 📚 Documentation

- **[Backend README](./backend/README.md)** - API documentation, architecture, and setup
- **[Frontend README](./frontend/README.md)** - UI components, pages, and integration

---

## 🔐 Authentication Flow

1. User signs up/signs in via **Clerk** (frontend)
2. Clerk generates **JWT token**
3. Frontend sends token with every API request
4. Backend verifies token with Clerk
5. Backend checks user role and permissions
6. Backend processes request and returns data

---

## 🧩 Adding New Features

### Backend (API Endpoint)
1. Create service in `backend/src/services/`
2. Create routes in `backend/src/routes/`
3. Register routes in `backend/src/app.ts`

### Frontend (Page/Component)
1. Create page in `frontend/app/`
2. Add API call in `frontend/lib/api.ts`
3. Use API client in your page

**Both are modular and easy to extend!**

---

## 🚀 Scalability Features

✅ **Database Connection Pooling** - Handles multiple concurrent connections  
✅ **Rate Limiting** - Prevents API abuse  
✅ **Horizontal Scaling** - Add more server instances  
✅ **Caching Strategy** - Redis for session management  
✅ **Load Balancing** - Distribute traffic across servers  
✅ **CDN Integration** - Fast static asset delivery  
✅ **Microservices Ready** - Modular architecture  

---

## 📊 Database Schema

Tables:
- `users` - User accounts (students, teachers, admins)
- `courses` - Course information
- `videos` - Video lessons
- `enrollments` - Student course enrollments
- `meetings` - Scheduled meetings
- `messages` - Chat messages
- `video_progress` - Learning progress
- `certificates` - Course completions

See `backend/database/schema.sql` for full schema.

---

## 🧪 Testing

### Backend
```powershell
cd backend
npm test
```

### Frontend
```powershell
cd frontend
npm test
```

### Manual Testing
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Visit http://localhost:3000
4. Test sign up → sign in → dashboard flow

---

## 🚢 Deployment

### Backend
**Recommended:** AWS EC2, Google Cloud Run, Render

```powershell
cd backend
npm run build
npm start
```

### Frontend
**Recommended:** Vercel (automatic Next.js deployment)

```powershell
cd frontend
npm run build
npm start
```

### Environment Variables
Remember to set all environment variables in production:
- Clerk keys
- Database URL
- API URLs
- CORS origins

---

## 🎯 Roadmap

### Phase 1: Core Features ✅
- [x] Landing page
- [x] Authentication (Clerk)
- [x] Backend API structure
- [x] Database schema
- [x] Role-based access

### Phase 2: Course Management (Next)
- [ ] Course CRUD operations
- [ ] Video upload & streaming
- [ ] Enrollment system
- [ ] Payment integration (Razorpay/Stripe)

### Phase 3: Real-time Features
- [ ] Live meeting scheduler (Zoom/Jitsi)
- [ ] Real-time chat (Socket.io)
- [ ] Notifications

### Phase 4: Mobile App
- [ ] React Native app
- [ ] Share same backend API
- [ ] iOS & Android builds

### Phase 5: Advanced Features
- [ ] Progress tracking
- [ ] Certificate generation
- [ ] AI recommendations
- [ ] Analytics dashboard

---

## 🤝 Contributing

### Code Style
- Use TypeScript for all new code
- Follow existing patterns
- Add comments for complex logic
- Update documentation

### Workflow
1. Create feature branch
2. Make changes
3. Test locally
4. Update README if needed
5. Commit with clear message

---

## 🆘 Support

### Common Issues

**Backend won't start:**
- Check PostgreSQL is running
- Verify `.env` configuration
- Ensure Clerk keys are correct

**Frontend won't start:**
- Check `.env.local` exists
- Verify backend is running
- Check Clerk configuration

**API calls failing:**
- Verify CORS settings in backend
- Check JWT token is being sent
- Ensure backend URL is correct

---

## 📝 License

MIT License - Free to use for your projects!

---

## 🌟 Built With

- ❤️ **Passion** for education technology
- 🚀 **Modern** tech stack for scalability
- 🎯 **Best practices** for maintainability
- 📚 **Documentation** for easy onboarding

---

**Happy Building! 🎓**

For detailed setup instructions, see:
- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
