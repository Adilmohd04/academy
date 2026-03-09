/**
 * Date/Time Utility Functions
 * Handles timezone conversions for datetime-local inputs
 */

/**
 * Converts a UTC datetime string from database to local datetime-local format
 * Used when populating datetime-local input fields
 * 
 * @param utcDateString - ISO datetime string from database (e.g., "2026-02-01T06:00:00Z")
 * @returns Local datetime string in "YYYY-MM-DDTHH:MM" format for datetime-local input
 */
export function utcToLocal(utcDateString: string | null | undefined): string {
  if (!utcDateString) return '';
  
  try {
    const date = new Date(utcDateString);
    
    // Format to YYYY-MM-DDTHH:MM for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Error converting UTC to local:', error);
    return '';
  }
}

/**
 * Converts a local datetime-local value to UTC ISO string for database storage
 * Used when submitting forms with datetime-local inputs
 * 
 * @param localDateString - Local datetime string from datetime-local input (e.g., "2026-02-01T11:30")
 * @returns UTC ISO string for database storage (e.g., "2026-02-01T06:00:00.000Z")
 */
export function localToUTC(localDateString: string | null | undefined): string {
  if (!localDateString) return '';
  
  try {
    // datetime-local gives us local time, convert to UTC
    const date = new Date(localDateString);
    return date.toISOString();
  } catch (error) {
    console.error('Error converting local to UTC:', error);
    return '';
  }
}

/**
 * Gets current local datetime in datetime-local format
 * Useful for setting default/minimum values
 * 
 * @returns Current local datetime string in "YYYY-MM-DDTHH:MM" format
 */
export function getCurrentLocalDateTime(): string {
  return utcToLocal(new Date().toISOString());
}

/**
 * Formats a date for display (handles both UTC and local dates)
 * 
 * @param dateString - ISO datetime string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDateTime(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }
): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Example usage:
 * 
 * // When loading data from database:
 * const localValue = utcToLocal(course.starts_at); // "2026-02-01T11:30"
 * <input type="datetime-local" value={localValue} />
 * 
 * // When saving to database:
 * const utcValue = localToUTC(formData.starts_at); // "2026-02-01T06:00:00.000Z"
 * await api.updateCourse({ starts_at: utcValue });
 * 
 * // For display:
 * const formatted = formatDateTime(course.starts_at); // "Feb 1, 2026, 11:30 AM"
 */
