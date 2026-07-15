import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        console.log('\x1b[36m%s\x1b[0m', 'Starting database migration: Add course_type column');
        console.log('==========================================');

        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', 'add_course_type_column.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('\x1b[33m%s\x1b[0m', '\nRunning migration...');

        // Execute the migration using Supabase
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: migrationSQL
        });

        if (error) {
            // If exec_sql RPC doesn't exist, try direct SQL execution
            console.log('\x1b[33m%s\x1b[0m', 'Trying direct SQL execution...');
            
            // Split SQL into individual statements and execute them
            const statements = migrationSQL
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

            for (const statement of statements) {
                const { error: execError } = await supabase.rpc('exec_sql', {
                    sql: statement + ';'
                });

                if (execError) {
                    console.error('\x1b[31m%s\x1b[0m', `Error executing statement: ${execError.message}`);
                    console.log('\x1b[33m%s\x1b[0m', '\n⚠️  If this fails, please run the migration manually through Supabase dashboard');
                    console.log('\x1b[33m%s\x1b[0m', '1. Go to: https://supabase.com/dashboard/project/ufmxviifrjubkhpywcpo/sql/new');
                    console.log('\x1b[33m%s\x1b[0m', '2. Copy the SQL from: backend/database/migrations/add_course_type_column.sql');
                    console.log('\x1b[33m%s\x1b[0m', '3. Paste and run it in the SQL editor');
                    process.exit(1);
                }
            }
        }

        console.log('\x1b[32m%s\x1b[0m', '\n✓ Migration completed successfully!');
        console.log('\x1b[32m%s\x1b[0m', 'The course_type column has been added to the courses table.');

        // Verify the migration
        console.log('\x1b[33m%s\x1b[0m', '\nVerifying migration...');
        const { data: columns, error: verifyError } = await supabase
            .from('courses')
            .select('*')
            .limit(1);

        if (verifyError) {
            console.log('\x1b[33m%s\x1b[0m', '⚠️  Could not verify migration, but it may have succeeded.');
        } else {
            console.log('\x1b[32m%s\x1b[0m', '✓ Migration verified successfully!');
        }

    } catch (err) {
        console.error('\x1b[31m%s\x1b[0m', `\n✗ Migration failed: ${err.message}`);
        console.log('\x1b[33m%s\x1b[0m', '\n📋 Please run the migration manually:');
        console.log('\x1b[33m%s\x1b[0m', '1. Go to: https://supabase.com/dashboard/project/ufmxviifrjubkhpywcpo/sql/new');
        console.log('\x1b[33m%s\x1b[0m', '2. Copy and paste this SQL:\n');
        console.log('\x1b[36m%s\x1b[0m', `
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS course_type VARCHAR(50) DEFAULT 'pre-recorded' 
CHECK (course_type IN ('pre-recorded', 'live', 'hybrid'));

UPDATE courses 
SET course_type = 'pre-recorded' 
WHERE course_type IS NULL;
        `);
        process.exit(1);
    }

    console.log('\x1b[36m%s\x1b[0m', '\nMigration process complete.');
}

runMigration();
