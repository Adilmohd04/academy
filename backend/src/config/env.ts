/**
 * Environment Configuration
 * 
 * Centralized configuration management.
 * All environment variables are validated and exported here.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory (one level up from backend)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface Config {
  port: number;
  nodeEnv: string;
  clerkSecretKey: string;
  clerkPublishableKey: string;
  corsOrigin: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

const config: Config = {
  port: parseInt(process.env.PORT || '5000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
};

// Validate required environment variables
const validateConfig = () => {
  const requiredVars = ['CLERK_SECRET_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Please copy .env.example to .env and configure all required variables.');
  }
};

validateConfig();

export default config;
