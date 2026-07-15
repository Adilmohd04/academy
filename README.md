# Academy Platform - Course Visibility Fix & Certificate Designer

A full-stack Islamic education platform built with Next.js and Express/Supabase. This project demonstrates using Kiro to investigate and fix a critical course visibility bug where approved courses were invisible to students, and to design a Certificate Designer Studio feature.

## What Was Built

- **Course Visibility Bug Fix**: Identified and resolved a dual-status system inconsistency where admin-approved courses weren't appearing in the student browse page due to misaligned `status` and `approval_status` fields.
- **Certificate Designer Studio**: Spec-driven feature for designing and issuing course completion certificates.
- **Consistent Status Display**: Unified status rendering across Admin, Teacher, and Student dashboards.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Clerk Auth
- **Backend**: Express.js, TypeScript, Supabase (PostgreSQL)
- **Auth**: Clerk
- **Built with**: [Kiro](https://kiro.dev)

## Project Structure

```
├── .kiro/              # Kiro specs and settings
│   └── specs/          # Feature specifications
├── frontend/           # Next.js frontend
├── backend/            # Express.js API server
│   ├── src/
│   │   ├── modules/    # Domain modules (admin, teacher, student)
│   │   ├── middleware/ # Auth middleware
│   │   └── routes/     # API routes
│   └── database/
│       └── migrations/ # SQL migrations
└── README.md
```

## #BuildWithKiro #TeamKiro
