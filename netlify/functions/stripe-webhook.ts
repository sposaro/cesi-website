import type { Config } from '@netlify/functions';
import { sendEnrollmentEmails } from '../../src/lib/booking';
import { ensureEnrollment, isPaid, markWelcomeEmailSent } from '../../src/lib/enrollments';
import { env } from '../../src/lib/env';
import { errorResponse, json, serverError } from '../../src/lib/http';
import { retrieveCheckoutSession, stripe } from '../../src/lib/stripe';

export default async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return errorResponse('Missing signature', 400);
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(await req.text(), signature, env('STRIPE_WEBHOOK_SECRET'));
  } catch {
    return errorResponse('Invalid signature', 400);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = await retrieveCheckoutSession(event.data.object.id);
      if (isPaid(session)) {
        // The success page may have created the enrollment first. Only the webhook sends the
        // welcome email, once per enrollment (Stripe can deliver the same event more than once).
        const { enrollment } = await ensureEnrollment(session);
        if (!enrollment.welcomeEmailSent) {
          await sendEnrollmentEmails(enrollment);
          await markWelcomeEmailSent(enrollment.token);
        }
      }
    }
    return json({ received: true });
  } catch (e) {
    return serverError(e); // non-2xx makes Stripe retry
  }
};

export const config: Config = { path: '/api/stripe-webhook' };
