# Database Migration: Add course_type Column

This migration adds the `course_type` column to the `courses` table to support different course delivery formats.

## Course Types

- **pre-recorded**: Self-paced courses with pre-recorded videos
- **live**: Scheduled live classes with real-time interaction  
- **hybrid**: Combination of pre-recorded content and live sessions

## Running the Migration

### On Windows (PowerShell):

```powershell
cd backend/database
.\run-migration.ps1
```

### On Linux/Mac (Bash):

```bash
cd backend/database
chmod +x run-migration.sh
./run-migration.sh
```

### Manual Migration (using psql):

```bash
psql "your-database-url" -f migrations/add_course_type_column.sql
```

### Using Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `migrations/add_course_type_column.sql`
4. Paste and run the SQL

## What This Migration Does

1. Adds `course_type` column to `courses` table
2. Sets default value to 'pre-recorded' for existing courses
3. Adds a CHECK constraint to ensure only valid values are used
4. Adds documentation comment to the column

## Verification

After running the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'courses' AND column_name = 'course_type';

-- View all courses with their types
SELECT id, title, course_type FROM courses;
```

## Rollback (if needed)

To remove the column:

```sql
ALTER TABLE courses DROP COLUMN IF EXISTS course_type;
```

**Note**: This will permanently delete the course_type data!
