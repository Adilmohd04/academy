# Production Debugging Checklist

## Step 1: Verify Clerk Domain Fixed ✓
After adding domain to Clerk Dashboard:

1. **Open browser DevTools** (F12)
2. **Go to Application tab** → Cookies → Select your frontend domain
3. **Look for**: `__clerk_test_*` cookies should be set (not rejected)
4. **Refresh page** and check Console for Clerk errors
5. **Check**: No "Cookie '___ has been rejected for invalid domain" errors

**Expected Console Output:**
```
✅ Clerk User Loaded (shows login/logout UI)
✅ useAuth() returns userId
```

---

## Step 2: Verify CORS Deployed ✓ 
After updating Vercel backend env:

1. **Open DevTools** → Network tab
2. **Go to** `/student/courses` page
3. **Look for request**: `/api/enrollments/my-courses`
4. **Check response headers**:
   - `access-control-allow-origin: https://academy-frontend-git-dev-fixes-adilmohd04s-projects.vercel.app`
   - Status code should be **200**, not 403

**If seeing 403 Forbidden:**
- Backend hasn't redeployed yet, OR
- Env var not saved properly
- Wait 2 min and hard refresh (Ctrl+Shift+R)

---

## Step 3: Verify API Data Returned ✓

1. **In Network tab**, click on `/api/enrollments/my-courses` request
2. **Go to Response tab**
3. **Should see**:
   ```json
   {
     "courses": [
       { "id": "...", "title": "Course Name", ... },
       ...
     ]
   }
   ```

4. **If empty**: `"courses": []`
   - User has no enrollments in database
   - Is fine if user just signed up; can enroll in courses

---

## Step 4: Verify Frontend Displays Courses ✓

1. **Go to** `/student/courses`
2. **Should see**: Grid of course cards (not loading spinner)
3. **If still loading**:
   - Open Console tab
   - Look for error messages
   - Check if fetch succeeded (step 3)

---

## Troubleshooting: If Still Not Working

### Symptom: Clerk Cookie Still Rejected
```
❌ Cookie "__clerk_test_etld" has been rejected for invalid domain
```
**Fix**: 
- [ ] Check Clerk dashboard → Settings → Domains
- [ ] Verify domain exactly matches: `academy-frontend-git-dev-fixes-adilmohd04s-projects.vercel.app`
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Clear cookies if needed: DevTools → Application → Cookies → Delete __clerk_*

### Symptom: useAuth() Still Returns Undefined
```
userId: undefined, user loaded: true
```
**Fix**:
- [ ] Close and reopen browser
- [ ] Logout and login again
- [ ] Try incognito/private window
- [ ] Check Clerk dashboard → Users → is user showing up?

### Symptom: CORS Still Blocked (403)
```
access-control-allow-origin missing from response headers
```
**Fix**:
- [ ] Verify CORS_ORIGIN in Vercel backend settings
- [ ] Check it includes your frontend domain
- [ ] Trigger rebuild: Go to Vercel → Deployments → Redeploy

### Symptom: API Returns 401 Unauthorized
```
Error: Unauthorized
```
**Fix**:
- [ ] Check header: `x-clerk-user-id` is present
- [ ] Verify header value matches Clerk User ID
- [ ] In Console, run: `console.log(document.querySelector('script[src*="clerk"]')?.getAttribute('data-user-id'))`

---

## Console Commands for Debugging

Run these in browser Console (F12):

```javascript
// Check Clerk context
window.__clerk?.client?.sessions?.getActive().then(s => console.log('Clerk Session:', s))

// Check userId from useAuth hook (next app specific)
// Just look at Console output from the app

// Test API directly
fetch('https://academy-backend-git-dev-fixes-adilmohd04s-projects.vercel.app/api/enrollments/my-courses', {
  headers: {
    'x-clerk-user-id': 'user_XXXXX'  // replace with your user id
  }
}).then(r => console.log('Status:', r.status, r.ok)).catch(e => console.error(e))
```

---

## Expected Timeline After Fixes

1. **Clerk Domain Added**: Immediate (no deployment needed)
2. **Backend Env Updated**: 1-2 min (Vercel redeploy)
3. **Propagation**: 30-60 sec
4. **Effect**: Next time you login/refresh, courses should appear

---

## Still Need Help?

If after all these steps courses still don't appear:
1. Take screenshot of DevTools Network tab
2. Copy Console errors
3. Check if user has enrollments in Supabase dashboard
4. Verify backend is actually deployed (check Vercel deployment logs)
