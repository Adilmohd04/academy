#!/bin/bash

# Migration Script - Add course_type column
# Run this script to add the course_type column to your database

echo -e "\033[0;36mStarting database migration: Add course_type column\033[0m"
echo "=========================================="

# Check if .env file exists
if [ ! -f "../.env" ]; then
    echo -e "\033[0;31mError: .env file not found. Please create it first.\033[0m"
    exit 1
fi

# Load environment variables
export $(cat ../.env | grep -v '^#' | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo -e "\033[0;31mError: DATABASE_URL not found in .env file\033[0m"
    exit 1
fi

echo -e "\033[0;32mDatabase URL found\033[0m"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "\033[0;31mError: PostgreSQL client (psql) not found. Please install PostgreSQL.\033[0m"
    exit 1
fi

echo -e "\033[0;32mPostgreSQL client found\033[0m"

# Run the migration
echo -e "\n\033[0;33mRunning migration...\033[0m"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATION_FILE="$SCRIPT_DIR/migrations/add_course_type_column.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "\033[0;31mError: Migration file not found at $MIGRATION_FILE\033[0m"
    exit 1
fi

if psql "$DATABASE_URL" -f "$MIGRATION_FILE"; then
    echo -e "\n\033[0;32m✓ Migration completed successfully!\033[0m"
    echo -e "\033[0;32mThe course_type column has been added to the courses table.\033[0m"
else
    echo -e "\n\033[0;31m✗ Migration failed\033[0m"
    exit 1
fi

echo -e "\n\033[0;36mMigration process complete.\033[0m"
