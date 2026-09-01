import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('\x1b[36m%s\x1b[0m', 'Starting database migration: Add course_type column');
        console.log('==========================================\n');

        const client = await pool.connect();

        console.log('\x1b[32m%s\x1b[0m', '✓ Connected to database');

        // Check if column already exists
        const checkResult = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'courses' AND column_name = 'course_type';
        `);

        if (checkResult.rows.length > 0) {
            console.log('\x1b[33m%s\x1b[0m', '\n⚠️  course_type column already exists!');
            client.release();
            pool.end();
            return;
        }

        console.log('\x1b[33m%s\x1b[0m', '\nRunning migration...');

        // Add the course_type column
        await client.query(`
            ALTER TABLE courses 
            ADD COLUMN course_type VARCHAR(50) DEFAULT 'pre-recorded' 
            CHECK (course_type IN ('pre-recorded', 'live', 'hybrid'));
        `);

        console.log('\x1b[32m%s\x1b[0m', '✓ Added course_type column');

        // Update existing courses
        await client.query(`
            UPDATE courses 
            SET course_type = 'pre-recorded' 
            WHERE course_type IS NULL;
        `);

        console.log('\x1b[32m%s\x1b[0m', '✓ Updated existing courses');

        // Add comment
        await client.query(`
            COMMENT ON COLUMN courses.course_type IS 'Course delivery format: pre-recorded (self-paced), live (scheduled classes), or hybrid (combination)';
        `);

        console.log('\x1b[32m%s\x1b[0m', '✓ Added column documentation');

        // Verify the migration
        const verifyResult = await client.query(`
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'courses' AND column_name = 'course_type';
        `);

        console.log('\x1b[32m%s\x1b[0m', '\n✓ Migration completed successfully!');
        console.log('\nColumn details:');
        console.log(verifyResult.rows[0]);

        client.release();
        await pool.end();

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', `\n✗ Migration failed: ${error.message}`);
        
        if (error.code === '42701') {
            console.log('\x1b[33m%s\x1b[0m', '\n⚠️  Column already exists. Migration not needed.');
        } else {
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
        }
        
        await pool.end();
        process.exit(1);
    }

    console.log('\x1b[36m%s\x1b[0m', '\nMigration process complete.');
}

runMigration();
