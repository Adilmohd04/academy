/**
 * Verification code generator.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §8.1, Property 11.
 *
 * Generates XXXX-XXXX-XXXX style codes with ≥60 bits of entropy from a
 * cryptographic random source. Used by both:
 *   - the issuance engine when minting a brand-new certificate
 *   - the one-shot backfill script for legacy rows
 *
 * The two are kept in sync by sharing this module (the script imports
 * from here as well, see `backend/scripts/backfill-cert-verification-codes.ts`).
 */

import { randomBytes } from 'crypto';
import config from '../../../config/env';

// 32 unambiguous characters (no I, O, 0, 1) — log2(32) = 5 bits per char.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 12; // 12 chars × 5 bits = 60 bits entropy
const GROUP_SIZE = 4;

/**
 * Generate a single verification code in `XXXX-XXXX-XXXX` format.
 *
 * Uses rejection sampling so the alphabet stays uniformly distributed even
 * though 256 (a byte) is not divisible by 32 (the alphabet size).
 */
export function generateVerificationCode(): string {
  const chars: string[] = [];
  // Largest multiple of 32 that fits in a byte: 256 (256 / 32 * 32). Bytes
  // ≥ acceptableMax are rejected to avoid modulo bias.
  const acceptableMax = Math.floor(256 / ALPHABET.length) * ALPHABET.length;

  let buffer = randomBytes(CODE_LENGTH * 2);
  let cursor = 0;

  while (chars.length < CODE_LENGTH) {
    if (cursor >= buffer.length) {
      buffer = randomBytes(CODE_LENGTH * 2);
      cursor = 0;
    }
    const byte = buffer[cursor++];
    if (byte >= acceptableMax) continue;
    chars.push(ALPHABET[byte % ALPHABET.length]);
  }

  const groups: string[] = [];
  for (let i = 0; i < chars.length; i += GROUP_SIZE) {
    groups.push(chars.slice(i, i + GROUP_SIZE).join(''));
  }
  return groups.join('-');
}

/**
 * Build the one public URL that QR codes and certificate PDFs point to.
 *
 * `VERIFICATION_PORTAL_URL` may be configured either as the application
 * origin (`https://academy.example`) or as the verification root
 * (`https://academy.example/verify`). In production it is required and must
 * be a public HTTPS URL. Keeping this here prevents individual issuance paths
 * from silently producing QR codes for different domains or localhost.
 */
export function verificationUrlForCode(code: string): string {
  if (!VERIFICATION_CODE_FORMAT_REGEX.test(code)) {
    throw new Error('Cannot create a verification URL for an invalid verification code');
  }

  // Read the explicit environment variable at call time so scripts/tests can
  // set it before issuance. The config value is the process-start fallback.
  const configuredBase = process.env.VERIFICATION_PORTAL_URL?.trim() || config.verificationPortalUrl;
  const isProduction = process.env.NODE_ENV === 'production' || config.nodeEnv === 'production';

  if (!configuredBase) {
    if (isProduction) {
      throw new Error('VERIFICATION_PORTAL_URL must be configured in production before issuing certificates');
    }

    const developmentBase = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    return verificationUrlFromBase(developmentBase, code, false);
  }

  return verificationUrlFromBase(configuredBase, code, isProduction);
}

function verificationUrlFromBase(base: string, code: string, requireHttps: boolean): string {
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error('VERIFICATION_PORTAL_URL must be an absolute http(s) URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('VERIFICATION_PORTAL_URL must use http or https');
  }
  if (requireHttps && url.protocol !== 'https:') {
    throw new Error('VERIFICATION_PORTAL_URL must use HTTPS in production');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('VERIFICATION_PORTAL_URL must not contain credentials, a query string, or a fragment');
  }

  const existingPath = url.pathname.replace(/\/+$/, '');
  url.pathname = !existingPath || existingPath === '/'
    ? '/verify'
    : existingPath.toLowerCase().endsWith('/verify')
      ? existingPath
      : `${existingPath}/verify`;
  url.search = '';
  url.hash = '';
  const verificationRoot = url.toString().replace(/\/$/, '');

  return `${verificationRoot}/${encodeURIComponent(code)}`;
}

export const VERIFICATION_CODE_BITS = CODE_LENGTH * Math.log2(ALPHABET.length); // 60
export const VERIFICATION_CODE_FORMAT_REGEX = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
