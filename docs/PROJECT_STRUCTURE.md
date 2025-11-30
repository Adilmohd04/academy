# Project Structure

This document outlines the organized folder structure of the Islamic Academy platform.

## Root Structure

```
acad/
├── backend/                 # Backend API (Node.js + Express + TypeScript)
├── frontend/               # Frontend UI (Next.js 14 + React 18 + TypeScript)
├── database/               # Database utilities and management
├── docs/                   # All project documentation
├── .env                    # Environment variables (root level)
├── .gitignore              # Git ignore rules
└── README.md               # Main project README
```

## Backend Structure (`/backend`)

```
backend/
├── src/
│   ├── app.ts                     # Express app configuration
│   ├── server.ts                  # Server entry point
│   ├── server-clustered.ts        # Clustered server for production
│   │
│   ├── config/                    # Configuration files
│   │   ├── database.ts           # Supabase database config
│   │   └── stripe.ts             # Stripe payment config
│   │
│   ├── controllers/               # Request handlers
│   │   ├── boxApprovalController.ts
│   │   ├── courseController.ts
│   │   ├── meetingController.ts
│   │   ├── paymentController.ts
│   │   ├── settingsController.ts
│   │   ├── teacherAvailabilityController.ts
│   │   ├── teacherPricingController.ts
│   │   └── timeSlotController.ts
│   │
│   ├── services/                  # Business logic layer
│   │   ├── boxApprovalService.ts
│   │   ├── calendarService.ts
│   │   ├── courseService.ts
│   │   ├── emailService.ts
│   │   ├── healthService.ts
│   │   ├── meetingService.ts
│   │   ├── paymentService.ts
│   │   ├── settingsService.ts
│   │   ├── teacherAvailabilityService.ts
│   │   ├── teacherPricingService.ts
│   │   ├── timeSlotService.ts
│   │   └── userService.ts
│   │
│   ├── routes/                    # API route definitions
│   │   ├── boxes.ts
│   │   ├── courses.ts
│   │   ├── health.ts
│   │   ├── meetings.ts
│   │   ├── payments.ts
│   │   ├── settings.ts
│   │   ├── teacherAvailability.ts
│   │   ├── teacherPricing.ts
│   │   ├── timeSlots.ts
│   │   ├── users.ts
│   │   └── webhooks.ts
│   │
│   ├── middleware/                # Express middleware
│   │   ├── auth.ts               # Authentication middleware
│   │   ├── errorHandler.ts       # Global error handler
│   │   └── validation.ts         # Request validation
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── meeting.ts
│   │   ├── payment.ts
│   │   └── user.ts
│   │
│   ├── utils/                     # Utility functions
│   │   ├── date.ts
│   │   ├── logger.ts
│   │   └── validation.ts
│   │
│   ├── jobs/                      # Background jobs & scheduled tasks
│   │   └── emailJobs.ts
│   │
│   └── scripts/                   # Utility scripts
│       └── check-env.js
│
├── database/                      # Database-related files
│   ├── schema.sql                # Main database schema
│   └── migrations/               # Database migrations
│       ├── add-meeting-resources.sql
│       └── add-system-settings.sql
│
├── dist/                         # Compiled TypeScript output
├── node_modules/                 # Node dependencies
├── .env                          # Backend environment variables
├── package.json                  # Backend dependencies
├── tsconfig.json                 # TypeScript configuration
├── railway.json                  # Railway deployment config
├── vercel.json                   # Vercel deployment config
└── README.md                     # Backend documentation
```

## Frontend Structure (`/frontend`)

```
frontend/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Authentication pages
│   │   ├── sign-in/
│   │   └── sign-up/
│   │
│   ├── student/                  # Student dashboard
│   │   ├── meetings/
│   │   ├── StudentDashboardClient.tsx
│   │   └── layout.tsx
│   │
│   ├── teacher/                  # Teacher dashboard
│   │   ├── availability/
│   │   ├── meetings/
│   │   ├── TeacherDashboardClient.tsx
│   │   └── layout.tsx
│   │
│   ├── admin/                    # Admin dashboard
│   │   ├── meetings/
│   │   ├── teachers/
│   │   ├── students/
│   │   └── settings/
│   │
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
│
├── components/                   # Reusable React components
│   ├── ui/                       # UI components (shadcn/ui)
│   ├── auth/
│   ├── dashboard/
│   └── meetings/
│
├── lib/                          # Utilities and helpers
│   ├── api.ts                    # API client functions
│   ├── utils.ts                  # Utility functions
│   └── hooks/                    # Custom React hooks
│
├── public/                       # Static assets
│   ├── images/
│   └── icons/
│
├── .next/                        # Next.js build output
├── node_modules/                 # Node dependencies
├── .env.local                    # Frontend environment variables
├── package.json                  # Frontend dependencies
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── next.config.js                # Next.js configuration
└── eslint.config.mjs             # ESLint configuration
```

## Database Structure (`/database`)

```
database/
├── migrations/                   # Database migration scripts
│   ├── 001_initial_schema.sql
│   └── 002_add_features.sql
│
├── seeds/                        # Seed data for development
│   ├── test-users.sql
│   └── sample-data.sql
│
└── utilities/                    # Utility SQL scripts
    ├── FIX_SLOT_CAPACITY.sql
    └── UPDATE_VIEW_ADD_MEETING_PRICE.sql
```

## Documentation Structure (`/docs`)

```
docs/
├── api/                          # API documentation
│   ├── MEETING_API.md            # Meeting endpoints
│   └── TEST_API.md               # API testing guide
│
├── features/                     # Feature documentation
│   ├── booking-system.md
│   ├── payment-integration.md
│   └── teacher-availability.md
│
├── fixes/                        # Bug fixes & troubleshooting
│   └── completed/                # Completed fix reports
│       ├── ALL_ISSUES_FIXED_NOV27.md
│       ├── ALL_ISSUES_FIXED_SUMMARY.md
│       ├── COMPLETE_FIX_VERIFICATION_NOV27.md
│       ├── FINAL_FIX_FREE_SLOTS.md
│       └── SLOT_BOOKING_FIX_COMPLETE.md
│
├── setup/                        # Setup and deployment guides
│   ├── environment-setup.md
│   └── deployment.md
│
├── DEPLOYMENT.md                 # Deployment guide
└── PROJECT_STRUCTURE.md          # This file
```

## Key Features by Module

### Backend Services

- **Meeting Service**: Handles meeting bookings, scheduling, and management
- **Payment Service**: Stripe integration for payments
- **Email Service**: Automated email notifications
- **Teacher Availability Service**: Manages teacher schedules and slot availability
- **Calendar Service**: Google Calendar integration for teachers
- **Box Approval Service**: Admin approval workflow for bookings

### Frontend Pages

- **Landing Page**: Public-facing homepage with sign-in/sign-up
- **Student Dashboard**: View and manage meetings, book new slots
- **Teacher Dashboard**: Manage availability, view bookings, add resources
- **Admin Dashboard**: Approve meetings, manage users, system settings

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase)
- **Payments**: Stripe
- **Authentication**: Clerk (via frontend)
- **Calendar**: Google Calendar API
- **Email**: Nodemailer

### Frontend
- **Framework**: Next.js 14.2.33
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Authentication**: Clerk
- **State Management**: React hooks

### Database
- **Primary DB**: PostgreSQL via Supabase
- **ORM**: Direct Supabase client
- **Migrations**: SQL scripts

## Best Practices

1. **Controllers** handle HTTP requests/responses only
2. **Services** contain all business logic
3. **Routes** define API endpoints and apply middleware
4. **Types** ensure type safety across the application
5. **Middleware** handles cross-cutting concerns (auth, validation, errors)
6. **Utils** provide reusable helper functions

## Development Workflow

1. Backend runs on `localhost:5000`
2. Frontend runs on `localhost:3000` (or `3001`)
3. Database hosted on Supabase
4. Environment variables in `.env` files
5. TypeScript compilation via `tsc` or `ts-node`
6. Hot reload with `nodemon` (backend) and Next.js dev server (frontend)

## Deployment

- **Backend**: Railway or Vercel
- **Frontend**: Vercel
- **Database**: Supabase (production)

## Environment Variables

### Backend (`.env`)
```
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SENDGRID_API_KEY=...
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

---

**Last Updated**: November 30, 2025
