import type { Config } from '@netlify/functions';
import { refreshSessions, view } from '../../src/lib/booking';
import { ensureEnrollment, getEnrollment, isPaid } from '../../src/lib/enrollments';
import { errorResponse, json, serverError } from '../../src/lib/http';
import { retrieveCheckoutSession } from '../../src/lib/stripe';

// GET ?session_id=cs_...  → exchange a completed Stripe Checkout for the private scheduling token
// GET ?t=<token>          → enrollment details and booked sessions
export default async (req: Request) => {
  const params = new URL(req.url).searchParams;
  try {
    const sessionId = params.get('session_id');
    if (sessionId) {
      if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return errorResponse('Invalid checkout session', 400);
      const session = await retrieveCheckoutSession(sessionId);
      if (!isPaid(session)) return errorResponse('Payment has not completed yet.', 402);
      const { enrollment } = await ensureEnrollment(session);
      return json({ token: enrollment.token });
    }

    const enrollment = await getEnrollment(params.get('t') ?? '');
    if (!enrollment) return errorResponse('We couldn’t find that enrollment. Check the link in your email.', 404);
    return json(view(await refreshSessions(enrollment)));
  } catch (e) {
    return serverError(e);
  }
};

export const config: Config = { path: '/api/enrollment' };
