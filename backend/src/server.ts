/**
 * Server Entry Point
 * 
 * Starts the Express application.
 */

// Disable SSL verification for corporate proxy environments.
// In real production with proper certs, set ALLOW_SELF_SIGNED_CERTS=false.
if (process.env.ALLOW_SELF_SIGNED_CERTS !== 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// ── Raise Node.js HTTP agent limits ──────────────────────────────────
// Default maxSockets is Infinity, but the DNS resolver and OS ephemeral
// port range can still bottleneck.  Keep-alive avoids tearing down / \n// re-establishing TCP+TLS on every Supabase call.
import http from 'http';
import https from 'https';
http.globalAgent  = new http.Agent({ keepAlive: true, maxSockets: 256, maxFreeSockets: 64 });
https.globalAgent = new https.Agent({ keepAlive: true, maxSockets: 256, maxFreeSockets: 64 });

import App from './app';
import { supabase } from './config/database';
import autoApprovalCronJob from './jobs/autoApprovalCron';
import { startMeetingStatusJob } from './jobs/updateMeetingStatus';
import { autoPublishContent } from './jobs/autoPublishContent';
import { isCalendarConfigured } from './modules/shared/services/calendarService';
import cluster from 'cluster';
import os from 'os';
import type { Server } from 'http';

const shouldUseCluster = process.env.NODE_ENV === 'production' && process.env.ENABLE_CLUSTER !== 'false';

const startWorker = async () => {
  let server: Server | null = null;
  const workerId = cluster.isWorker ? cluster.worker?.id : 1;
  const shouldRunBackgroundJobs = !cluster.isWorker || workerId === 1;

  if (!shouldRunBackgroundJobs) {
    process.env.SKIP_STARTUP_EMAIL_CHECK = 'true';
  }

  console.log('✅ Starting server initialization...');

  try {
    const app = new App();
    console.log('✅ App instance created');

    // Start server
    server = await app.listen();
    console.log('✅ Listen method called');

    if (shouldRunBackgroundJobs) {
      // Start meeting status update job
      startMeetingStatusJob();
      console.log('⏰ Meeting status update job started (runs every 24 hours)');

      // Start auto-publish job (runs every 5 minutes)
      setInterval(async () => {
        await autoPublishContent();
      }, 5 * 60 * 1000); // Every 5 minutes
      console.log('⏰ Auto-publish job started (runs every 5 minutes)');
    } else {
      console.log(`⏭️ Background jobs disabled on worker ${workerId} (primary job worker is 1)`);
    }

    // TEMPORARILY DISABLED: Auto-approval cron job (causing connection issues)
    // autoApprovalCronJob.start();
    // console.log('⏰ Auto-approval cron job started (runs every minute)');

    // TEMPORARILY DISABLED: Cleanup cron job (causing connection issues)
    /*
  setInterval(async () => {
    try {
      const { data: count, error } = await supabase.rpc('cleanup_expired_reservations');
      if (error) {
        // Only log if it's not a "function does not exist" error
        if (error.code !== 'PGRST202' && error.code !== '42883') {
          console.error('❌ Error cleaning up reservations:', {
            message: error.message,
            code: error.code
          });
        }
      } else if (count && count > 0) {
        console.log(`🧹 Cleaned up ${count} expired temporary reservation(s)`);
      }
    } catch (err: any) {
      // Only log unexpected errors, not missing function errors
      if (err.message && !err.message.includes('does not exist') && !err.message.includes('fetch failed')) {
        console.error('❌ Cleanup cron error:', err.message);
      }
    }
  }, 10 * 60 * 1000); // Every 10 minutes

  console.log('⏰ Reservation cleanup cron job started (runs every 10 minutes)');
  */

    // Log Google Calendar configuration status
    if (isCalendarConfigured()) {
      console.log('📅 Google Calendar: configured ✅ (real Google Meet links will be created)');
    } else {
      console.warn('📅 Google Calendar: NOT configured ⚠️  Using pseudo Meet-style links.');
      console.warn('    Set GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_IMPERSONATED_USER in .env to enable real Google Meet scheduling.');
    }
  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  }

  const gracefulShutdown = (signal: string) => {
    console.log(`⚠️ Received ${signal}. Closing HTTP server gracefully...`);
    if (!server) {
      process.exit(0);
      return;
    }

    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('❌ Force shutdown after timeout');
      process.exit(1);
    }, 15000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // ── Memory guard ──────────────────────────────────────────────
  // If a worker's heap exceeds the threshold it stops accepting new
  // connections and exits.  The cluster primary will immediately fork
  // a fresh worker so there is zero downtime.
  const HEAP_LIMIT_MB = parseInt(process.env.WORKER_HEAP_LIMIT_MB || '512', 10);
  setInterval(() => {
    const heapMB = process.memoryUsage().heapUsed / 1024 / 1024;
    if (heapMB > HEAP_LIMIT_MB) {
      console.warn(`⚠️  Worker ${workerId} heap ${Math.round(heapMB)} MB > ${HEAP_LIMIT_MB} MB limit — restarting`);
      gracefulShutdown('HEAP_LIMIT');
    }
  }, 15_000).unref();
};

if (shouldUseCluster && cluster.isPrimary) {
  const workerCount = parseInt(process.env.WEB_CONCURRENCY || '', 10) || Math.max(2, Math.min(os.cpus().length, 8));
  console.log(`🧩 Cluster mode enabled: starting ${workerCount} workers`);

  for (let i = 0; i < workerCount; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(`❌ Worker ${worker.process.pid} exited (code=${code}, signal=${signal}). Restarting...`);
    cluster.fork();
  });
} else {
  startWorker();
}

// Handle unhandled promise rejections — log but do NOT crash in production
// (the cluster primary will restart the worker anyway)
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Promise Rejection:', err?.message || err);
  if (process.env.NODE_ENV !== 'production') {
    console.error('Stack:', err?.stack);
  }
  // Do NOT process.exit() — let the worker keep serving.
  // If memory starts leaking the heap guard above will restart it.
});

// Handle uncaught exceptions — in production kill only this worker; primary respawns it
process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err?.message || err);
  console.error('Stack:', err?.stack);
  if (process.env.NODE_ENV === 'production' && cluster.isWorker) {
    // Graceful: stop accepting, then exit so primary can fork a fresh worker
    console.error('💀 Worker exiting after uncaught exception...');
    process.exit(1);
  }
});
