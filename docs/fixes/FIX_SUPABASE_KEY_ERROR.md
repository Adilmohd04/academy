# Fix: Supabase Key Error & File Uploads

## Issue
The application was crashing with `Error: supabaseKey is required` because `NEXT_PUBLIC_SUPABASE_ANON_KEY` was missing from the environment variables. This key is required for the client-side Supabase client (`@/lib/supabaseClient`).

## Solution
Since the `SUPABASE_SERVICE_ROLE_KEY` is available (server-side admin key), we refactored the file upload process to be server-side. This avoids exposing any keys to the client and works with the existing configuration.

### Changes Made

1. **Created Upload API (`frontend/app/api/upload/route.ts`)**
   - Accepts file uploads via `POST`.
   - Uses `SUPABASE_SERVICE_ROLE_KEY` to upload to Supabase Storage.
   - Returns the public URL of the uploaded file.
   - Secured with Clerk authentication.

2. **Updated Admin Resources Page (`frontend/app/admin/resources/page.tsx`)**
   - Removed direct dependency on `supabase` client.
   - Updated `handleFileUpload` to use the new `/api/upload` endpoint.

3. **Updated Teacher Resources Page (`frontend/app/teacher/resources/page.tsx`)**
   - Removed direct dependency on `supabase` client.
   - Updated `handleFileUpload` to use the new `/api/upload` endpoint.

4. **Patched Supabase Client (`frontend/lib/supabaseClient.ts`)**
   - Modified to handle missing Anon Key gracefully (returns `null` instead of crashing).
   - This prevents the app from crashing if the file is imported elsewhere.

## Verification
- The "supabaseKey is required" error should be gone.
- File uploads should now work for both Admins and Teachers.
- No sensitive keys are exposed to the browser.
