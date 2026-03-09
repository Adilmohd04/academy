require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteUndefinedLesson() {
  console.log('🔍 Finding undefined lesson in Week 1...\n');
  
  // The undefined lesson appears at position 9 (between video and assignment)
  // Let's find it by checking for null title or content_type
  const { data: lessons, error } = await supabase
    .from('course_lessons')
    .select('*')
    .eq('week_id', 'cafe6a62-2edb-4aef-b724-4cb41dba74b5')
    .order('order_index');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('Found lessons:');
  lessons.forEach((l, i) => {
    console.log(`  ${i}. ${l.title || 'NULL'} (${l.content_type || 'NULL'}) - order: ${l.order_index}`);
  });
  
  // Find the undefined one
  const undefinedLesson = lessons.find(l => !l.title || !l.content_type);
  
  if (!undefinedLesson) {
    console.log('\n✅ No undefined lessons found!');
    return;
  }
  
  console.log(`\n🗑️  Deleting lesson: ${undefinedLesson.id}`);
  
  const { error: deleteError } = await supabase
    .from('course_lessons')
    .delete()
    .eq('id', undefinedLesson.id);
  
  if (deleteError) {
    console.error('❌ Delete error:', deleteError);
    return;
  }
  
  console.log('✅ Deleted undefined lesson!');
  console.log('\n📝 Refresh your browser to see changes.');
}

deleteUndefinedLesson();
