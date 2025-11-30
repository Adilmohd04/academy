# Urgent Slot Creation - Final Rules ✅

## The New System:

### Rule 1: 3-Hour Minimum Gap from NOW
**Teacher can ONLY create slots that are at least 3 hours from current time**

**Examples (Current time: 2:00 PM):**

✅ **CAN Create:**
- Today 5:30 PM slot (3.5 hours away)
- Today 6:00 PM slot (4 hours away)
- Tomorrow 9:00 AM slot (19 hours away)
- Any future day, any time

❌ **CANNOT Create:**
- Today 3:00 PM slot (only 1 hour away)
- Today 4:00 PM slot (only 2 hours away)
- Today 4:30 PM slot (only 2.5 hours away)

**What happens:**
- Time slots less than 3 hours away are HIDDEN from dropdown
- If NO slots are available, shows: "⚠️ No slots available - all slots must be at least 3 hours from now"

---

### Rule 2: Deadline Must Be 2 Hours Before Class
**Booking deadline must be at least 2 hours before the slot time**

**Examples:**

**Urgent Slot Today (2:00 PM now, creating 6:00 PM slot):**
- Slot: Today 6:00 PM
- Minimum deadline: Today 4:00 PM (2 hours before)
- ✅ Valid: Today 3:30 PM
- ✅ Valid: Today 2:30 PM  
- ❌ Invalid: Today 4:30 PM (only 1.5 hours before)

**Normal Future Slot (Wednesday 2:00 PM):**
- Slot: Wednesday 2:00 PM
- Minimum deadline: Wednesday 12:00 PM (2 hours before)
- ✅ Valid: Wednesday 11:00 AM
- ✅ Valid: Tuesday 6:00 PM (same day, 1 day, or 2 days before)
- ✅ Valid: Monday 2:00 PM (2 days before)
- ❌ Invalid: Wednesday 1:00 PM (only 1 hour before)
- ❌ Invalid: Sunday 2:00 PM (more than 2 days before)

---

### Rule 3: Deadline Can Be Same Day, 1 Day, or 2 Days Before
**Teacher can choose deadline flexibility**

**Deadline Options:**
1. **Same day** - e.g., Class Wed 2 PM, Deadline Wed 11 AM
2. **1 day before** - e.g., Class Wed 2 PM, Deadline Tue 6 PM
3. **2 days before** - e.g., Class Wed 2 PM, Deadline Mon 2 PM

**Cannot:**
- Set deadline more than 2 days before
- Set deadline in the past
- Set deadline less than 2 hours before class

---

## Smart Defaults:

### For Urgent Slots (Today):
**Current time:** 2:00 PM  
**Creating slot:** 6:00 PM today

**Auto-calculated:**
- Slot must be 3+ hours away: ✅ 6 PM is 4 hours away
- Deadline: 3:00 PM (2 hours before slot, 1 hour from now)

### For Future Slots (Tomorrow onwards):
**Creating slot:** Wednesday 2:00 PM

**Auto-calculated:**
- Deadline: Tuesday 6:00 PM (1 day before, evening)
- Teacher can adjust to same day, 1 day, or 2 days before

---

## Validation Errors:

### Error 1: Slot Too Soon
```
⚠️ Slot "02:00 PM - 03:00 PM IST" on 2025-11-05 is too soon!
You can only create slots that are at least 3 hours from now.
Current time: 02:15 PM IST
```

**Fix:** Select a later time slot (3+ hours away)

### Error 2: Deadline Too Close
```
⚠️ Booking deadline must be at least 2 hours before class time.
Slot: 02:00 PM - 03:00 PM IST on 2025-11-06.
Please adjust the deadline.
```

**Fix:** Move deadline earlier (2+ hours before class)

### Error 3: Deadline Too Far
```
⚠️ Deadline cannot be more than 2 days before the class.
Slot: 02:00 PM - 03:00 PM IST on 2025-11-06
```

**Fix:** Move deadline closer (within 2 days)

### Error 4: Deadline in Past
```
⚠️ Deadline for "02:00 PM - 03:00 PM IST" is in the past!
Please set a future deadline.
```

**Fix:** Set a future deadline

---

## Complete Example Flow:

### Scenario 1: Creating Urgent Slot NOW

**Current situation:**
- Current time: 2:30 PM Tuesday
- Want to teach: TODAY

**Steps:**
1. Check Tuesday ✓
2. Click "Configure Slots"
3. Click "+ Add Slot"
4. **Available time slots:**
   - ❌ 3:00 PM (only 0.5 hrs away)
   - ❌ 4:00 PM (only 1.5 hrs away)
   - ❌ 5:00 PM (only 2.5 hrs away)
   - ✅ 6:00 PM (3.5 hrs away) ← Can select!
   - ✅ 7:00 PM (4.5 hrs away) ← Can select!

5. Select "6:00 PM - 7:00 PM IST"
6. **Default deadline:** 3:30 PM (2 hrs before, 1 hr from now)
7. Adjust if needed (but must be 2+ hrs before 6 PM)
8. Set capacity: 5 students
9. Save ✅

### Scenario 2: Creating Normal Future Slot

**Current situation:**
- Current time: 2:30 PM Tuesday
- Want to teach: Thursday 2:00 PM

**Steps:**
1. Check Thursday ✓
2. Click "Configure Slots"
3. Click "+ Add Slot"
4. **Available time slots:** ALL 9 slots (all are 40+ hours away)
5. Select "2:00 PM - 3:00 PM IST"
6. **Default deadline:** Wednesday 6:00 PM (1 day before)
7. Can change to:
   - Same day: Thursday 11:00 AM (3 hrs before)
   - 1 day: Wednesday any time before 12:00 PM
   - 2 days: Tuesday 2:00 PM onwards
8. Set capacity: 10 students
9. Save ✅

---

## UI Hints:

**Time Slot Dropdown:**
- Shows only slots 3+ hours away
- If empty: "⚠️ No slots available - all slots must be at least 3 hours from now"

**Deadline Date:**
- Label: "Booking Deadline Date * (Min: 2 hrs before)"
- Hint: "⏰ Same day, 1 day, or 2 days before class (min: 2hrs)"

**Deadline Time:**
- Label: "Booking Deadline Time * (IST)"
- Hint: "Students book at least 2 hours before class"

---

## Summary Table:

| Situation | Slot Time | Minimum Deadline | Maximum Deadline |
|-----------|-----------|------------------|------------------|
| **Urgent (Today 2PM → 6PM)** | 6:00 PM | 4:00 PM (2hrs before) | Now + safe margin |
| **Normal (Wed 2PM)** | 2:00 PM Wed | 12:00 PM Wed (2hrs) | 2:00 PM Mon (2 days) |
| **Cannot create** | Any time < 3hrs from now | - | - |

---

## Key Differences from Before:

### OLD System:
- ❌ Could create any time slot (even past)
- ❌ Required 3 hours between deadline and class
- ❌ No check for urgent slots

### NEW System:
- ✅ Can ONLY create slots 3+ hours from NOW
- ✅ Requires 2 hours between deadline and class
- ✅ Smart handling for urgent slots today
- ✅ Flexible deadline (same day, 1 day, 2 days)
- ✅ No slots shown if all are too soon

---

## Test Cases:

**Test 1: Try to create slot in 2 hours**
- Result: Time slot NOT shown in dropdown ✅
- Message: "No slots available" ✅

**Test 2: Create slot in 4 hours with 1 hour deadline**
- Result: Error "deadline must be at least 2 hours before" ✅

**Test 3: Create tomorrow's slot with 3 days before deadline**
- Result: Error "cannot be more than 2 days before" ✅

**Test 4: Create next week slot with same day deadline**
- Result: Success if 2+ hours before class ✅

---

**STATUS: ✅ ALL RULES IMPLEMENTED!**

The system now properly handles urgent slot creation with smart validation and helpful error messages!
