/**
 * Backfill verification_code on certificates that don't have one.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Phase 1, Task 2.
 *
 * Why this exists:
 *   - The `verification_code` column was added in
 *     `certificate_designer_studio.sql` (Phase 1 migration).
 *   - Pre-existing certificate rows have `verification_code IS NULL`.
 *   - The new public verification portal looks up certificates by code, so
 *     every active certificate needs one for QR scans and public verification
 *     to work after Phase 4 ships.
 *
 * Properties guaranteed by this script:
 *   - At least 60 bits of entropy per code (Requirement 14.1, Property 11).
 *     We draw 12 random characters from a 32-character alphabet, giving
 *     12 * log2(32) = 60 bits of entropy.
 *   - Pairwise uniqueness (Requirement 14.2, Property 11). Enforced by the
 *     partial unique index `idx_certificates_verification_code` plus an
 *     application-side collision retry loop.
 *   - Idempotence: rows that already have a code are skipped, so running the
 *     script twice is a no-op on the second run.
 *
 * Usage:
 *   npx ts-node backend/scripts/backfill-cert-verification-codes.ts
 *
 * Env required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   (loaded automatically via backend/src/config/database.ts)
 */

import { randomBytes } from 'crypto';
import { supabase } from '../src/config/database';

// Same alphabet used by the existing service (no I, O, 0, 1).
// 32 unambiguous characters → log2(32) = 5 bits per character.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 12; // 12 chars * 5 bits = 60 bits entropy
const GROUP_SIZE = 4;   // formatted XXXX-XXXX-XXXX
const BATCH_SIZE = 100;
const MAX_COLLISION_RETRIES = 10;

/**
 * Generate a single verification code in XXXX-XXXX-XXXX format.
 * Uses crypto.randomBytes (CSPRNG) so we get true ≥60-bit entropy.
 *
 * Implementation note: we draw bytes and reject ones that fall outside the
 * largest multiple of ALPHABET.length to avoid modulo bias.
 */
function generateVerificationCode(): string {
  const chars: string[] = [];
  const acceptableMax = Math.floor(256 / ALPHABET.length) * ALPHABET.length; // 256 // 32 * 32 = 256

  // Draw extra bytes so we almost never need a second draw even after rejection.
  let buffer = randomBytes(CODE_LENGTH * 2);
  let cursor = 0;

  while (chars.length < CODE_LENGTH) {
    if (cursor >= buffer.length) {
      buffer = randomBytes(CODE_LENGTH * 2);
      cursor = 0;
    }
    const byte = buffer[cursor++];
    if (byte >= acceptableMax) continue; // rejection sampling
    chars.push(ALPHABET[byte % ALPHABET.length]);
  }

  // Insert hyphens between groups: XXXX-XXXX-XXXX
  const groups: string[] = [];
  for (let i = 0; i < chars.length; i += GROUP_SIZE) {
    groups.push(chars.slice(i, i + GROUP_SIZE).join(''));
  }
  return groups.join('-');
}

/**
 * Insert a verification_code on a single certificate row, retrying on
 * collision. Throws after MAX_COLLISION_RETRIES.
 */
async function assignCodeWithRetry(certId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const candidate = generateVerificationCode();

    // Use a conditional update so two concurrent runs of this script can't
    // overwrite each other's writes. The unique index does the heavy lifting,
    // but `.is('verification_code', null)` cuts down on conflict noise.
    const { data, error } = await supabase
      .from('certificates')
      .update({ verification_code: candidate })
      .eq('id', certId)
      .is('verification_code', null)
      .select('id, verification_code')
      .maybeSingle();

    if (error) {
      // PostgreSQL unique-violation code (Supabase forwards the SQLSTATE).
      const sqlState = (error as any).code || (error as any).details || '';
      if (String(sqlState).includes('23505')) {
        // Code collided with another row (extremely rare at 60 bits, but possible).
        continue;
      }
      throw new Error(
        `Failed to update certificate ${certId} (attempt ${attempt + 1}): ${error.message}`
      );
    }

    if (!data) {
      // The row was already updated by a concurrent runner. Treat as success
      // and let the caller skip.
      return '';
    }

    return data.verification_code as string;
  }

  throw new Error(
    `Could not assign a unique verification code to certificate ${certId} after ${MAX_COLLISION_RETRIES} retries`
  );
}

interface BackfillSummary {
  scanned: number;
  updated: number;
  skipped: number; // already had a code
  raced: number;   // updated by a concurrent runner
}

async function backfill(): Promise<BackfillSummary> {
  const summary: BackfillSummary = { scanned: 0, updated: 0, skipped: 0, raced: 0 };
  let lastId: string | null = null;

  for (;;) {
    let query = supabase
      .from('certificates')
      .select('id, verification_code')
      .is('verification_code', null)
      .order('id', { ascending: true })
      .limit(BATCH_SIZE);

    if (lastId) {
      query = query.gt('id', lastId);
    }

    const { data: batch, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch certificates: ${error.message}`);
    }
    if (!batch || batch.length === 0) break;

    for (const row of batch) {
      summary.scanned++;
      if (row.verification_code) {
        summary.skipped++;
        continue;
      }
      const code = await assignCodeWithRetry(row.id);
      if (code) {
        summary.updated++;
      } else {
        summary.raced++;
      }
    }

    lastId = batch[batch.length - 1].id;

    // Safety break: if a batch returned all already-coded rows, the next
    // `is('verification_code', null)` filter will return an empty list, but
    // belt-and-braces — break if we somehow get a stuck cursor.
    if (batch.length < BATCH_SIZE) break;
  }

  return summary;
}

async function main(): Promise<void> {
  console.log('🔁 Backfilling certificates.verification_code …');
  const start = Date.now();
  const summary = await backfill();
  const ms = Date.now() - start;

  console.log('');
  console.log('=== Summary ===');
  console.log(`  Scanned:  ${summary.scanned}`);
  console.log(`  Updated:  ${summary.updated}`);
  console.log(`  Skipped:  ${summary.skipped} (already had a code)`);
  console.log(`  Raced:    ${summary.raced} (updated by a concurrent runner)`);
  console.log(`  Duration: ${ms}ms`);
  console.log('');
  console.log('✅ Backfill complete. Re-running this script is safe and will be a no-op.');
}

// Allow importing the helpers from tests without triggering the run.
if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Backfill failed:');
    console.error(err);
    process.exit(1);
  });
}

export { generateVerificationCode, assignCodeWithRetry, backfill, BackfillSummary };
