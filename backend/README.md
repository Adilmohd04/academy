# 🎓 Education Platform - Backend API

> Scalable education management platform backend supporting **10,000+ concurrent users**

A modern, production-ready RESTful API built with Node.js, Express, TypeScript, and PostgreSQL. Features authentication with Clerk, role-based access control, and a modular architecture designed for easy feature additions.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Setup](#-environment-setup)
- [Database Setup](#-database-setup)
- [Running the Server](#-running-the-server)
- [API Endpoints](#-api-endpoints)
- [Adding New Features](#-adding-new-features)
- [Architecture Overview](#-architecture-overview)
- [Scaling for 10K+ Users](#-scaling-for-10k-users)

---

## ✨ Features

- ✅ **Clerk Authentication** - JWT-based authentication with Google OAuth support
- ✅ **Role-Based Access Control** - Admin, Teacher, and Student roles
- ✅ **PostgreSQL Database** - With connection pooling for scalability
- ✅ **TypeScript** - Full type safety across the application
- ✅ **Modular Architecture** - Easy to add new features and services
- ✅ **Rate Limiting** - API protection against abuse
- ✅ **Security** - Helmet, CORS, and input validation
- ✅ **Error Handling** - Centralized error management
- ✅ **Request Logging** - Morgan for development and production
- ✅ **Compression** - Gzip compression for responses
- ✅ **Health Checks** - Monitor system and database status

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime |
| **Express** | Web framework |
| **TypeScript** | Type safety |
| **PostgreSQL** | Relational database |
| **Clerk** | Authentication & user management |
| **Helmet** | Security headers |
| **Morgan** | HTTP request logging |
| **CORS** | Cross-origin resource sharing |

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts   # PostgreSQL connection & pooling
│   │   └── env.ts        # Environment variables
│   │
│   ├── middleware/       # Express middlewares
│   │   ├── clerkAuth.ts  # Clerk JWT verification
│   │   ├── errorHandler.ts  # Global error handling
│   │   └── rateLimiter.ts   # Rate limiting configs
│   │
│   ├── routes/           # API route handlers
│   │   ├── health.ts     # Health check endpoints
│   │   └── users.ts      # User management endpoints
│   │
│   ├── services/         # Business logic layer
│   │   ├── healthService.ts
│   │   └── userService.ts
│   │
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts      # Shared types
│   │
│   ├── app.ts            # Express app configuration
│   └── server.ts         # Server entry point
│
├── database/
│   └── schema.sql        # Database schema
│
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### 🗂 Folder Purposes

- **`config/`** - Centralized configuration management
- **`middleware/`** - Express middleware functions
- **`routes/`** - API endpoint definitions
- **`services/`** - Business logic (separated from routes)
- **`types/`** - TypeScript interfaces and types

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **npm** or **yarn**
- **Clerk Account** (free tier available)

### Installation

1. **Clone the repository**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your actual values
```

---

## 🔧 Environment Setup

### 1. Clerk Setup

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application
3. Get your **Secret Key** and **Publishable Key**
4. Add them to your `.env` file

### 2. PostgreSQL Setup

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (Windows)
# Download from: https://www.postgresql.org/download/windows/

# Create database
psql -U postgres
CREATE DATABASE education_platform;
\q
```

**Option B: Cloud Database (Recommended)**
- [Supabase](https://supabase.com/) - Free tier available
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Railway](https://railway.app/) - Auto-scaling database

### 3. Configure `.env` File

```env
# Server
PORT=5000
NODE_ENV=development

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/education_platform
DB_HOST=localhost
DB_PORT=5432
DB_NAME=education_platform
DB_USER=your_username
DB_PASSWORD=your_password
DB_MAX_CONNECTIONS=20

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 💾 Database Setup

### Initialize Database Schema

```bash
# Run the schema SQL file
psql -U your_username -d education_platform -f database/schema.sql
```

This creates all necessary tables:
- `users` - User accounts
- `courses` - Course information
- `videos` - Video lessons
- `enrollments` - Student course enrollments
- `meetings` - Scheduled meetings
- `messages` - Chat messages
- `video_progress` - Learning progress tracking
- `certificates` - Course completion certificates

---

## ▶ Running the Server

### Development Mode
```bash
npm run dev
```
Server runs on `http://localhost:5000` with auto-reload.

### Production Build
```bash
npm run build
npm start
```

### Test API
```bash
# Health check
curl http://localhost:5000/api/health

# API info
curl http://localhost:5000/api/health/info
```

---

## 📡 API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API welcome message |
| GET | `/api/health` | System health check |
| GET | `/api/health/info` | API information |

### Protected Endpoints (Requires Authentication)

#### User Management

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/users/profile` | All | Get current user profile |
| PUT | `/api/users/profile` | All | Update current user profile |
| GET | `/api/users` | Admin | Get all users |
| PUT | `/api/users/:id/role` | Admin | Update user role |
| DELETE | `/api/users/:id` | Admin | Delete user |

### Authentication

Include JWT token in request headers:
```
Authorization: Bearer <clerk_jwt_token>
```

### Example Request
```bash
curl -H "Authorization: Bearer YOUR_CLERK_JWT" \
     http://localhost:5000/api/users/profile
```

---

## ➕ Adding New Features

Our modular architecture makes it easy to add new features! Follow this pattern:

### Example: Adding a "Courses" Feature

#### 1. Create Service (`src/services/courseService.ts`)
```typescript
import { query } from '../config/database';

export class CourseService {
  static async getAllCourses() {
    const result = await query('SELECT * FROM courses');
    return result.rows;
  }
  
  static async createCourse(data: any) {
    // Business logic here
  }
}
```

#### 2. Create Routes (`src/routes/courses.ts`)
```typescript
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { CourseService } from '../services/courseService';
import { UserRole } from '../types';

const router = Router();

router.get('/', async (req, res) => {
  const courses = await CourseService.getAllCourses();
  res.json({ success: true, data: courses });
});

router.post('/', requireAuth, requireRole([UserRole.TEACHER, UserRole.ADMIN]), async (req, res) => {
  // Create course
});

export default router;
```

#### 3. Register Routes (`src/app.ts`)
```typescript
import courseRoutes from './routes/courses';

// Add in initializeRoutes() method
this.app.use('/api/courses', courseRoutes);
```

**That's it! Your new feature is ready!** ✅

---

## 🏗 Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────┐
│         Client (Web/Mobile)         │
└──────────────┬──────────────────────┘
               │ HTTP Requests
               ↓
┌─────────────────────────────────────┐
│          Express Routes             │  ← API endpoints
│   (routes/users.ts, courses.ts)     │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│         Service Layer               │  ← Business logic
│   (services/userService.ts)         │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│      Database Layer (PostgreSQL)    │  ← Data persistence
└─────────────────────────────────────┘
```

### Request Flow

1. **Client** sends HTTP request with JWT token
2. **Middleware** validates token and checks permissions
3. **Route Handler** receives validated request
4. **Service Layer** executes business logic
5. **Database** performs CRUD operations
6. **Response** returns JSON to client

---

## 🚀 Scaling for 10K+ Users

### Current Optimizations

✅ **Connection Pooling** - Reuses database connections  
✅ **Rate Limiting** - Prevents API abuse  
✅ **Compression** - Reduces response size  
✅ **Indexed Queries** - Fast database lookups  
✅ **TypeScript** - Catches errors at compile time  

### Production Deployment Checklist

#### 1. **Database Scaling**
- [ ] Use read replicas for read-heavy operations
- [ ] Enable query caching with Redis
- [ ] Optimize slow queries with EXPLAIN ANALYZE
- [ ] Set up automated backups

#### 2. **Application Scaling**
- [ ] Deploy to cloud platform (AWS/Azure/GCP)
- [ ] Use load balancer for multiple server instances
- [ ] Enable horizontal scaling (add more servers)
- [ ] Set up health check monitoring

#### 3. **Performance**
- [ ] Add Redis for session caching
- [ ] Use CDN for static assets
- [ ] Enable HTTP/2
- [ ] Implement API response caching

#### 4. **Security**
- [ ] Enable HTTPS
- [ ] Set up firewall rules
- [ ] Implement API key rotation
- [ ] Add request validation
- [ ] Set up DDoS protection

#### 5. **Monitoring**
- [ ] Set up logging (Winston/Pino)
- [ ] Add APM tool (New Relic/Datadog)
- [ ] Configure alerts
- [ ] Track metrics (requests/sec, response time)

### Recommended Services

- **Hosting**: AWS EC2, Google Cloud Run, Render
- **Database**: AWS RDS, Supabase, Neon
- **Caching**: Redis Cloud, AWS ElastiCache
- **Monitoring**: New Relic, Datadog, Sentry

---

## 🤝 Contributing

### Code Style

- Use TypeScript for all new files
- Follow existing naming conventions
- Add comments for complex logic
- Write descriptive commit messages

### Adding New Features

1. Create feature branch
2. Add service layer logic
3. Create API routes
4. Update types if needed
5. Test thoroughly
6. Update documentation

---

## 📝 License

MIT License - feel free to use this project as you wish!

---

## 🆘 Support

If you encounter any issues:

1. Check `.env` configuration
2. Verify database connection
3. Ensure Clerk keys are correct
4. Check PostgreSQL is running
5. Review error logs in console

---

## 🎯 Next Steps

### Features to Implement

- [ ] Course management (CRUD)
- [ ] Payment integration (Razorpay/Stripe)
- [ ] Video upload & streaming
- [ ] Meeting scheduler (Zoom/Jitsi)
- [ ] Real-time chat (Socket.io)
- [ ] Progress tracking
- [ ] Certificate generation
- [ ] Email notifications
- [ ] Admin analytics dashboard

---

**Built with ❤️ for scalable education platforms**
