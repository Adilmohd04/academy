# Announcement UI Overhaul

## Changes Implemented

### 1. New Design System
- Created `components/ui/AnnouncementCard.tsx`: A reusable, Islamic-themed component for displaying announcements.
- **Features**:
  - **Prominent Pinned Banner**: Pinned announcements now have a distinct green banner at the very top with a pin icon, clearly indicating their status.
  - **Important Badge**: "Important" announcements are highlighted with an amber badge.
  - **Islamic Styling**: Uses the project's design system (fonts, colors, shadows) to match the academy's theme.
  - **Responsive Actions**: Edit/Delete buttons for admins appear on hover.

### 2. Admin Portal Updates
- Refactored `app/admin/announcements/page.tsx` to use the new `AnnouncementCard`.
- The list is now cleaner and more visually appealing.

### 3. Teacher Portal Updates
- **New Page**: Created `app/teacher/announcements/page.tsx` so teachers can view announcements (previously missing).
- **Sidebar Navigation**: Added an "Announcements" link to the Teacher Dashboard sidebar.
- **Read-Only View**: Teachers see the same beautiful cards but without edit/delete controls.

## Verification
1. **Admin Portal**: Go to `/admin/announcements`. Pin an announcement. You should see a "Pinned Announcement" banner at the top of the card.
2. **Teacher Portal**: Go to `/teacher/announcements` (link in sidebar). You should see the announcements listed with the same design.
