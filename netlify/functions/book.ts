import type { Config } from '@netlify/functions';
import { book, BookingError, refreshSessions, view } from '../../src/lib/booking';
import { getEnrollment } from '../../src/lib/enrollments';
import { errorResponse, json, serverError } from '../../src/lib/http';

// POST { t, sessionKey, start } → put the session on the instructor's calendar and invite the student
export default async (req: Request) => {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);
  try {
    const body = (await req.json()) as { t?: string; sessionKey?: string; start?: string };
    const enrollment = await getEnrollment(body.t ?? '');
    if (!enrollment) return errorResponse('Enrollment not found', 404);
    if (!body.sessionKey || !body.start || Number.isNaN(Date.parse(body.start))) {
      return errorResponse('Pick a session time.');
    }
    const updated = await book(await refreshSessions(enrollment), body.sessionKey, body.start);
    return json(view(updated));
  } catch (e) {
    if (e instanceof BookingError) return errorResponse(e.message, 409);
    return serverError(e);
  }
};

export const config: Config = { path: '/api/book' };
