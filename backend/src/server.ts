/**
 * Server Entry Point
 * 
 * Starts the Express application.
 */

import App from './app';
import { supabase } from './config/database';
import autoApprovalCronJob from './jobs/autoApprovalCron';
import { isCalendarConfigured } from './services/calendarService';

console.log('✅ Starting server initialization...');

try {
  const app = new App();
  console.log('✅ App instance created');
  
  // Start server
  app.listen();
  console.log('✅ Listen method called');

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

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  console.error('Stack:', err.stack);
  // Don't exit in development - just log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  // Don't exit in development - just log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});
