require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupDatabase() {
  console.log('🧹 Cleaning up corrupt lessons...\n');
  
  // Find lessons with null title or content_type
  const { data: corruptLessons, error: findError } = await supabase
    .from('course_lessons')
    .select('id, title, content_type, week_id')
    .or('title.is.null,content_type.is.null');
  
  if (findError) {
    console.error('❌ Error finding corrupt lessons:', findError);
    return;
  }
  
  console.log(`Found ${corruptLessons?.length || 0} corrupt lessons:`);
  corruptLessons?.forEach(lesson => {
    console.log(`  - ID: ${lesson.id}, Title: ${lesson.title || 'NULL'}, Type: ${lesson.content_type || 'NULL'}`);
  });
  
  if (!corruptLessons || corruptLessons.length === 0) {
    console.log('\n✅ No corrupt lessons found!');
    return;
  }
  
  // Delete corrupt lessons
  const { error: deleteError } = await supabase
    .from('course_lessons')
    .delete()
    .or('title.is.null,content_type.is.null');
  
  if (deleteError) {
    console.error('\n❌ Error deleting corrupt lessons:', deleteError);
    return;
  }
  
  console.log(`\n✅ Successfully deleted ${corruptLessons.length} corrupt lessons!`);
  console.log('\n📝 Please refresh your browser to see the changes.');
}

cleanupDatabase();
