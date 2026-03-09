import { supabase } from '../config/database';

/**
 * Auto-publish quizzes, assignments, and weeks based on release_date
 * This job should run every 5-10 minutes via cron
 */
export async function autoPublishContent() {
  try {
    const now = new Date().toISOString();
    
    console.log('🔄 Running auto-publish job...');
    
    // 1. Auto-publish WEEKS
    const { data: weeksToPublish, error: weekFetchError } = await supabase
      .from('course_weeks')
      .select('id, title, release_date')
      .eq('is_published', false)
      .not('release_date', 'is', null)
      .lte('release_date', now);
    
    if (weekFetchError) {
      console.error('❌ Error fetching weeks:', weekFetchError);
    } else if (weeksToPublish && weeksToPublish.length > 0) {
      console.log(`📢 Found ${weeksToPublish.length} weeks to auto-publish:`);
      
      for (const week of weeksToPublish) {
        const { error: updateError } = await supabase
          .from('course_weeks')
          .update({ is_published: true, updated_at: new Date().toISOString() })
          .eq('id', week.id);
        
        if (updateError) {
          console.error(`   ❌ Failed to publish week "${week.title}":`, updateError);
        } else {
          console.log(`   ✅ Published week: "${week.title}"`);
        }
      }
    }
    
    // 2. Auto-publish LESSONS (quizzes and assignments)
    const { data: lessonsToPublish, error: lessonFetchError } = await supabase
      .from('course_lessons')
      .select('id, title, content_type, release_date')
      .eq('is_published', false)
      .not('release_date', 'is', null)
      .lte('release_date', now)
      .in('content_type', ['quiz', 'assignment']);
    
    if (lessonFetchError) {
      console.error('❌ Error fetching lessons:', lessonFetchError);
    } else if (lessonsToPublish && lessonsToPublish.length > 0) {
      console.log(`📢 Found ${lessonsToPublish.length} lessons to auto-publish:`);
      
      for (const lesson of lessonsToPublish) {
        const { error: updateError } = await supabase
          .from('course_lessons')
          .update({ is_published: true, updated_at: new Date().toISOString() })
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
