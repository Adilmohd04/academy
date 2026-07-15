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

export const VERIFICATION_CODE_BITS = CODE_LENGTH * Math.log2(ALPHABET.length); // 60
export const VERIFICATION_CODE_FORMAT_REGEX = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
