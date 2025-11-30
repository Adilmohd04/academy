/**
 * Environment Variable Loader
 * 
 * Loads environment variables from root .env file for backend.
 * This ensures a single source of truth for all configuration.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load from backend .env file
const rootEnvPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: rootEnvPath });

if (result.error) {
  console.warn('⚠️  Warning: Could not load root .env file');
  console.warn(`   Expected path: ${rootEnvPath}`);
  console.warn('   Falling back to process.env or defaults');
}

// Validate critical environment variables
const requiredVars = [
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'PORT'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n💡 Please ensure your root .env file contains all required variables.');
}

export default process.env;
