/**
 * Time formatting utilities for IST timezone
 */

/**
 * Convert 24-hour time format to 12-hour format with AM/PM
 * @param time24 - Time in 24-hour format (HH:MM:SS or HH:MM)
 * @returns Time in 12-hour format (h:MM AM/PM)
 */
export const formatTime12Hour = (time24: string): string => {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  
  return `${h12}:${minutes} ${period}`;
};

/**
 * Format a time range from 24-hour to 12-hour format
 * @param startTime - Start time in 24-hour format
 * @param endTime - End time in 24-hour format
 * @returns Formatted time range (e.g., "2:00 PM - 3:00 PM")
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  if (!startTime || !endTime) return 'Time not set';
  
  const start = formatTime12Hour(startTime);
  const end = formatTime12Hour(endTime);
  
  return `${start} - ${end}`;
};

/**
 * Format date in a readable format
 * @param date - Date string or Date object
 * @returns Formatted date (e.g., "November 16, 2025")
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

/**
 * Format date and time together for IST
 * @param date - Date string
 * @param startTime - Start time in 24-hour format
 * @param endTime - End time in 24-hour format
 * @returns Formatted date and time (e.g., "November 16, 2025 at 2:00 PM - 3:00 PM IST")
 */
export const formatDateTimeIST = (date: string, startTime: string, endTime: string): string => {
  const formattedDate = formatDate(date);
  const formattedTime = formatTimeRange(startTime, endTime);
  
  return `${formattedDate} at ${formattedTime} IST`;
};
