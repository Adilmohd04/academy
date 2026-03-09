# Islamic Academy Platform - AI Agent Guidelines

## Project Overview
Full-stack education platform built with Next.js 14 (frontend) and Express.js + TypeScript (backend). Supports 10K+ concurrent users with role-based access (Admin, Teacher, Student). Uses Clerk for authentication, Supabase for database, and integrates Stripe payments, Google Calendar, and automated notifications.

## Architecture & Data Flow

### Modular Backend Structure
Backend uses a **feature-based modular architecture** under `backend/src/modules/`:
- `admin/` - Admin-only controllers/services (course approval, payment management)
- `teacher/` - Teacher-specific features (course creation, student management, autosave)
- `student/` - Student features (course enrollment, progress tracking)
- `shared/` - Shared resources (live classes, leaderboards, payments)
- `user/` - User profile management

**Pattern**: Controllers → Services → Supabase client
- Controllers handle HTTP requests (`backend/src/modules/{role}/controllers/`)
- Services contain business logic (`backend/src/modules/{role}/services/`)
- Direct Supabase client usage (NOT pg-pool) via `import { supabase } from '../../../config/database'`

### Authentication Flow
**Clerk-based JWT authentication** with dual header support:
1. `x-clerk-user-id` header (from Next.js middleware) - preferred method
2. `Authorization: Bearer <token>` - fallback

All protected routes use `requireAuth` middleware from `backend/src/middleware/clerkAuth.ts`. User roles stored in Clerk's `publicMetadata.role`.

### Database Layer
**Supabase PostgreSQL** is the primary database interface:
- Use `supabase` client from `backend/src/config/database.ts` (NOT raw pg-pool)
- Schema migrations in `backend/database/migrations/` (run via `.sql` files or `.mjs` scripts)
- Key tables: `courses`, `profiles`, `enrollments`, `course_weeks`, `course_lessons`, `live_sessions`, `assignments`, `quizzes`, `certificates`

### Frontend Architecture
Next.js 14 with App Router:
- Route structure: `frontend/app/{role}/` (admin, teacher, student, dashboard)
- API calls via `frontend/lib/api.ts` (centralized axios client)
- Auth patterns: `useAuth()` hook in client components, `auth()` in server components
- Token management: `const token = await getToken(); api.courses.getAll(token)`

## Critical Workflows

### Development Commands
**Backend** (from `backend/` directory):
```powershell
npm run dev          # Start dev server with nodemon (watches TypeScript files)
npm run build        # Compile TypeScript to dist/
npm start            # Run production build
```

**Frontend** (from `frontend/` directory):
```powershell
npm run dev          # Next.js dev server (port 3000 by default)
npm run build        # Production build
npm start            # Start production server
```

**Database migrations**:
```powershell
# From backend/ directory
node run-migration-direct.mjs    # Run migrations directly via Supabase
```

### Course Draft/Publish System
**Unique workflow** using `approval_status` field:
1. Draft (`draft`) - Teacher saves work, not visible to students
2. Pending Approval (`pending_approval`) - Submitted to admin
3. Approved (`approved`) - Visible to students for enrollment
4. Rejected (`rejected`) - Sent back to teacher

**Implementation**: 
- Creation UI: `frontend/app/teacher/courses/create/page.tsx`
- Backend: `backend/src/modules/teacher/services/courseService.ts`
- Admin approval: `frontend/app/admin/courses/approve/`

### Autosave Pattern
Teachers can save course content drafts **automatically every 30 seconds**:
- Service: `backend/src/modules/teacher/services/autosaveService.ts`
- Stores partial course weeks/lessons in `teacher_autosaves` table
- Frontend implements debounced save with `useEffect` timers

### Live Class Scheduling
**Google Calendar integration** for real Google Meet links:
- Requires `GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_IMPERSONATED_USER` env vars
- Service: `backend/src/modules/shared/services/calendarService.ts`
- Falls back to pseudo Meet-style links if not configured
- Live sessions tracked in `live_sessions` table with attendance in `session_attendees`

## Code Conventions

### TypeScript Patterns
- **Controllers**: Always return `Promise<void>`, use `res.status().json()` directly
- **Services**: Return typed data objects or throw errors
- **Error handling**: Wrap in try-catch, return `{ success: false, message: '...' }` or use next(error)

### Supabase Query Pattern
```typescript
import { supabase } from '../../../config/database';

const { data, error } = await supabase
  .from('table_name')
  .select('*, related_table(*)')  // Use joins with parentheses
  .eq('field', value)
  .single();  // For single record, .maybeSingle() for optional

if (error) throw error;
```

### Authentication in Routes
```typescript
// Backend route with role checking
router.get('/courses', requireAuth, requireRole(['teacher', 'admin']), getCourses);

// Frontend API call
const { getToken } = useAuth();
const token = await getToken();
const courses = await api.courses.getAll(token);
```

### Next.js Client/Server Component Patterns
- Use `'use client'` directive for components with hooks (useState, useEffect, useAuth)
- Server components can directly import and call backend APIs (but use API routes instead)
- Middleware in `frontend/middleware.ts` handles auth redirects by role

## Integration Points

### Clerk Webhooks
Endpoint: `backend/src/routes/webhooks.ts` (POST `/api/webhooks/clerk`)
- Syncs user creation/updates to `profiles` table
- Uses Svix for webhook verification

### Stripe Payments
- Controller: `backend/src/modules/shared/controllers/paymentController.ts`
- Webhook: POST `/api/webhooks/stripe` (payment confirmation → enrollment creation)
- Creates enrollment records automatically on successful payment

### Email Notifications
Service: `backend/src/services/emailNotifications.ts`
- Uses Nodemailer with Gmail SMTP (requires `GMAIL_USER` and `GMAIL_APP_PASSWORD`)
- Background job: `backend/src/jobs/classNotifications.ts` (sends reminders 1 hour before class)

### Cron Jobs
- `backend/src/jobs/updateMeetingStatus.ts` - Updates live session statuses (runs every 24h)
- `backend/src/jobs/classNotifications.ts` - Sends email reminders for upcoming classes

## Common Pitfalls

1. **DO NOT use pg-pool directly** - Always use `supabase` client from `config/database.ts`
2. **Role checks**: Use `requireRole()` middleware, don't manually check `req.auth.role` in every controller
3. **Env vars**: Backend loads from `backend/.env` (root .env is for documentation only)
4. **CORS**: Frontend dev runs on port 3000, backend on 5000. CORS allows multiple origins (see `app.ts`)
5. **Migrations**: Never edit existing migration files - create new ones in `backend/database/migrations/`
6. **Frontend API calls**: Always use `frontend/lib/api.ts` methods, don't use raw axios/fetch
7. **TypeScript paths**: Use relative imports (no path aliases configured)

## Key Files Reference

- **Backend entry**: `backend/src/server.ts` (imports `app.ts`)
- **Database config**: `backend/src/config/database.ts`
- **Auth middleware**: `backend/src/middleware/clerkAuth.ts`
- **Frontend API client**: `frontend/lib/api.ts`
- **Frontend middleware**: `frontend/middleware.ts` (role-based redirects)
- **Course management**: `backend/src/modules/teacher/services/courseService.ts`
- **Live class logic**: `backend/src/modules/shared/controllers/liveClassesController.ts`

## Testing Checklist

Before deploying changes:
1. Test auth flow: Login as admin/teacher/student (different Clerk accounts)
2. Verify role-based access (try accessing teacher routes as student)
3. Check Supabase queries return expected data structure
4. Validate env vars are set (especially `DATABASE_URL`, `SUPABASE_URL`, `CLERK_SECRET_KEY`)
5. Test CORS if frontend/backend on different ports
