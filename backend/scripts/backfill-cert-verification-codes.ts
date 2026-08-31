/**
 * Backfill public verification credentials for legacy certificates.
 *
 * A complete certificate needs both:
 *   - `verification_code`: an opaque 60-bit CSPRNG credential
 *   - `qr_code_url`: a QR image that resolves to that exact public URL
 *
 * This script never changes certificate status, issue dates, scores, template
 * snapshots, or revocation fields. It only repairs incomplete credentials:
 *
 *   1. Valid code + missing QR -> generate the missing QR for that code.
 *   2. Missing/malformed code -> mint a fresh code and matching QR together.
 *
 * A database partial unique index on `verification_code` remains the final
 * collision guard. Conditional updates make concurrent runs idempotent: a
 * row changed by another run is skipped rather than overwritten.
 *
 * Usage (from backend/):
 *   npx ts-node scripts/backfill-cert-verification-codes.ts --dry-run
 *   npx ts-node scripts/backfill-cert-verification-codes.ts
 *
 * Required environment:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Apply `database/migrations/certificate_designer_studio.sql` and then
 * `database/migrations/20260727_certificate_contract_alignment.sql` first.
 * Together they add the verification/QR columns and unique partial index used
 * by this job, and align the certificate identity/schema contract.
 */

import { supabase } from '../src/config/database';
import {
  generateVerificationCode,
  VERIFICATION_CODE_FORMAT_REGEX,
  verificationUrlForCode,
} from '../src/modules/certificate/services/verificationCode';
import { generateVerificationQrDataUrl } from '../src/modules/certificate/services/verificationQr';

const BATCH_SIZE = 100;
const MAX_COLLISION_RETRIES = 10;

interface LegacyCertificateRow {
  id: string;
  verification_code: string | null;
  qr_code_url: string | null;
}

export interface BackfillSummary {
  scanned: number;
  updated: number;
  skipped: number;
  raced: number;
  codesCreated: number;
  qrCreated: number;
  wouldUpdate: number;
}

export interface BackfillOptions {
  dryRun?: boolean;
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

/** Only an already-normalized code is safe to preserve as a public credential. */
function isValidStoredCode(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value === value.trim().toUpperCase() &&
    VERIFICATION_CODE_FORMAT_REGEX.test(value)
  );
}

function conditionalCodeUpdate(
  certificateId: string,
  expectedCode: string | null,
  payload: Record<string, string>,
) {
  let query = supabase
    .from('certificates')
    .update(payload)
    .eq('id', certificateId);

  if (expectedCode === null) {
    query = query.is('verification_code', null);
  } else {
    query = query.eq('verification_code', expectedCode);
  }

  return query;
}

function conditionalQrUpdate(
  certificateId: string,
  verificationCode: string,
  expectedQr: string | null,
  qrCodeUrl: string,
) {
  let query = supabase
    .from('certificates')
    .update({ qr_code_url: qrCodeUrl })
    .eq('id', certificateId)
    .eq('verification_code', verificationCode);

  if (expectedQr === null) {
    query = query.is('qr_code_url', null);
  } else {
    query = query.eq('qr_code_url', expectedQr);
  }

  return query;
}

/**
 * Create a new code and matching QR together. `expectedCode` makes the update
 * compare-and-set, so a concurrent job cannot be overwritten.
 */
export async function assignCodeWithRetry(
  certificateId: string,
  expectedCode: string | null = null,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const candidate = generateVerificationCode();

    // Avoid most collisions before doing the more expensive QR generation.
    const { data: collision, error: collisionError } = await supabase
      .from('certificates')
      .select('id')
      .eq('verification_code', candidate)
      .maybeSingle();

    if (collisionError) {
      throw new Error(`Could not check verification-code uniqueness: ${collisionError.message}`);
    }
    if (collision) continue;

    const qrCodeUrl = await generateVerificationQrDataUrl(verificationUrlForCode(candidate));
    const { data, error } = await conditionalCodeUpdate(certificateId, expectedCode, {
      verification_code: candidate,
      qr_code_url: qrCodeUrl,
    })
      .select('id, verification_code')
      .maybeSingle();

    if (error) {
      // PostgreSQL unique-violation code forwarded by Supabase.
      if (String((error as any).code || (error as any).details || '').includes('23505')) {
        continue;
      }
      throw new Error(
        `Failed to update certificate ${certificateId} (attempt ${attempt + 1}): ${error.message}`,
      );
    }

    // A different worker changed this row after we read it. Treat that as a
    // harmless race and let a later run repair it if it is still incomplete.
    if (!data) return '';
    return data.verification_code as string;
  }

  throw new Error(
    `Could not assign a unique verification code to certificate ${certificateId} after ${MAX_COLLISION_RETRIES} retries`,
  );
}

/** Generate a QR image for a valid, unchanged verification code. */
export async function assignQrForExistingCode(
  certificateId: string,
  verificationCode: string,
  expectedQr: string | null,
): Promise<boolean> {
  const qrCodeUrl = await generateVerificationQrDataUrl(verificationUrlForCode(verificationCode));
  const { data, error } = await conditionalQrUpdate(
    certificateId,
    verificationCode,
    expectedQr,
    qrCodeUrl,
  )
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to generate QR for certificate ${certificateId}: ${error.message}`);
  }

  return !!data;
}

export async function backfill(options: BackfillOptions = {}): Promise<BackfillSummary> {
  const summary: BackfillSummary = {
    scanned: 0,
    updated: 0,
    skipped: 0,
    raced: 0,
    codesCreated: 0,
    qrCreated: 0,
    wouldUpdate: 0,
  };
  let lastId: string | null = null;

  // Scan in stable ID order instead of filtering only NULL values. This also
  // repairs empty/malformed legacy strings without risking PostgREST filter
  // syntax differences across deployed Supabase versions.
  for (;;) {
    let query = supabase
      .from('certificates')
      .select('id, verification_code, qr_code_url')
      .order('id', { ascending: true })
      .limit(BATCH_SIZE);

    if (lastId) {
      query = query.gt('id', lastId);
    }

    const { data: batch, error } = await query;
    if (error) {
      throw new Error(
        `Unable to read certificates. Confirm the Phase 8 migration is applied: ${error.message}`,
      );
    }
    if (!batch || batch.length === 0) break;

    for (const rawRow of batch as LegacyCertificateRow[]) {
      summary.scanned++;
      const existingCode = rawRow.verification_code;
      const hasValidCode = isValidStoredCode(existingCode);
      const hasQr = !isBlank(rawRow.qr_code_url);

      if (hasValidCode && hasQr) {
        summary.skipped++;
        continue;
      }

      if (options.dryRun) {
        summary.wouldUpdate++;
        continue;
      }

      if (hasValidCode) {
        // Preserve a valid public link and only repair its absent QR image.
        const updated = await assignQrForExistingCode(
          rawRow.id,
          existingCode,
          rawRow.qr_code_url,
        );
        if (updated) {
          summary.updated++;
          summary.qrCreated++;
        } else {
          summary.raced++;
        }
        continue;
      }

      // A missing or malformed credential cannot be safely verified. Replace
      // it with a fresh CSPRNG code and a QR for that code in the same update.
      const createdCode = await assignCodeWithRetry(rawRow.id, existingCode);
      if (createdCode) {
        summary.updated++;
        summary.codesCreated++;
        summary.qrCreated++;
      } else {
        summary.raced++;
      }
    }

    lastId = (batch[batch.length - 1] as LegacyCertificateRow).id;
    if (batch.length < BATCH_SIZE) break;
  }

  return summary;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  console.log(dryRun ? 'Checking legacy certificate verification data...' : 'Backfilling certificate verification data...');

  const start = Date.now();
  const summary = await backfill({ dryRun });
  const elapsed = Date.now() - start;

  console.log('');
  console.log('=== Certificate verification backfill ===');
  console.log(`  Scanned:       ${summary.scanned}`);
  console.log(`  Complete:      ${summary.skipped}`);
  console.log(`  Updated:       ${summary.updated}`);
  console.log(`  Codes created: ${summary.codesCreated}`);
  console.log(`  QRs created:   ${summary.qrCreated}`);
  console.log(`  Raced:         ${summary.raced}`);
  if (dryRun) console.log(`  Would update:  ${summary.wouldUpdate}`);
  console.log(`  Duration:      ${elapsed}ms`);
  console.log('');
  console.log(dryRun ? 'Dry run complete. No certificates were changed.' : 'Backfill complete. Re-running is safe.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Certificate verification backfill failed:', error);
    process.exit(1);
  });
}
