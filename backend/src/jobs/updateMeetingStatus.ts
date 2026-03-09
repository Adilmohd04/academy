import { supabase } from '../config/database';

/**
 * Job to automatically update meeting statuses based on current date/time
 * This should run periodically (e.g., daily at midnight or every hour)
 */
export async function updateMeetingStatuses(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Update past meetings to completed
    const { data: completedMeetings, error: completedError } = await supabase
      .from('meeting_bookings')
      .update({ meeting_status: 'completed' })
      .lt('meeting_date', today)
      .in('meeting_status', ['upcoming', 'ongoing'])
      .select('id');

    if (completedError) throw completedError;

    console.log(`[Meeting Status Job] Updated ${completedMeetings?.length || 0} meetings to completed`);

    // Optional: Update ongoing meetings (if you want to track meetings happening today)
    const { data: ongoingMeetings, error: ongoingError } = await supabase
      .from('meeting_bookings')
      .update({ meeting_status: 'ongoing' })
      .eq('meeting_date', today)
      .eq('meeting_status', 'upcoming')
      .select('id');

    if (ongoingError) throw ongoingError;

    if (ongoingMeetings && ongoingMeetings.length > 0) {
      console.log(`[Meeting Status Job] Updated ${ongoingMeetings.length} meetings to ongoing`);
    }

  } catch (error) {
    console.error('[Meeting Status Job] Error updating meeting statuses:', error);
    throw error;
  }
}

/**
 * Initialize the scheduled job
 * Runs daily at midnight
 */
export function startMeetingStatusJob(): NodeJS.Timeout {
  // Run immediately on startup
  updateMeetingStatuses().catch(console.error);

  // Schedule to run every 24 hours (86400000 ms)
  const interval = setInterval(() => {
    updateMeetingStatuses().catch(console.error);
  }, 86400000); // 24 hours

  console.log('[Meeting Status Job] Scheduled to run every 24 hours');
  
  return interval;
}

// For manual execution
if (require.main === module) {
  updateMeetingStatuses()
    .then(() => {
      console.log('Manual meeting status update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Manual meeting status update failed:', error);
      process.exit(1);
    });
}
