/**
 * Environment Configuration
 * 
 * Centralized configuration management.
 * All environment variables are validated and exported here.
 * Now loads from root .env for single source of truth.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  port: number;
  nodeEnv: string;
  clerkSecretKey: string;
  clerkPublishableKey: string;
  /**
   * Secret used only by a trusted server-to-server auth bridge. It must never
   * be exposed to browsers (for example through a NEXT_PUBLIC_ variable).
   */
  internalAuthSharedSecret: string;
  corsOrigin: string;
  frontendUrl: string;
  /**
   * Canonical public origin/root used in QR-backed certificate verification
   * links. It is intentionally separate from the API URL.
   */
  verificationPortalUrl: string;
  /**
   * Explicitly configured reverse-proxy hops/CIDRs. `false` is deliberately
   * the safe default so arbitrary client X-Forwarded-For headers are ignored.
   */
  trustProxy: false | number | string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  verificationRateLimitWindowMs: number;
  verificationRateLimitMaxRequests: number;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Never default to `true`: that would trust a forwarded IP supplied by a
 * client when the backend is reachable directly. Operators must name their
 * proxy hop count or proxy CIDRs explicitly.
 */
function parseTrustProxy(value: string | undefined): false | number | string[] {
  const raw = value?.trim();
  if (!raw || /^(false|off|no|0)$/i.test(raw)) return false;

  if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10);

  const entries = raw.split(',').map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0 || entries.some((entry) => /^(true|all|\*)$/i.test(entry))) {
    console.warn('[config] Ignoring unsafe TRUST_PROXY value. Configure a numeric hop count or explicit proxy CIDRs.');
    return false;
  }

  return entries;
}

const config: Config = {
  port: parseInt(process.env.PORT || '5000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
  internalAuthSharedSecret: process.env.INTERNAL_AUTH_SHARED_SECRET || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3000',
  verificationPortalUrl: process.env.VERIFICATION_PORTAL_URL?.trim() || '',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  rateLimitWindowMs: positiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 900000),
  rateLimitMaxRequests: positiveInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
  verificationRateLimitWindowMs: positiveInteger(process.env.VERIFICATION_RATE_LIMIT_WINDOW_MS, 60_000),
  verificationRateLimitMaxRequests: positiveInteger(process.env.VERIFICATION_RATE_LIMIT_MAX_REQUESTS, 60),
};

// Validate required environment variables
const validateConfig = () => {
  const requiredVars = ['CLERK_SECRET_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Please copy .env.example to .env and configure all required variables.');
  }

  if (config.nodeEnv === 'production' && !config.verificationPortalUrl) {
    console.warn(
      'Warning: VERIFICATION_PORTAL_URL is required to issue QR-backed certificates in production. Certificate issuance will refuse to create a localhost verification link.',
    );
  }
};

validateConfig();

export default config;
