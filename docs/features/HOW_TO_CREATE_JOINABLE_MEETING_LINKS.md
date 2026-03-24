# How to Create Joinable Meeting Links (No "Ask to Join")

## Problem
When you paste a Google Meet link, both teacher and student see "Ask to join" and cannot enter directly.

## Solutions (Choose One)

---

### ✅ Option 1: Use Google Calendar Scheduled Meeting (BEST)

**Steps:**
1. Go to https://calendar.google.com
2. Click "+ Create" → "Event"
3. Add event details:
   - Title: "Class with [Student Name]"
   - Date & Time: Match the slot time
   - Add guests: **Enter student email and teacher email**
4. Click "Add Google Meet video conferencing"
5. Click "Save"
6. Open the event, copy the Google Meet link
7. Paste this link in admin approval page

**Why this works:**
- Both emails are listed as guests → automatic join access
- No "ask to join" prompt
- **Google sends calendar invites** to both teacher and student
- **Our system also sends emails** with the meeting link (duplicate emails)

**⚠️ Duplicate Emails Warning:**
- Google Calendar will send invitation emails to guests
- Our system will also send approval emails with the meeting link
- Students/teachers will receive **2 emails** about the same meeting
- This is normal for now - they get both calendar invite + approval confirmation

**To avoid confusion:**
- Tell students: "You'll receive both a calendar invite and an approval email"
- Or we can modify our email template to say "Note: You may also receive a calendar invite"

---

### ✅ Option 2: Create Instant Meeting with Host Settings (Quick)

**Steps:**
1. Go to https://meet.google.com
2. Click "New meeting" → "Create an instant meeting"
3. Copy the meeting link
4. **BEFORE pasting in admin:** 
   - Click on the link yourself (as host)
   - Go to meeting settings (3 dots) → "Host controls"
   - Enable "Quick access" OR disable "Let host approve join requests"
5. Now paste this link in admin approval

**Why this works:**
- Host joined first and disabled approval
- Anyone with link can join directly

---

### ✅ Option 3: Use Workspace Domain Settings (Permanent Fix)

**For Google Workspace Admins only:**

1. Go to https://admin.google.com
2. Navigate to: **Apps → Google Workspace → Google Meet → Meet video settings**
3. Find **"Host management"** section
4. Change **"Let people join without asking"** to:
   - ☑️ **ON** for internal users (same domain)
   - ☑️ **ON** for external users (if teaching external students)
5. Save changes

**Why this works:**
- Organization-wide setting
- All meetings created by domain users allow direct join
- Best for long-term solution

---

### ✅ Option 4: Use Zoom Instead (Alternative)

**Steps:**
1. Go to https://zoom.us
2. Click "Host a Meeting" → "Schedule Meeting"
3. Set:
   - Date/Time: Match slot
   - Enable "Waiting Room": **OFF**
   - Enable "Join before host": **ON**
4. Save and copy meeting link
5. Paste this link in admin approval

**Why this works:**
- Zoom's "Join before host" allows direct entry
- No waiting/approval needed

---

## Current Workflow (Manual)

1. **Admin creates meeting** using one of the methods above
2. **Admin pastes link** in "Meeting Link" field on approval page
3. **Admin clicks "Approve Box"**
4. **System sends emails** with the link to both teacher and student
5. **Both can join directly** at meeting time (no "ask to join")

---

## Quick Comparison

| Method | Setup Time | Best For | Requires |
|--------|-----------|----------|----------|
| Calendar Event | 2 min | Scheduled classes | Add guest emails |
| Instant + Settings | 1 min | Quick fixes | Host joins first |
| Workspace Settings | One-time | Permanent solution | Workspace Admin |
| Zoom | 2 min | Non-Google alternative | Zoom account |

---

## Recommended Solution

**For now:** Use **Option 1 (Calendar Event)** - it's the most reliable and professional.

**When you get domain:** Enable **Option 3 (Workspace Settings)** so all future meetings work automatically.

---

## Future: Re-enable Auto Generation

Once you have:
- ✅ Google Workspace domain
- ✅ Service account with domain-wide delegation
- ✅ Workspace settings configured (Option 3)

Then we can re-enable the "Generate Google Meet & Approve" button, and it will create Calendar events with attendees automatically - no manual work needed!

---

**Current Status:** Manual link pasting required. Use Google Calendar events with guest emails for best experience.
