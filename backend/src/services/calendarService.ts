/**
 * Google Calendar (Meet) Integration
 *
 * Env variables:
 * - GOOGLE_SERVICE_ACCOUNT_JSON: JSON string or file path of service account creds
 * - GOOGLE_IMPERSONATED_USER: Email to impersonate (calendar owner, e.g., admin@domain.com)
 * - GOOGLE_CALENDAR_ID: Optional, defaults to 'primary'
 * - TIMEZONE: Optional, defaults to 'Asia/Kolkata'
 *
 * Behavior:
 * - If not configured, callers should handle fallback (we do this in services)
 * - createMeetEvent returns a real, joinable Google Meet hangoutLink
 *
 * NOTE: Automatic meeting generation is currently DISABLED in the admin UI.
 * Only manual link pasting is used until domain/workspace setup is finalized.
 * This module remains for future re‑enablement.
 */
import { google } from 'googleapis';
import { randomUUID } from 'crypto';

export type CreateMeetEventArgs = {
  summary: string;
  description?: string;
  startDateTimeISO: string; // e.g., '2025-11-15T14:00:00+05:30'
  endDateTimeISO: string;   // e.g., '2025-11-15T15:00:00+05:30'
  timeZone?: string;        // e.g., 'Asia/Kolkata'
  attendeesEmails?: string[];
  calendarId?: string;      // default: 'primary'
};

export type CreateMeetEventResult = {
  eventId: string;
  hangoutLink: string;
  htmlLink?: string;
};

const CALENDAR_SCOPE = ['https://www.googleapis.com/auth/calendar'];

function parseServiceAccountJson(): { client_email: string; private_key: string } | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    // Try parse as JSON string
    return JSON.parse(raw);
  } catch {
    // Otherwise treat as file path
    try {
      const fs = require('fs');
      const path = require('path');
      const p = path.resolve(raw);
      const content = fs.readFileSync(p, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

function getAuthClient() {
  const svc = parseServiceAccountJson();
  if (!svc) return null;
  const subject = process.env.GOOGLE_IMPERSONATED_USER || svc.client_email;
  const jwt = new google.auth.JWT({
    email: svc.client_email,
    key: svc.private_key,
    scopes: CALENDAR_SCOPE,
    subject,
  });
  return jwt;
}

export function isCalendarConfigured(): boolean {
  return !!parseServiceAccountJson();
}

export async function createMeetEvent(args: CreateMeetEventArgs): Promise<CreateMeetEventResult> {
  const auth = getAuthClient();
  if (!auth) throw new Error('Google Calendar is not configured');

  const calendar = google.calendar({ version: 'v3', auth });
  const timeZone = args.timeZone || process.env.TIMEZONE || 'Asia/Kolkata';
  const calendarId = args.calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary';

  const requestId = randomUUID();

  console.log(`📤 Creating Google Calendar event: summary='${args.summary}', start='${args.startDateTimeISO}', end='${args.endDateTimeISO}', tz='${timeZone}', calendar='${calendarId}' attendees=${(args.attendeesEmails||[]).length}`);

  const insertRes = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    requestBody: {
      summary: args.summary,
      description: args.description || '',
      start: { dateTime: args.startDateTimeISO, timeZone },
      end: { dateTime: args.endDateTimeISO, timeZone },
      attendees: (args.attendeesEmails || []).map(email => ({ email })),
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  });

  const event = insertRes.data;
  if (!event) throw new Error('No event data returned from Google Calendar API');
  console.log(`✅ Event created (id=${event.id}) hangoutLink='${event.hangoutLink}' status='${event.status}'`);
  if (!event.hangoutLink) {
    console.warn('⚠️ hangoutLink missing. Possible causes: (1) Account not Workspace (2) Meet disabled (3) Using group calendar without permission. Falling back to entryPoints if available.');
  }
  const hangoutLink = event.hangoutLink || event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri;
  if (!event.id || !hangoutLink) {
    throw new Error('Failed to create Google Meet link');
  }

  return {
    eventId: event.id,
    hangoutLink,
    htmlLink: event.htmlLink || undefined,
  };
}
