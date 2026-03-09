/**
 * Auto-Archive Courses Cron Job
 * 
 * Automatically archives live/hybrid courses when they end
 * Runs daily to check for courses that should be archived
 */

import { supabase } from '../config/database';

export const autoArchiveCourses = async () => {
  try {
    console.log('🔄 [Auto-Archive] Starting auto-archive job...');
    const now = new Date().toISOString();
    
    // Find live/hybrid courses that have ended and aren't archived yet
    const { data: coursesToArchive, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, course_type, ends_at')
      .in('course_type', ['live', 'hybrid'])
      .not('ends_at', 'is', null)
      .lte('ends_at', now)
      .is('archived_at', null);
    
    if (coursesError) {
      console.error('❌ Error fetching courses to archive:', coursesError);
      return;
    }
    
    if (!coursesToArchive || coursesToArchive.length === 0) {
      console.log('📋 No courses to archive');
      return;
    }
    
    console.log(`📦 Found ${coursesToArchive.length} courses to archive`);
    
    // Archive the courses
    const { error: updateError } = await supabase
      .from('courses')
      .update({ 
        archived_at: now,
        status: 'archived'
      })
      .in('id', coursesToArchive.map(c => c.id));
    
    if (updateError) {
      console.error('❌ Error archiving courses:', updateError);
      return;
    }
    
    console.log(`✅ Successfully archived ${coursesToArchive.length} courses`);
    coursesToArchive.forEach(c => {
      console.log(`  - ${c.title} (${c.course_type}) - Ended ${c.ends_at}`);
    });
    
    console.log('✅ [Auto-Archive] Job completed successfully');
  } catch (error) {
    console.error('❌ [Auto-Archive] Job failed:', error);
  }
};

// Run immediately if executed directly
if (require.main === module) {
  autoArchiveCourses()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
