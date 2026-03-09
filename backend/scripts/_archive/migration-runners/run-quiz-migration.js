require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? '✓' : '✗');
console.log('Supabase Key:', supabaseKey ? '✓ (length: ' + supabaseKey.length + ')' : '✗');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = fs.readFileSync('./database/migrations/add_quiz_assignment_system.sql', 'utf8');

console.log('Running quiz/assignment system migration...');
console.log('SQL length:', sql.length);

// Try to execute via direct SQL
fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  },
  body: JSON.stringify({ query: sql })
})
.then(r => {
  console.log('Status:', r.status);
  return r.text();
})
.then(text => {
  console.log('Response:', text);
  console.log('\n✅ Migration complete!');
})
.catch(err => {
  console.error('❌ Migration failed:', err.message);
  console.log('\nNote: You may need to run this SQL manually in Supabase SQL Editor');
});
