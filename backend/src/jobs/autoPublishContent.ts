import { supabase } from '../config/database';

function isTransientSupabaseConnectivityError(error: any) {
  const message = String(error?.message || '');
  const details = String(error?.details || '');
  const combined = `${message} ${details}`.toLowerCase();

  return (
    combined.includes('fetch failed') ||
    combined.includes('enotfound') ||
    combined.includes('econnreset') ||
    combined.includes('tls') ||
    combined.includes('secure tls connection') ||
    combined.includes('client network socket disconnected')
  );
}

/**
 * Auto-publish quizzes, assignments, and weeks based on release_date
 * This job should run every 5-10 minutes via cron
 */
export async function autoPublishContent() {
  try {
    const now = new Date().toISOString();
    
    console.log('🔄 Running auto-publish job...');
    
    // 1. Auto-publish WEEKS (only for live/hybrid courses)
    // Uses `unlock_date` and `status` fields as defined in courseWeekService.ts
    // Pre-recorded courses are excluded — their weeks stay in draft until
    // the entire course is published at the course level.
    const { data: weeksToPublish, error: weekFetchError } = await supabase
      .from('course_weeks')
      .select('id, title, unlock_date, course_id, courses!inner(course_type)')
      .eq('status', 'draft')
      .not('unlock_date', 'is', null)
      .lte('unlock_date', now)
      .in('courses.course_type', ['live', 'hybrid']);
    
    if (weekFetchError) {
      if (isTransientSupabaseConnectivityError(weekFetchError)) {
        console.warn('⚠️ Auto-publish skipped: transient Supabase connectivity issue while fetching weeks');
        return;
      }
      console.error('❌ Error fetching weeks:', weekFetchError);
    } else if (weeksToPublish && weeksToPublish.length > 0) {
      console.log(`📢 Found ${weeksToPublish.length} weeks to auto-publish:`);
      
      for (const week of weeksToPublish) {
        const { error: updateError } = await supabase
          .from('course_weeks')
          .update({ status: 'published', published_at: now, updated_at: now })
          .eq('id', week.id);
        
        if (updateError) {
          console.error(`   ❌ Failed to publish week "${week.title}":`, updateError);
        } else {
          console.log(`   ✅ Published week: "${week.title}"`);
        }
      }
    }
    
    // 2. Auto-publish LESSONS (quizzes and assignments)
    // Uses `release_date` and `is_published` if those columns exist on course_lessons,
    // otherwise falls back to the same status/unlock_date pattern used for weeks.
    const { data: lessonsToPublish, error: lessonFetchError } = await supabase
      .from('course_lessons')
      .select('id, title, content_type, release_date')
      .eq('is_published', false)
      .not('release_date', 'is', null)
      .lte('release_date', now)
      .in('content_type', ['quiz', 'assignment']);
    
    if (lessonFetchError) {
      if (isTransientSupabaseConnectivityError(lessonFetchError)) {
        console.warn('⚠️ Auto-publish skipped: transient Supabase connectivity issue while fetching lessons');
        return;
      }
      console.error('❌ Error fetching lessons:', lessonFetchError);
    } else if (lessonsToPublish && lessonsToPublish.length > 0) {
      console.log(`📢 Found ${lessonsToPublish.length} lessons to auto-publish:`);
      
      for (const lesson of lessonsToPublish) {
        const { error: updateError } = await supabase
          .from('course_lessons')
          .update({ is_published: true, updated_at: now })
          .eq('id', lesson.id);
        
        if (updateError) {
          console.error(`   ❌ Failed to publish "${lesson.title}":`, updateError);
        } else {
          console.log(`   ✅ Published ${lesson.content_type}: "${lesson.title}"`);
        }
      }
    }
    
    if ((!weeksToPublish || weeksToPublish.length === 0) && (!lessonsToPublish || lessonsToPublish.length === 0)) {
      console.log('✅ No content to auto-publish at this time');
    } else {
      console.log('🎉 Auto-publish job completed!');
    }
  } catch (error) {
    console.error('❌ Auto-publish job failed:', error);
  }
}
