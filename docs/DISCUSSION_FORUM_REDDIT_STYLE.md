# Discussion Forum Reddit-Style Implementation

## Summary
Implemented a comprehensive Reddit-style discussion forum with upvote/downvote functionality, teacher role highlighting, time-based edit/delete restrictions, and improved UI/UX.

## Features Implemented

### 1. **Upvote/Downvote System**
- ✅ Users can now upvote AND downvote posts and replies
- ✅ Vote counts show net score (upvotes - downvotes)
- ✅ Visual feedback for vote status (orange for upvote, blue for downvote)
- ✅ Click again to toggle vote off
- ✅ Backend API endpoint: `POST /api/discussions/:discussionId/vote` with `{ type: 'up' | 'down' }`

### 2. **Teacher Role Highlighting**
- ✅ Teacher posts display a blue "TEACHER" badge
- ✅ Admin posts display a red "ADMIN" badge
- ✅ Student posts have no badge
- ✅ Role is fetched from user profile and displayed next to username

### 3. **Edit Functionality**
- ✅ Users can edit their own posts and replies
- ✅ **Students:** Can only edit within 2 hours of posting
- ✅ **Teachers/Admins:** Can edit anytime
- ✅ Click "Edit" button to open inline editor
- ✅ Backend validates time restrictions and ownership

### 4. **Delete Functionality with Time Restrictions**
- ✅ Users can delete their own posts and replies
- ✅ **Students:** Can only delete within 2 hours of posting
- ✅ **Teachers/Admins:** Can delete anytime
- ✅ Confirmation dialog before deletion
- ✅ Backend enforces 2-hour time limit for students

### 5. **UI/UX Improvements**
- ✅ Modern Reddit-style card layout
- ✅ Pinned posts highlighted with green badge
- ✅ Vote buttons with visual feedback
- ✅ Nested replies with proper indentation
- ✅ User avatars and role badges
- ✅ Timestamps and edit indicators
- ✅ Responsive design with hover states

## Technical Implementation

### Frontend Changes
**File:** `frontend/app/teacher/courses/[courseId]/builder/page.tsx`

1. **DiscussionTab Component** (Lines 1979-2250)
   - Added `userRole` state to track current user's role
   - Replaced `upvoteDiscussion()` with unified `vote()` function
   - Added `editPost()` function for editing discussions/replies
   - Added `deletePost()` with time-based validation
   - Added `canEditDelete()` helper to check permissions
   - Updated UI with:
     - Upvote/downvote buttons with ThumbsUp/ThumbsDown icons
     - Teacher/Admin role badges
     - Edit/Delete buttons (conditionally shown)
     - Inline editor for editing posts

2. **Icon Imports**
   - Added `ThumbsDown` icon from lucide-react

### Backend Changes

#### Controllers
**File:** `backend/src/modules/shared/controllers/discussionController.ts`

- Added `voteDiscussion()` controller for upvote/downvote
- Added `editDiscussion()` controller for editing posts
- Updated `getCourseDiscussions()` to pass userId for vote tracking
- Kept legacy `upvoteDiscussion()` for backwards compatibility

#### Services
**File:** `backend/src/modules/shared/services/discussionService.ts`

1. **Updated getCourseDiscussions()**
   - Now accepts optional `userId` parameter
   - Returns user's vote status (`user_vote: 'up' | 'down' | null`)
   - Includes upvote/downvote counts for posts and replies
   - Returns author role and Clerk ID
   - Fetches and formats nested replies with vote data

2. **Added voteDiscussion()**
   - Handles both upvote and downvote
   - Toggle vote off if clicking same vote type
   - Change vote type if clicking opposite
   - Stores votes in `discussion_votes` table

3. **Added editDiscussion()**
   - Works for both main posts and replies
   - Validates ownership (user must be author)
   - Enforces 2-hour time limit for students
   - Teachers/admins can edit anytime
   - Updates `updated_at` timestamp

#### Routes
**File:** `backend/src/routes/discussions.ts`

- Added `POST /api/discussions/:discussionId/vote` (new unified endpoint)
- Added `PUT /api/discussions/:discussionId` (edit endpoint)
- Kept `POST /api/discussions/:discussionId/upvote` for backwards compatibility

### Database Changes

**Migration:** `backend/database/migrations/20241227_discussion_votes.sql`

1. **Created `discussion_votes` table:**
```sql
CREATE TABLE discussion_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(discussion_id, user_id)
);
```

2. **Features:**
   - Unique constraint ensures one vote per user per post
   - `vote_type` can be 'up' or 'down'
   - Migrated existing upvotes from old `discussion_upvotes` table
   - Added RLS policies for security
   - Added indexes for performance

## Additional Clarifications

### Publish to Students Button
- **Changed button text from** "Publish Changes" **to** "Publish to Students"
- **Added tooltip:** "Makes unpublished content visible to enrolled students. Changes are auto-saved when you edit."
- **Behavior:** Publishes all unpublished weeks (without release dates) to students
- **Note:** All edits are auto-saved. This button only controls visibility to students.

### Assignment View Page
The link at line 1036 (`/teacher/courses/${courseId}/assignments/${lesson.id}`) is the correct way to view assignment submissions. The "/hi" route mentioned doesn't exist in the codebase.

## Permission Matrix

| Action | Students (< 2hrs) | Students (> 2hrs) | Teachers | Admins |
|--------|-------------------|-------------------|----------|--------|
| Post Discussion | ✅ | ✅ | ✅ | ✅ |
| Reply to Discussion | ✅ | ✅ | ✅ | ✅ |
| Upvote/Downvote | ✅ | ✅ | ✅ | ✅ |
| Edit Own Post | ✅ | ❌ | ✅ | ✅ |
| Delete Own Post | ✅ | ❌ | ✅ | ✅ |
| Pin Discussion | ❌ | ❌ | ✅ | ✅ |
| Delete Others' Posts | ❌ | ❌ | ✅ | ✅ |

## Testing Checklist

- [ ] Teachers can post discussions with "TEACHER" badge
- [ ] Students can post discussions without badge
- [ ] Upvote button toggles vote and updates count
- [ ] Downvote button toggles vote and updates count
- [ ] Students can edit their posts within 2 hours
- [ ] Students CANNOT edit posts older than 2 hours
- [ ] Teachers can edit any post anytime
- [ ] Students can delete their posts within 2 hours
- [ ] Students CANNOT delete posts older than 2 hours
- [ ] Teachers can delete any post anytime
- [ ] Reply upvote/downvote works correctly
- [ ] Nested replies display with proper formatting
- [ ] "Publish to Students" button shows tooltip on hover
- [ ] Auto-save functionality still works for all edits

## Files Modified

1. `frontend/app/teacher/courses/[courseId]/builder/page.tsx`
2. `backend/src/modules/shared/controllers/discussionController.ts`
3. `backend/src/modules/shared/services/discussionService.ts`
4. `backend/src/routes/discussions.ts`
5. `backend/database/migrations/20241227_discussion_votes.sql`

## Files Created

1. `backend/run-custom-migration.mjs` (generic migration runner)

## Next Steps

1. **Test the discussion forum:**
   - Log in as different users (teacher, student, admin)
   - Create posts and replies
   - Test upvote/downvote functionality
   - Test edit functionality within and after 2-hour window
   - Test delete functionality with time restrictions

2. **Backend server:** May need restart to load new routes and controllers
   ```powershell
   cd backend
   npm run dev
   ```

3. **Frontend refresh:** Reload the course builder page to see new UI

4. **Database verification:** Ensure `discussion_votes` table exists in Supabase

## Notes

- The 2-hour time restriction is calculated from the `created_at` timestamp
- All changes are backward compatible (old upvote endpoint still works)
- Role information is fetched from user's Clerk profile
- The discussion system works for all course types (teacher, student, admin views)
