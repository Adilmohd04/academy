# Teacher Payment Status - Two-Level System

## Overview
The system supports **TWO independent payment levels**:

1. **Teacher-Level Status** (Profile)
2. **Slot-Level Status** (Individual Time Slots)

---

## 1. Teacher-Level Status (`profiles.is_free`)

### Purpose
- Sets the **default pricing** for new slots
- Displayed in the admin teacher management page
- Used for teacher profile information

### Behavior
- **PAID Teacher**: New slots default to PAID (₹100 or custom price)
- **FREE Teacher**: New slots default to FREE (₹0)

### Toggle Effect
- ✅ Updates teacher profile status
- ✅ Affects future/new slots only
- ❌ Does NOT change existing slots
- ❌ Does NOT override individual slot pricing

**Example:**
```
Teacher: teacher1@gmail.com
Profile Status: PAID

Admin clicks "Switch to Free" →
- Profile changes to FREE
- Existing PAID slots remain PAID
- Existing FREE slots remain FREE  
- New slots will default to FREE
```

---

## 2. Slot-Level Status (`teacher_slot_availability.is_free`)

### Purpose
- Controls the **actual pricing** for each specific time slot
- Displayed to students in the booking portal
- Shown in admin page under "Weekly Availability"

### Behavior
- Each slot has its own independent `is_free` status
- Teachers can mark individual slots as FREE even if they are PAID teachers
- Students see the slot-level status when booking

### How It Works
```
PAID Teacher can offer:
├─ Some slots as PAID (₹100)
├─ Some slots as FREE (₹0)
└─ Mix of both

FREE Teacher can offer:
├─ All slots as FREE (₹0)
├─ Some slots as PAID (if needed)
└─ Mix of both
```

---

## Real Example from Database

### Teacher: teacher@gmail.com
**Profile Status:** FREE (Teacher-Level)

**Individual Slots:**
- Dec 14, 1:00 PM → **PAID** 💰
- Dec 19, 4:00 PM → **FREE** 🆓  
- Dec 20, 4:00 PM → **PAID** 💰

### Teacher: teacher1@gmail.com  
**Profile Status:** FREE (Teacher-Level)

**Individual Slots:**
- Dec 12, 4:00 PM → **FREE** 🆓
- Dec 13, 5:00 PM → **PAID** 💰
- Dec 14, 3:00 PM → **FREE** 🆓
- Dec 19, 5:00 PM → **FREE** 🆓
- Dec 20, 4:00 PM → **PAID** 💰
- Dec 21, 1:00 PM → **PAID** 💰

---

## Admin Page Display

### Payment Status Box
Shows **Teacher-Level** status with toggle:
- "Default Payment Status: PAID/FREE"
- Toggle button to switch teacher's default
- Note: "This sets the default for new slots. Individual slots below may have different pricing."

### Weekly Availability Section
Shows **Slot-Level** status for each individual slot:
- Each slot displays its own FREE/PAID badge
- Reflects what students will see and pay
- Independent of teacher's default status

---

## Student Portal Display

Students see **Slot-Level** status only:
```
teacher1@gmail.com

Dec 19, 5:00 PM - 6:00 PM
FREE                        ← From slot.is_free
Islam
1 spot left
[Book Now]

Dec 21, 1:00 PM - 2:00 PM
₹100                        ← From slot.is_free = false
Tajweed
1 spot left
[Book Now]
```

---

## Summary

| Aspect | Teacher-Level | Slot-Level |
|--------|--------------|------------|
| **Location** | `profiles.is_free` | `teacher_slot_availability.is_free` |
| **Scope** | Entire teacher | Individual time slot |
| **Purpose** | Default for new slots | Actual pricing |
| **Admin Toggle Effect** | Changes profile only | No effect |
| **Student Sees** | No | Yes |
| **Can Mix?** | N/A | Yes - PAID teacher can offer FREE slots |

---

## Key Points

✅ **Toggling teacher status does NOT change existing slots**
✅ **Each slot maintains its own pricing**
✅ **Admin page shows both levels clearly**
✅ **Students see only slot-level pricing**
✅ **PAID teachers can offer individual FREE slots**
✅ **FREE teachers can offer individual PAID slots (if needed)**

This two-level system provides **maximum flexibility** for teachers to manage their pricing strategy!
