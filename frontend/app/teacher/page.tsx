import { UserButton } from '@clerk/nextjs'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
const IslamicTeacherDashboard = dynamic(() => import('./IslamicTeacherDashboard'), { ssr: false })

const supabase = getSupabaseAdminClient()

export default async function TeacherDashboard() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Enforce role-based access: only teachers (or admins) can access
  const role = (user.publicMetadata?.role as string) || 'student'
  if (role !== 'teacher' && role !== 'admin') {
    redirect('/student')
  }

  const clerkUserId = user.id

  // Fetch teacher's courses
  let courses = []
  let totalStudents = 0
  let upcomingMeetings = 0
  let meetings = [];

  try {
    // Resolve teacher profile UUID (canonical foreign key used by courses.teacher_id)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle()

    const teacherProfileId = profileData?.id || null

    // Courses with enrollment count
    let courseData: any[] | null = null
    let courseError: any = null

    if (teacherProfileId) {
      const profileIdQuery = await supabase
        .from('courses')
        .select('*, enrollments(count)')
        .eq('teacher_id', teacherProfileId)

      courseData = profileIdQuery.data
      courseError = profileIdQuery.error
    }

    // Backward-compatibility fallback for legacy rows keyed by clerk_user_id
    if ((!courseData || courseData.length === 0) && clerkUserId) {
      const legacyQuery = await supabase
        .from('courses')
        .select('*, enrollments(count)')
        .eq('teacher_id', clerkUserId)

      if (!legacyQuery.error && legacyQuery.data) {
        courseData = legacyQuery.data
        courseError = null
      }
    }

    if (!courseError && courseData) {
      courses = courseData.map((course: any) => ({
        ...course,
        student_count: course.enrollments?.[0]?.count || 0
      }))
    }

    // Meeting bookings for this teacher
    console.log('🔍 Fetching meetings for teacher:', clerkUserId);
    
    // Fetch with proper JOIN to get time information
    const { data: meetingData, error: meetingError } = await supabase
      .from('meeting_bookings')
      .select(`
        *,
        time_slots:time_slot_id (
          id,
          slot_name,
          start_time,
          end_time
        ),
        teacher_slot_availability:teacher_slot_id (
          id,
          date,
          max_capacity
        )
      `)
      .eq('teacher_id', clerkUserId)
      .order('meeting_date', { ascending: true })
    
    console.log('📊 Meeting query result:', { 
      error: meetingError, 
      dataCount: meetingData?.length,
      data: meetingData 
    });
    
    if (!meetingError && meetingData) {
      // Helper function to convert 24h to 12h format
      const formatTime12h = (time24: string) => {
        if (!time24) return time24;
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours);
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${h12}:${minutes} ${period}`;
      };
      
      // Transform data - time_slots are already joined
      meetings = meetingData.map((m: any) => {
        // Get time slot data from the joined relation
        const timeSlot = Array.isArray(m.time_slots) ? m.time_slots[0] : m.time_slots;
        
        // Format times in 12-hour format
        const startTime = timeSlot?.start_time ? formatTime12h(timeSlot.start_time) : '';
        const endTime = timeSlot?.end_time ? formatTime12h(timeSlot.end_time) : '';
        const meeting_time = startTime && endTime ? `${startTime} - ${endTime}` : 'Time not set';
        
        console.log('🔍 Processing meeting:', m.id, {
          time_slot_id: m.time_slot_id,
          timeSlot,
          meeting_time
        });
        
        return {
          ...m,
          meeting_time,
          slot_name: timeSlot?.slot_name || '',
          amount: m.payment_amount || 0,
          student_phone: m.student_phone || 'N/A'
        };
      });
      
      console.log('✅ Transformed meetings:', meetings.length, 'meetings found');
      console.log('📋 Sample meeting:', meetings[0]);
      
      // Count upcoming meetings (approved and in future)
      const now = new Date()
      upcomingMeetings = meetings.filter((m: any) => m.approval_status === 'approved' && new Date(m.meeting_date) >= now).length
      // Count unique students
      const studentIds = new Set(meetings.map((m: any) => m.student_id))
      totalStudents = studentIds.size
      
      console.log('📊 Stats:', { upcomingMeetings, totalStudents });
    }
  } catch (e) {
    console.log('Error fetching courses or meetings', e)
  }

  // Convert user to plain object to avoid serialization errors
  const userData = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.emailAddresses[0]?.emailAddress,
    imageUrl: user.imageUrl,
    role: role,
  }

  return <IslamicTeacherDashboard 
    courses={courses}
    meetings={meetings}
  />
}
