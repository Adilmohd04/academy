/**
 * Certificate issuance backstop job.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §8.3, Task 20.3.
 *
 * The real-time hooks (after final-exam grading and after the last required
 * lesson is completed) handle the common case within the 60s SLA. This cron
 * is the safety net that catches anything the hooks missed — server restart
 * mid-request, a manually-entered grade that didn't go through the hook, a
 * race condition, etc.
 *
 * Every 15 minutes it finds enrollments that are complete (progress = 100%
 * or completed = true) in certificate-enabled courses that DON'T yet have a
 * certificate, and runs the idempotent `checkAndAwardCertificate`.
 *
 * `checkAndAwardCertificate` itself re-runs the full eligibility gate, so the
 * backstop never issues a certificate to an ineligible student — it just
 * retries the ones that should have one but don't.
 */

import cron from 'node-cron';
import { supabase } from '../config/database';
import { checkAndAwardCertificate } from '../modules/certificate/services/issuanceService';

const BATCH_LIMIT = 200; // cap work per run so we never hammer the DB

let running = false;

export async function runCertificateBackstopOnce(): Promise<{ scanned: number; issued: number }> {
  let scanned = 0;
  let issued = 0;

  // Completed enrollments in certificate-enabled courses.
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('course_id, student_id, completed, progress_percentage, courses!inner(enable_certificates)')
    .eq('courses.enable_certificates', true)
    .or('completed.eq.true,progress_percentage.gte.100')
    .limit(BATCH_LIMIT);

  if (error) {
    console.error('[cert-backstop] failed to fetch completed enrollments:', error.message);
    return { scanned, issued };
  }

  for (const enrollment of enrollments ?? []) {
    const courseId = (enrollment as any).course_id as string;
    const studentId = (enrollment as any).student_id as string;
    if (!courseId || !studentId) continue;

    scanned++;

    // Skip if a certificate already exists (cheap pre-check before the heavier
    // eligibility computation inside checkAndAwardCertificate).
    const { data: existing } = await supabase
      .from('certificates')
      .select('id')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .maybeSingle();
    if (existing) continue;

    const result = await checkAndAwardCertificate(courseId, studentId);
    if (result.ok && !result.alreadyIssued) {
      issued++;
      console.log(`[cert-backstop] issued certificate for course=${courseId} student=${studentId}`);
    }
  }

  return { scanned, issued };
}

/**
 * Register the cron schedule. Call once at server startup.
 * Runs at minute 0,15,30,45 of every hour.
 */
export function startCertificateBackstopJob(): void {
  cron.schedule('*/15 * * * *', async () => {
    if (running) {
      console.warn('[cert-backstop] previous run still in progress; skipping this tick');
      return;
    }
    running = true;
    try {
      const { scanned, issued } = await runCertificateBackstopOnce();
      if (issued > 0) {
        console.log(`[cert-backstop] run complete — scanned ${scanned}, issued ${issued}`);
      }
    } catch (err) {
      console.error('[cert-backstop] run failed:', err);
    } finally {
      running = false;
    }
  });
  console.log('🎓 Certificate issuance backstop job scheduled (every 15 minutes)');
}
