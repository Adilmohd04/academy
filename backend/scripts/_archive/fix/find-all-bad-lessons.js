import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findAllBadLessons() {
  console.log('🔍 Searching for ALL lessons with bad data...\n');
  
  // Get ALL lessons from the course
  const { data: allLessons, error } = await supabase
    .from('course_lessons')
    .select('*')
    .eq('week_id', 'cafe6a62-2edb-4aef-b724-4cb41dba74b5')
    .order('order_index', { ascending: true });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`📊 Total lessons found: ${allLessons.length}\n`);
  
  let badCount = 0;
  
  allLessons.forEach((lesson, index) => {
    const issues = [];
    
    if (!lesson.title || lesson.title === 'undefined' || lesson.title === null) {
      issues.push('BAD TITLE');
    }
    
    if (!lesson.content_type || lesson.content_type === 'undefined' || lesson.content_type === null) {
      issues.push('BAD CONTENT_TYPE');
    }
    
    if (lesson.title === 'Untitled') {
      issues.push('UNTITLED');
    }
    
    if (lesson.content_type === 'resource' && lesson.title.includes('New')) {
      issues.push('SUSPICIOUS (New resource)');
    }
    
    if (issues.length > 0) {
      badCount++;
      console.log(`❌ ${index}. ID: ${lesson.id}`);
      console.log(`   Title: "${lesson.title}"`);
      console.log(`   Type: "${lesson.content_type}"`);
      console.log(`   Order: ${lesson.order_index}`);
      console.log(`   Issues: ${issues.join(', ')}`);
      console.log('');
    } else {
      console.log(`✅ ${index}. "${lesson.title}" (${lesson.content_type}) - order: ${lesson.order_index}`);
    }
  });
  
  console.log(`\n📈 Summary: ${badCount} bad lessons out of ${allLessons.length} total`);
  
  if (badCount > 0) {
    console.log('\n🗑️ Delete bad lessons? (run delete script separately)');
  } else {
    console.log('\n✨ All lessons look good!');
  }
}

findAllBadLessons();
