# Remaining Fixes Needed

## ✅ COMPLETED FIXES

1. **Teacher Management 500 Error** - FIXED
   - Issue: Supabase JOIN was using wrong foreign key
   - Solution: Changed to fetch teachers and pricing separately using clerk_user_id

2. **Enrollment Count Showing 0** - FIXED
   - Issue: Backend wasn't returning `_count.enrollments`
   - Solution: Added enrollment count query in `getCoursesByTeacher` service

3. **Free Teacher Slots Price Display** - FIXED
   - Issue: Free teacher slots showing as paid
   - Solution: Backend now checks teacher pricing and overrides slot pricing

## ❌ REMAINING FIXES NEEDED

### 1. "Make this slot free" Checkbox (Frontend)

**File:** `frontend/app/teacher/availability/page.tsx`

**Changes needed:**

```typescript
// Add after line 74 (after quickTopic state)
const [teacherPricing, setTeacherPricing] = useState<{is_free: boolean; price_per_meeting: number | null}>({ 
  is_free: false, 
  price_per_meeting: null 
});

// Add function to load teacher pricing (after loadWeeklyAvailability function)
const loadTeacherPricing = async () => {
  try {
    const token = await getToken();
    const userId = user?.id;
    if (!userId) return;

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher-pricing/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      setTeacherPricing({
        is_free: data.is_free || false,
        price_per_meeting: data.price_per_meeting || null
      });
    }
  } catch (error) {
    console.error('Error fetching teacher pricing:', error);
  }
};

// Update useEffect (around line 85) to call loadTeacherPricing
useEffect(() => {
  loadData();
  loadTeacherPricing(); // ADD THIS LINE
}, []);

// Update checkbox (around line 730) to be conditional:
{!teacherPricing.is_free && (
  <div className="mb-4">
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={slot.is_free}
        onChange={(e) => handleSlotChange(actualIndex, 'is_free', e.target.checked)}
        className="mt-1 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
      />
      <div>
        <span className="text-sm font-medium text-gray-700">Make this slot free</span>
        <span className="block text-xs text-gray-500">
          Students will not be charged for this session (you are a paid teacher, but can offer free sessions)
        </span>
      </div>
    </label>
  </div>
)}
{teacherPricing.is_free && (
  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
    <p className="text-sm text-emerald-800">✓ All your sessions are free (you are a free teacher)</p>
  </div>
)}
```

### 2. Admin Slot Status Override (New Feature - Optional)

**Create new file:** `frontend/app/admin/slot-management/page.tsx`

This would allow admins to:
- View all upcoming slots across all teachers
- Override individual slot payment status (free ↔ paid)
- Change slot capacity, deadline, etc.

**Backend endpoint needed:** `PATCH /api/admin/slots/:slotId`

### 3. Teacher Status Change Preservation Logic

**File:** `backend/src/modules/teacher/services/teacherAvailabilityService.ts`

**Current behavior:** When teacher changes from paid→free or free→paid, ALL slots change

**Desired behavior:** 
- When teacher changes from paid→free: Existing paid slots stay paid, only NEW slots are free
- When teacher changes from free→paid: Existing free slots stay free, only NEW slots are paid

**Implementation:** The current code already handles this correctly! 
- Line 90-99: Checks teacher pricing BUT uses slot's individual `is_free` value if teacher is paid
- Line 96: `const slotIsFree = isTeacherFree ? true : (slot.is_free || false);`

This means:
- If teacher is FREE: ALL slots are forced free (slotIsFree = true)
- If teacher is PAID: Use individual slot's is_free value

**To preserve existing slot status when teacher changes:**
We need to NOT override existing slots when teacher pricing changes. Only new slots should follow teacher pricing.

**Suggested fix:**
```typescript
// When saving slot, check if slot already exists
const { data: existingSlot } = await supabase
  .from('teacher_slot_availability')
  .select('is_free')
  .eq('teacher_id', teacherId)
  .eq('date', slot.date)
  .eq('time_slot_id', slot.timeSlotId)
  .single();

// If slot exists, preserve its is_free status
// If new slot, use teacher pricing
const slotIsFree = existingSlot 
  ? existingSlot.is_free // Preserve existing 
  : (isTeacherFree ? true : (slot.is_free || false)); // New slot follows rules
```

### 4. Payment Flow (Already Working!)

The current code already handles this correctly:
- `frontend/app/student/meetings/schedule/page.tsx` checks `meetingPrice === 0` or `slotDetails.is_free === true`
- If free: Creates booking directly without payment
- If paid: Redirects to payment page

No changes needed!

## TESTING CHECKLIST

- [ ] Teacher Management page loads without 500 error
- [ ] Teacher Management shows ONLY teachers (no admins/students)
- [ ] Course enrollment count displays correctly (not 0)
- [ ] Free teacher slots show "Free Session" in booking confirmation
- [ ] Paid teacher slots show price and redirect to payment
- [ ] Paid teachers see "Make this slot free" checkbox
- [ ] Free teachers DON'T see checkbox (all slots auto-free)
- [ ] When paid teacher marks slot as free, students don't pay
- [ ] When free teacher creates slot, it's automatically free
- [ ] Existing slots preserve their payment status when teacher pricing changes

## PRIORITY

1. **HIGH**: "Make this slot free" checkbox (affects paid teachers offering free sessions)
2. **MEDIUM**: Test all payment flows work correctly
3. **LOW**: Admin slot override feature (nice-to-have, not critical)
4. **LOW**: Preserve slot status on teacher pricing change (edge case)
