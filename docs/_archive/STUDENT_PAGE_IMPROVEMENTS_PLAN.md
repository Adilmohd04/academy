# Student Course Page - Comprehensive Improvements

## Changes to Make:

### 1. Course Introduction Page - Show All Teacher Data
Replace the "About Course View" section to include:
- Course name and instructor name as header
- Teacher bio and title
- Learning outcomes
- Skills gained
- Syllabus
- Estimated hours
- Course language(s)
- Start date
- Prerequisites

### 2. Grades Section - Show Real Data
- Fetch student grades from backend
- Show total score and percentage
- Show quiz average, assignment average, final exam
- Calculate overall grade based on grading policy
- Show certificate eligibility status
- Warning if below passing threshold

### 3. Schedule Sidebar - Show Weeks/Modules
Instead of just "live classes", show:
- List all weeks/modules
- Each lesson with completion status
- Icons for content type (video, quiz, assignment)
- Checkmarks for completed items
- Click to navigate to lesson

### 4. Language Dropdown for Videos
- Show language selector only if multiple video URLs exist
- Fetch correct video URL based on selected language
- Default to first available language

### 5. Quiz Display Improvements
- Show total marks at top
- Show deadline clearly
- Show each question's marks
- After submission, show correct answers
- Show score breakdown

### 6. Discussion Feature
- Embed discussion forum similar to course builder
- Load discussions for the course
- Allow students to post and reply

Let me implement these changes:
