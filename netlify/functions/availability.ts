import type { Config } from '@netlify/functions';
import { availability, refreshSessions } from '../../src/lib/booking';
import { getEnrollment } from '../../src/lib/enrollments';
import { errorResponse, json, serverError } from '../../src/lib/http';

// GET ?t=<token> → open slots for the student's next unscheduled session
export default async (req: Request) => {
  try {
    const enrollment = await getEnrollment(new URL(req.url).searchParams.get('t') ?? '');
    if (!enrollment) return errorResponse('Enrollment not found', 404);
    return json(await availability(await refreshSessions(enrollment)));
  } catch (e) {
    return serverError(e);
  }
};

export const config: Config = { path: '/api/availability' };
