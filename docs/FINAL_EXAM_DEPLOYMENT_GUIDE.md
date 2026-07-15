# Final Exam Module - Deployment & Testing Guide

## Pre-Deployment Checklist

### Code Files Created ✅
- [x] Database migration: `backend/database/migrations/final_exams.sql`
- [x] Teacher service: `backend/src/modules/teacher/services/examManagementService.ts`
- [x] Student service: `backend/src/modules/student/services/studentExamService.ts`
- [x] Teacher UI: `frontend/app/teacher/courses/[courseId]/exams/page.tsx`
- [x] Student UI: `frontend/app/student/courses/[courseId]/exams/[examId]/page.tsx`
- [x] API Routes: 7 endpoints created

### API Routes Created ✅
- [x] `POST /api/teacher/exams` - Create exam
- [x] `GET /api/teacher/exams/[courseId]` - Fetch exam
- [x] `PUT /api/teacher/exams/publish` - Toggle publish
- [x] `GET /api/student/exams` - Available exams
- [x] `GET /api/student/exams/[examId]` - Exam details
- [x] `POST /api/student/exams/start` - Start exam
- [x] `POST /api/student/exams/save-answer` - Save answer
- [x] `POST /api/student/exams/submit` - Submit exam

---

## Step 1: Database Migration

### Option A: Using Supabase Web Console
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy the entire contents of `backend/database/migrations/final_exams.sql`
6. Paste into SQL Editor
7. Click **Run** (Ctrl+Enter)
8. Check for completion message (no errors)

### Option B: Using psql Command Line
```bash
cd backend/database/migrations
psql -U your_postgres_user -d your_database_name -f final_exams.sql
```

### Option C: Using Supabase CLI
```bash
supabase migration up
```

### Verification
After migration, verify tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' AND table_name LIKE 'final_exam%';
```

Expected output:
```
table_name
─────────────────────────
final_exams
final_exam_questions
final_exam_options
final_exam_submissions
final_exam_answers
```

---

## Step 2: Backend Server Setup

### 1. Update Environment Variables

In `backend/.env`:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0
DATABASE_URL=postgresql://user:password@host:port/db
CLERK_SECRET_KEY=your_clerk_key
PORT=5000
```

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Start Backend Server
```bash
npm run dev
```

Expected output:
```
[nodemon] starting `ts-node src/server.ts`
Server running on port 5000
Database connected to Supabase
```

### 4. Verify Backend Health
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{ "status": "ok" }
```

---

## Step 3: Frontend Server Setup

### 1. Update Environment Variables

In `frontend/.env.local`:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_key
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Start Frontend Server
```bash
npm run dev
```

Expected output:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled successfully
- wait compiling...
```

### 4. Open in Browser
```
http://localhost:3000
```

---

## Step 4: Create Test Data

### Test as Teacher

1. **Login as teacher**
   - Navigate to `http://localhost:3000/teacher/dashboard`
   - Select a course from your courses

2. **Create Exam**
   - Navigate to **Exams** tab
   - Click **"+ Create New Exam"**
   - Fill form:
     - Title: "Test Final Exam"
     - Total Marks: 50
     - Passing Marks: 30
     - Time Limit: 30 minutes
     - Mode: timer
     - Instructions: "This is a test exam"
   - Click **Save**

3. **Add Questions**

   **Question 1:**
   - Question: "What is 2+2?"
   - Type: Multiple Choice
   - Marks: 5
   - Options:
     - "3" (wrong)
     - "4" (CORRECT)
     - "5" (wrong)
   - Click **Add Option** then **Save**

   **Question 2:**
   - Question: "Is the earth round?"
   - Type: True/False
   - Marks: 5
   - Options:
     - "True" (CORRECT)
     - "False" (wrong)
   - Click **Save**

   **Question 3:**
   - Question: "Explain photosynthesis (100-200 words)"
   - Type: Text Response
   - Marks: 10
   - Click **Save**

4. **Publish Exam**
   - Click **Publish** button
   - Status should change to green "Published"

### Test as Student

1. **Login as different user (student)**
   - Sign out and create new account OR switch user in Clerk dashboard

2. **Enroll in Course**
   - If not already enrolled, go to course browse
   - Click "Enroll"

3. **Navigate to Exam**
   - Go to **My Courses**
   - Select course you just created exam in
   - Look for **Final Exam** section
   - Click **Start Exam**

4. **Take Exam**
   - Review instructions
   - Click **Start Exam** button
   - Answer all questions:
     - Q1: Select "4"
     - Q2: Select "True"
     - Q3: Type response about photosynthesis
   - Monitor timer (should count down)
   - Click **Submit Exam**

5. **Verify Results**
   - Should see results screen
   - Score: 10/20 (for the two MCQ answered correctly, Q3 pending teacher review)
   - Status: Depends on passing marks (30 required, so NOT PASSED)

---

## Step 5: Testing Checklist

### Backend API Testing

```bash
# Test available exams endpoint
curl -H "x-clerk-user-id: test-student-id" \
  http://localhost:5000/api/student/exams

# Test start exam
curl -X POST -H "x-clerk-user-id: test-student-id" \
  -H "Content-Type: application/json" \
  -d '{"exam_id":"exam-uuid"}' \
  http://localhost:5000/api/student/exams/start

# Test save answer
curl -X POST -H "x-clerk-user-id: test-student-id" \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id":"submission-uuid",
    "question_id":"question-uuid",
    "selected_option_id":"option-uuid"
  }' \
  http://localhost:5000/api/student/exams/save-answer

# Test submit exam
curl -X POST -H "x-clerk-user-id: test-student-id" \
  -H "Content-Type: application/json" \
  -d '{"submission_id":"submission-uuid"}' \
  http://localhost:5000/api/student/exams/submit
```

### Frontend UI Testing

#### Teacher Exam Builder
- [ ] Create new exam with all settings
- [ ] Add question with multiple options
- [ ] Mark correct answer
- [ ] Use quick import feature
- [ ] Delete question
- [ ] Save exam
- [ ] Publish/unpublish toggle
- [ ] View published status indicator

#### Student Exam Interface
- [ ] See exam in available list
- [ ] Click "Start Exam"
- [ ] View timer counting down
- [ ] Select MCQ options
- [ ] Type text responses
- [ ] See auto-save indicator every 30 seconds
- [ ] Submit exam
- [ ] View results with score
- [ ] Check pass/fail status

#### Cross-Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Safari (iOS)
- [ ] Chrome (Android)

---

## Step 6: Troubleshooting

### Issue: "Unauthorized" Error on API Calls

**Problem**: x-clerk-user-id header not being sent

**Solution**:
1. Verify user is logged in
2. Check Network tab in browser DevTools
3. Verify header is present:
   ```javascript
   // Frontend should add header automatically via Clerk
   const response = await fetch('/api/student/exams', {
     headers: {
       'x-clerk-user-id': userId
     }
   });
   ```
4. Restart frontend server

### Issue: Database Connection Error

**Problem**: Cannot connect to Supabase

**Solution**:
1. Check `DATABASE_URL` in `.env`
2. Verify Supabase project is active
3. Check IP whitelist in Supabase settings
4. Test connection: `psql $DATABASE_URL -c "SELECT 1"`

### Issue: Timer Not Displaying

**Problem**: Timer shows "undefined" or doesn't count down

**Solution**:
1. Clear browser cache (Cmd+Shift+Delete)
2. Restart frontend server
3. Check JavaScript console for errors
4. Verify system time is correct on computer

### Issue: Auto-Save Not Working

**Problem**: "Saving..." indicator appears but doesn't disappear

**Solution**:
1. Check Network tab - verify API call succeeds
2. Verify backend server is running
3. Check error response from `/api/student/exams/save-answer`
4. Verify submission_id is valid

### Issue: Submit Returns 500 Error

**Problem**: Exam submission fails with server error

**Solution**:
1. Check backend logs for error stack trace
2. Verify submission_id exists in database
3. Verify all questions have answers
4. Check if submission_status is "in_progress"
5. Restart backend server

### Issue: Questions Not Saving from Quick Import

**Problem**: Click Import but nothing happens

**Solution**:
1. Verify format: "Question?\nA) Option1\nB) Option2 (correct)"
2. Check browser console for JavaScript errors
3. Verify exam_id is set
4. Try manual add instead
5. Check database connection

---

## Step 7: Performance Optimization

### Backend Optimization
```typescript
// Add database indexes (already included in migration)
CREATE INDEX idx_final_exam_submissions_exam_student 
  ON final_exam_submissions(exam_id, student_id);
```

### Frontend Optimization
- Auto-save debounce: 30 seconds (prevents excessive API calls)
- Question rendering: Only current question rendered
- Timer update: Every 1 second (not 100ms)

### Database Optimization
- Pre-select questions with options using Supabase nested select
- Use connection pooling for backend
- Index frequently queried fields

---

## Step 8: Deployment to Production

### Backend Deployment (Railway/Vercel)

1. **Set Environment Variables**:
   ```
   DATABASE_URL=postgresql://...
   CLERK_SECRET_KEY=sk_live_...
   NODE_ENV=production
   ```

2. **Build for Production**:
   ```bash
   npm run build
   ```

3. **Start Production Server**:
   ```bash
   npm run start
   ```

### Frontend Deployment (Vercel)

1. **Connect GitHub repo to Vercel**

2. **Set Environment Variables**:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

---

## Step 9: Monitoring

### Logs to Monitor

**Backend**:
```bash
# Check for errors
tail -f backend/logs/error.log

# Monitor auto-grading
grep "Auto-grading" backend/logs/application.log
```

**Frontend**:
```bash
# Browser console errors
Open DevTools → Console → Filter for errors

# Network errors
Open DevTools → Network → Filter by 4xx, 5xx
```

### Metrics to Track

- [ ] Average exam completion time
- [ ] Pass/fail ratio per exam
- [ ] Question difficulty (% correct)
- [ ] API response time (target: < 500ms)
- [ ] Database query time (target: < 100ms)
- [ ] Student dropout rate during exam

---

## Step 10: Security Review

- [ ] SQL injection prevention (using Supabase)
- [ ] CSRF protection (enabled by default)
- [ ] Rate limiting on API endpoints
- [ ] User authentication verified on each endpoint
- [ ] Questions/answers not accessible to unprivileged users
- [ ] Submission ownership verified
- [ ] Timer validation on server side
- [ ] Max attempts enforced server-side

---

## Support & Escalation

### Common Issues Matrix

| Issue | Cause | Solution |
|-------|-------|----------|
| "No exams found" | Student not enrolled | Enroll student in course |
| Timer shows 0:00 | Time expired | Auto-submit should trigger |
| Results not showing | Submission not found | Verify submission_id |
| Save fails with 404 | Invalid endpoint | Check route file exists |
| Database error | Connection lost | Restart backend server |

### Contact Points

- **Database Issues**: Supabase support
- **API Issues**: Check backend logs
- **Frontend Issues**: Check browser console
- **Auth Issues**: Check Clerk dashboard

