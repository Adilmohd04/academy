# Testing & Verification Checklist

## Phase 1 - Pending Tests

### Access Control Testing
- [ ] Test quiz access without enrollment → Should return 403
- [ ] Test quiz access with valid enrollment → Should work
- [ ] Test assignment submission without enrollment → Should return 403  
- [ ] Test lesson completion with enrollment → Should work
- [ ] Test live session attendance without enrollment → Should return 403
- [ ] Verify teachers can access all content (bypass enrollment)
- [ ] Verify admins can access all content (bypass enrollment)

### Toast Notification Testing
- [ ] Test success toast (create course)
- [ ] Test error toast (invalid form submission)
- [ ] Test warning toast (file size validation)
- [ ] Test info toast (draft saved)
- [ ] Test loading toast (file upload)
- [ ] Test promise toast (API call with loading/success/error)
- [ ] Test custom toast with action button (undo)
- [ ] Verify toast positioning (top-right)
- [ ] Verify toast auto-dismiss timing (4-5 seconds)

### Quiz System Verification
- [ ] MCQ (single choice) - Create, take, auto-grade
- [ ] Multiple Choice (checkboxes) - Create, take, auto-grade
- [ ] True/False - Create, take, auto-grade
- [ ] Short Answer - Create, take, manual grade
- [ ] Essay (rich text) - Create, take, manual grade
- [ ] Verify passing score calculation
- [ ] Verify quiz attempt history
- [ ] Verify quiz retake logic

### Forms to Add Toast Notifications

**Teacher Forms:**
- [ ] Create course form
- [ ] Edit course form
- [ ] Create week form
- [ ] Create lesson form (with video upload)
- [ ] Create quiz form
- [ ] Create assignment form
- [ ] Create announcement form
- [ ] Upload resource form
- [ ] Grade assignment form
- [ ] Grade essay question form

**Student Forms:**
- [ ] Enroll in course button
- [ ] Submit assignment form
- [ ] Submit quiz form
- [ ] Mark lesson complete button
- [ ] Join live session button

**Admin Forms:**
- [ ] Create user form
- [ ] Edit user form
- [ ] Delete user confirmation
- [ ] Bulk operations

---

## Phase 2 - Testing (After Implementation)

### Multi-Language Video System
- [ ] Teacher can add English video
- [ ] Teacher can add Tamil video
- [ ] Teacher can add Arabic video
- [ ] Language availability badges show correctly
- [ ] Student can switch language from dropdown
- [ ] Video player shows only selected language
- [ ] Lessons without selected language are hidden
- [ ] Language preference persists across sessions
- [ ] Default language is English for new users

---

**NOTE:** Run these tests after Phase 2 implementation is complete
