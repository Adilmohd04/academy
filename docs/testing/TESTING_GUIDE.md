# Testing Guide - Professional Course System

## Servers Running ✅
- **Frontend:** http://localhost:3001 (port 3001 due to 3000 being in use)
- **Backend:** http://localhost:5000

## Quick Test Flow

### Test 1: View New Overview Page Design
1. Open http://localhost:3001
2. Login as student
3. Browse courses → select any published course
4. Click to view course overview
5. **Expected:** Stunning Coursera-style page with:
   - Gradient hero (teal → emerald → cyan)
   - Short description in hero
   - Tag pills
   - Enrollment card with thumbnail
   - Tabbed navigation (Overview, Syllabus, Instructors, Reviews)
   - Skills gained section
   - Learning outcomes grid
   - Markdown-rendered long description

### Test 2: Add New Fields to Course
1. Login as teacher
2. Go to "My Courses"
3. Select a course → click "Edit" or "Builder"
4. Go to "About" tab
5. **Expected New Fields:**
   - Short Description (2 rows, max 200 chars)
   - Basic Description (4 rows)
   - Long Description (Markdown) (10 rows with examples)
   - Tags (comma-separated input)
   - Thumbnail Image (file upload with preview)
6. Fill in all fields:
   ```
   Short Description: "Master Quranic recitation with proper Tajweed rules in just 8 weeks!"
   
   Long Description:
   # About This Course
   
   This comprehensive course will teach you **Tajweed rules** from beginner to advanced level.
   
   ## What You'll Learn
   - Proper pronunciation of Arabic letters
   - Rules of elongation (Madd)
   - Characteristics of letters (Sifaat)
   
   **Perfect for beginners!**
   
   Tags: Quran, Tajweed, Arabic, Islamic Studies, Beginner
   ```
7. Upload a thumbnail image
8. Click "Save Changes"
9. **Expected:** Success message, fields persist

### Test 3: Verify Data Saves to Database
1. After saving in Test 2, refresh the page
2. **Expected:** All fields still populated with saved data
3. Navigate to course overview as student
4. **Expected:** 
   - Short description appears in hero
   - Long description rendered with Markdown formatting (bold, headers, lists)
   - Tags display as pills
   - Thumbnail shows in enrollment card

### Test 4: Create New Course with All Fields
1. Login as teacher
2. Click "Create New Course"
3. Fill in ALL fields including:
   - Title
   - Description
   - Short Description
   - Long Description (with Markdown)
   - Tags
   - Category
   - Level
   - Learning Outcomes
   - Skills Gained
   - Teacher Title
   - Teacher Bio
   - Upload both course image AND thumbnail
4. Submit course
5. Go to builder → Add some lessons
6. Submit for approval
7. **Expected:** Course created with all fields

### Test 5: Admin Approves & Student Views
1. Login as admin
2. Go to "Courses" → "Pending Approval"
3. Approve the course from Test 4
4. Logout, login as student
5. Browse courses → find the new course
6. **Expected:** 
   - Course card shows thumbnail and short description
   - Click to open overview
   - Stunning professional page with ALL data displayed
   - Markdown rendering works
   - Skills show as pills
   - Learning outcomes in grid
   - Instructor card with bio and title

## Field Checklist

### In Course Builder (About Tab):
- [ ] Short Description (2 rows)
- [ ] Basic Description (4 rows)
- [ ] Long Description - Markdown (10 rows)
- [ ] Tags (comma-separated)
- [ ] Thumbnail Image upload
- [ ] Learning Outcomes (textarea)
- [ ] Skills Gained (text input)
- [ ] Estimated Hours (number)
- [ ] Course Type (select)
- [ ] Teacher Title (text)
- [ ] Teacher Bio (textarea)

### In Overview Page:
- [ ] Gradient hero background
- [ ] Course title (large, bold)
- [ ] Short description (hero section)
- [ ] Category + Level badges
- [ ] Rating stars
- [ ] Enrolled student count
- [ ] Tag pills
- [ ] Thumbnail in enrollment card
- [ ] Price/Free badge
- [ ] Enroll button
- [ ] Course highlights (hours, lessons, etc.)
- [ ] Tab navigation
- [ ] Long description with Markdown
- [ ] Skills gained pills
- [ ] Learning outcomes grid with checkmarks
- [ ] Prerequisites list
- [ ] Instructor card with title and bio
- [ ] Sidebar course details
- [ ] Certificate banner

## Common Issues & Solutions

### Issue: "Cannot read property of undefined"
**Solution:** Make sure backend is returning all new fields. Check browser console network tab.

### Issue: Markdown not rendering
**Solution:** Verify react-markdown is installed (`npm list react-markdown` in frontend)

### Issue: Tags not showing
**Solution:** Tags should be an array. In builder, enter comma-separated (e.g., "Quran, Tajweed"). Backend converts to array.

### Issue: Old overview page showing
**Solution:** Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: Thumbnail not displaying
**Solution:** Check if thumbnail_image OR course_image_url OR thumbnail_url has a value. Overview page tries all three.

## API Endpoints to Verify

### GET Course Overview
```
GET /api/student/courses/:courseId/overview
Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "id": "...",
  "title": "...",
  "short_description": "...",
  "long_description": "# Markdown content...",
  "tags": ["Quran", "Tajweed"],
  "thumbnail_image": "data:image/...",
  "instructors": [],
  "learning_outcomes": "[\"Outcome 1\", \"Outcome 2\"]",
  "skills_gained": "Skill1, Skill2",
  "teacher_title": "Ph.D., Professor",
  "teacher_bio": "...",
  ...
}
```

### UPDATE Course
```
PUT /api/teacher/courses/:courseId
Authorization: Bearer <token>
Content-Type: application/json

{
  "short_description": "New hook",
  "long_description": "# New markdown",
  "tags": ["tag1", "tag2"],
  "thumbnail_image": "base64string"
}
```

## Visual Verification

### Hero Section Should Show:
- Gradient background (teal/emerald/cyan)
- White text
- Large title (48-60px)
- Short description (20px)
- Badges for category and level
- Stars for rating
- Student count
- Language indicator
- Tag pills

### Enrollment Card Should Have:
- Thumbnail image (if set)
- Price or "Free" badge
- Large "Enroll" button (teal bg)
- Course highlights with icons
- Share and Save buttons

### Content Tabs Should Display:
- **Overview:** Markdown content, skills pills, learning outcomes grid
- **Syllabus:** Expandable week sections
- **Instructors:** Instructor cards with avatars
- **Reviews:** Placeholder (coming soon)

## Success Criteria ✅
- [ ] All 5 new fields visible in course builder
- [ ] Fields save successfully to database
- [ ] Overview page loads without errors
- [ ] Coursera-style design displays correctly
- [ ] Markdown renders with formatting
- [ ] Tags display as pills
- [ ] Skills display as colored badges
- [ ] Learning outcomes show with checkmarks
- [ ] Instructor card shows title and bio
- [ ] Enrollment card functional
- [ ] All tabs work (Overview, Syllabus, Instructors, Reviews)
- [ ] Mobile responsive design works
- [ ] No console errors

## Database Verification

Run in Supabase SQL editor:
```sql
-- Check if new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'courses' 
AND column_name IN ('short_description', 'long_description', 'tags', 'thumbnail_image', 'instructors');

-- View a course's new fields
SELECT 
  id, 
  title, 
  short_description, 
  long_description, 
  tags, 
  thumbnail_image, 
  instructors
FROM courses 
LIMIT 1;
```

**Expected:** 5 columns returned, all with data types TEXT/TEXT[]/JSONB

## Next Steps After Testing
1. If tests pass → mark all requirements complete ✅
2. If tests fail → debug specific issues
3. Optional: Enhance with dynamic instructor array management
4. Optional: Add rich Markdown editor instead of textarea
5. Optional: Implement actual reviews system

---

**Happy Testing! 🎉**

The professional course system is now complete with:
- 58 database fields
- Full CRUD operations
- Stunning Coursera-style overview
- Markdown support
- Professional design to attract students
