# Assignment Submission Enhancement

## Overview
Enhanced the assignment submission system to support multiple file types, drive links, and better week mapping.

## Changes Made

### 1. Database Migration (`migrations/enhance-assignment-submissions.sql`)

Added new columns to `assignment_submissions` table:

- **file_type** (VARCHAR(50)): Type of submission
  - `pdf` - PDF documents
  - `doc` / `docx` - Word documents  
  - `video` - Video files (mp4, avi, etc.)
  - `audio` - Audio files (mp3, wav, etc.)
  - `image` - Image files (jpg, png, etc.)
  - `drive_link` - Google Drive/OneDrive links
  - `text` - Text-only submissions
  - `file` - Other file types

- **drive_link** (VARCHAR(500)): Direct link to Google Drive, OneDrive, or other cloud storage
- **week_id** (UUID): Direct reference to course_weeks table
- **mime_type** (VARCHAR(100)): MIME type of uploaded file (e.g., application/pdf, video/mp4)
- **file_size** (BIGINT): File size in bytes

### 2. Backend Service Updates (`backend/src/modules/student/services/assignmentService.ts`)

Updated `submitAssignment()` function:
- Added parameters: `driveLink`, `weekId`
- Auto-detects file type based on MIME type
- Supports drive link submissions
- Tracks file metadata (size, mime type)

Updated `getSubmissionsByAssignment()` function:
- Returns new fields in query results

### 3. Migration Script (`run-assignment-enhancement-migration.mjs`)

Run this to apply changes to database:
```bash
cd backend
node run-assignment-enhancement-migration.mjs
```

## How It Works

### For Students:
1. Submit assignments via:
   - File upload (PDF, DOC, Video, Audio, Image)
   - Google Drive link
   - OneDrive link
   - Text submission

2. System automatically:
   - Detects file type
   - Stores file metadata
   - Maps submission to week

### For Teachers:
1. View all submissions by week
2. See file type icons
3. Download files or access drive links
4. Grade submissions with score and feedback
5. Track student progress per week

## Next Steps

To enable this feature:

1. **Run Migration:**
   ```bash
   cd backend
   node run-assignment-enhancement-migration.mjs
   ```

2. **Update Frontend:**
   - Add drive link input field
   - Add file type icons
   - Show file previews based on type
   - Add week selector when creating assignments

3. **Update Assignment Controller:**
   - Accept `driveLink` parameter
   - Accept `weekId` parameter
   - Pass to service layer

## API Changes

### Submit Assignment Endpoint
**Before:**
```javascript
POST /api/assignments/:lessonId/submit
{
  file: <multipart>,
  textSubmission: "string"
}
```

**After:**
```javascript
POST /api/assignments/:lessonId/submit
{
  file: <multipart>,           // Optional
  textSubmission: "string",    // Optional
  driveLink: "https://...",    // Optional
  weekId: "uuid"               // Optional
}
```

### Get Submissions Response
**New fields added:**
```json
{
  "id": "uuid",
  "file_type": "pdf",
  "drive_link": "https://drive.google.com/...",
  "week_id": "uuid",
  "mime_type": "application/pdf",
  "file_size": 1024000
}
```

## Benefits

1. **Flexibility**: Students can submit via multiple methods
2. **Better Organization**: Direct week mapping
3. **File Management**: Track file types and sizes
4. **Drive Integration**: Support for cloud storage links
5. **Performance**: Indexed queries for faster loading
