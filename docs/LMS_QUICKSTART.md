# LMS Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### 1. Files Created

All necessary files have been created in your workspace:

```
✅ frontend/types/lms.ts                      (Type definitions)
✅ frontend/components/student/CourseDetailPage.tsx
✅ frontend/components/student/CourseSchedule.tsx
✅ frontend/components/student/CourseGrading.tsx
✅ frontend/components/student/CourseActivities.tsx
✅ frontend/components/student/QuizTaker.tsx
✅ frontend/components/student/LMS_EXAMPLES.tsx
✅ docs/LMS_SYSTEM.md                         (Documentation)
```

### 2. Import the Types

In your files, import the LMS types:

```typescript
import {
  CourseDetail,
  StudentCourseProgress,
  CourseWeek,
  WeekQuiz,
  WeekActivity,
  // ... other types
} from '@/types/lms';
```

### 3. Create a Course Page

```typescript
// app/student/courses/[id]/page.tsx
'use client';

import CourseDetailPage from '@/components/student/CourseDetailPage';
import { CourseDetail, StudentCourseProgress } from '@/types/lms';

export default function CoursePage({ params }: { params: { id: string } }) {
  // TODO: Fetch from your API
  const course: CourseDetail = {
    // ... your course data
  };

  const progress: StudentCourseProgress = {
    // ... student progress data
  };

  return (
    <CourseDetailPage 
      course={course}
      progress={progress}
      isEnrolled={true}
    />
  );
}
```

### 4. Test with Mock Data

Use the examples file for testing:

```typescript
import { ExampleCoursePage } from '@/components/student/LMS_EXAMPLES';

// In your test page:
export default function TestPage() {
  return <ExampleCoursePage />;
}
```

## 📋 Features Checklist

### Core Course Features
- ✅ Course detail page with Islamic theme
- ✅ Tabbed navigation (About, Schedule, Grading, Activities)
- ✅ Teacher information display
- ✅ Course metadata (duration, students, level)
- ✅ Grading policy breakdown

### Schedule & Content
- ✅ Week-based organization
- ✅ Expandable week cards
- ✅ Topic sections
- ✅ Live class scheduling
- ✅ Video library with progress tracking
- ✅ Resource management (PDFs, docs, links)
- ✅ Week status (completed/current/upcoming)
- ✅ Lock/unlock mechanism

### Assessments
- ✅ Quiz system with timer
- ✅ Multiple question types:
  - Multiple choice
  - True/False
  - Short answer
  - Essay
  - Audio upload
  - Video upload
- ✅ Scheduled release/expiry
- ✅ Multiple attempts
- ✅ Results and feedback display

### Activities & Assignments
- ✅ Assignment submission (text/file/link)
- ✅ Due date tracking
- ✅ Late submission handling
- ✅ Teacher feedback display
- ✅ Grading rubric support
- ✅ File upload with restrictions

### Grading System
- ✅ Overall grade calculation
- ✅ Category breakdown
- ✅ Visual progress bars
- ✅ Letter grade assignment
- ✅ Pass/Fail status
- ✅ Weekly performance tracking

## 🎨 UI Customization

### Change Primary Colors

Find and replace these Tailwind classes:
```typescript
// Emerald → Your color
'emerald-600' → 'your-color-600'
'emerald-700' → 'your-color-700'

// Teal → Your secondary
'teal-600' → 'your-secondary-600'
```

### Modify Islamic Patterns

In the header decorative section:
```typescript
<div className="absolute inset-0 opacity-10">
  <div className="absolute inset-0" style={{
    backgroundImage: `url("your-pattern.svg")`,
    backgroundSize: '60px 60px'
  }} />
</div>
```

## 🔌 Backend Integration

### Required API Endpoints

```typescript
// Courses
GET    /api/courses/:id
GET    /api/courses/:id/weeks
GET    /api/courses/:id/progress

// Quizzes
POST   /api/quizzes/:id/attempts
POST   /api/quizzes/:id/submit
GET    /api/quizzes/:id/results

// Activities
GET    /api/activities
POST   /api/activities/:id/submit

// Grading
GET    /api/courses/:id/grades
```

### Use the API Service

```typescript
import { LMSApiService } from '@/components/student/LMS_EXAMPLES';

const api = new LMSApiService();

// Fetch course
const course = await api.getCourse('course-1');

// Submit quiz
await api.submitQuiz('quiz-1', 'attempt-1', answers);

// Submit activity
const formData = new FormData();
formData.append('file', file);
await api.submitActivity('activity-1', formData);
```

## 🧪 Testing Flow

### 1. Test Course Page
- Navigate to course detail page
- Verify tabs switch correctly
- Check Islamic theme styling

### 2. Test Schedule
- Expand/collapse weeks
- View topics and classes
- Check video cards
- Test resource downloads

### 3. Test Quiz
- Start a quiz
- Answer questions
- Submit and view results
- Check timer functionality

### 4. Test Activities
- View activity details
- Submit assignment
- Check file upload
- Verify due date display

### 5. Test Grading
- View overall grade
- Check category breakdown
- Verify calculations
- Test progress bars

## 📱 Responsive Testing

Test on:
- ✅ Mobile (320px - 640px)
- ✅ Tablet (641px - 1024px)
- ✅ Desktop (1025px+)

## 🐛 Common Issues

### Issue: Types not found
**Solution**: Ensure `@/types/lms` path is correct in tsconfig.json

### Issue: Components not rendering
**Solution**: Check that all dependencies are imported

### Issue: Styling not applied
**Solution**: Verify Tailwind CSS is properly configured

### Issue: Date formatting errors
**Solution**: Install date-fns: `npm install date-fns`

## 📚 Resources

- **Documentation**: `docs/LMS_SYSTEM.md`
- **Examples**: `frontend/components/student/LMS_EXAMPLES.tsx`
- **Types**: `frontend/types/lms.ts`

## 🎯 Next Steps

1. ✅ **Review all components** - Check each file
2. 🔄 **Integrate with backend** - Connect to your API
3. 🧪 **Test thoroughly** - Test all features
4. 🎨 **Customize design** - Match your branding
5. 📱 **Test responsiveness** - All screen sizes
6. 🚀 **Deploy** - Go live!

## 💡 Pro Tips

1. **Start Simple**: Test with mock data first
2. **One Feature at a Time**: Don't try to do everything at once
3. **Use TypeScript**: The types will guide you
4. **Check Examples**: Refer to LMS_EXAMPLES.tsx for patterns
5. **Islamic Theme**: Maintain consistency with existing design

## 🤝 Support

Need help? Check:
1. Type definitions in `lms.ts`
2. Example usage in `LMS_EXAMPLES.tsx`
3. Full documentation in `LMS_SYSTEM.md`

---

**Ready to Launch!** 🚀

All components are production-ready with:
- ✅ TypeScript type safety
- ✅ Islamic-themed UI
- ✅ Responsive design
- ✅ Comprehensive features
- ✅ Clean, maintainable code

Start by creating a test page with mock data, then gradually integrate with your backend!
