// Google Calendar via REST, authenticated as the instructor with an OAuth refresh token.
// (A service account can't invite attendees on a personal Gmail calendar.)
import { env } from './env';
import type { Interval } from './scheduling';

const API = 'https://www.googleapis.com/calendar/v3';
let cached: { token: string; expires: number } | undefined;

async function accessToken(): Promise<string> {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      refresh_token: env('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json', ...init.headers },
  });
  if (!res.ok) throw new GoogleError(res.status, `Google Calendar ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export class GoogleError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const bookingCalendarId = () => process.env.GOOGLE_BOOKING_CALENDAR_ID || 'primary';

const busyCalendarIds = () =>
  (process.env.GOOGLE_BUSY_CALENDAR_IDS || bookingCalendarId())
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Busy intervals across the instructor's calendars. */
export async function getBusy(timeMin: Date, timeMax: Date): Promise<Interval[]> {
  const result = await call<{ calendars: Record<string, { busy: { start: string; end: string }[]; errors?: unknown[] }> }>(
    '/freeBusy',
    {
      method: 'POST',
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: busyCalendarIds().map((id) => ({ id })),
      }),
    },
  );
  const busy: Interval[] = [];
  for (const [id, cal] of Object.entries(result.calendars)) {
    // Fail closed: if a calendar can't be read we'd risk double-booking.
    if (cal.errors?.length) throw new Error(`Can't read busy times for calendar ${id}: ${JSON.stringify(cal.errors)}`);
    for (const b of cal.busy) busy.push({ start: new Date(b.start), end: new Date(b.end) });
  }
  return busy;
}

export interface CalendarEvent {
  id: string;
  status: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

export async function createEvent(event: {
  summary: string;
  description: string;
  location: string;
  start: string;
  end: string;
  attendee: { email: string; name: string };
  privateProps: Record<string, string>;
}): Promise<CalendarEvent> {
  return call<CalendarEvent>(`/calendars/${encodeURIComponent(bookingCalendarId())}/events?sendUpdates=all`, {
    method: 'POST',
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.start },
      end: { dateTime: event.end },
      attendees: [{ email: event.attendee.email, displayName: event.attendee.name }],
      extendedProperties: { private: event.privateProps },
      reminders: { useDefault: true },
    }),
  });
}

/** Returns null if the event was deleted. */
export async function getEvent(eventId: string): Promise<CalendarEvent | null> {
  try {
    const ev = await call<CalendarEvent>(`/calendars/${encodeURIComponent(bookingCalendarId())}/events/${encodeURIComponent(eventId)}`);
    return ev.status === 'cancelled' ? null : ev;
  } catch (e) {
    if (e instanceof GoogleError && (e.status === 404 || e.status === 410)) return null;
    throw e;
  }
}
