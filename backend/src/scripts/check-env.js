#!/usr/bin/env node

/**
 * Environment Setup Script
 * 
 * Validates and sets up environment variables from root .env
 * Run this before starting the backend server
 */

const fs = require('fs');
const path = require('path');

const rootEnvPath = path.resolve(__dirname, '../../../.env');
const backendEnvPath = path.resolve(__dirname, '../../.env');

console.log('🔍 Checking environment configuration...\n');

// Check if root .env exists
if (!fs.existsSync(rootEnvPath)) {
  console.error('❌ Root .env file not found!');
  console.error(`   Expected location: ${rootEnvPath}`);
  console.error('\n💡 Please create a .env file in the root directory');
  console.error('   Copy from .env.example and fill in your values\n');
  process.exit(1);
}

// Check if backend .env exists (should be removed)
if (fs.existsSync(backendEnvPath)) {
  console.warn('⚠️  Backend .env file detected (should be removed)');
  console.warn(`   Location: ${backendEnvPath}`);
  console.warn('   The root .env file is now the single source of truth\n');
}

// Read and validate root .env
const envContent = fs.readFileSync(rootEnvPath, 'utf8');
const requiredVars = [
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'PORT',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET'
];

const missingVars = [];
requiredVars.forEach(varName => {
  if (!envContent.includes(varName)) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n💡 Please add these to your root .env file\n');
  process.exit(1);
}

console.log('✅ Environment configuration is valid!');
console.log('✅ All required variables are present');
console.log('\n🚀 You can now start the backend server with: npm run dev\n');
