import { createHmac } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import type Stripe from 'stripe';
import { env } from './env';
import type { BookedSession } from './scheduling';

export interface Enrollment {
  token: string;
  checkoutSessionId: string;
  courseSlug: string;
  diveSiteId: string;
  students: number;
  studentName: string;
  email: string;
  phone?: string;
  otherStudents?: string;
  addOns?: string[];
  amountPaid: number; // cents
  promotionCode?: string;
  createdAt: string;
  sessions: BookedSession[];
  welcomeEmailSent?: boolean;
}

const store = () => getStore({ name: 'enrollments', consistency: 'strong' });

/**
 * The private scheduling token is derived from the Stripe Checkout session, so the webhook and
 * the success page always agree on it without coordinating.
 */
export const tokenFor = (checkoutSessionId: string) =>
  createHmac('sha256', env('ENROLLMENT_SECRET')).update(checkoutSessionId).digest('base64url').slice(0, 32);

export const isPaid = (s: Stripe.Checkout.Session) =>
  s.status === 'complete' && (s.payment_status === 'paid' || s.payment_status === 'no_payment_required');

export async function getEnrollment(token: string): Promise<Enrollment | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  return (await store().get(token, { type: 'json' })) as Enrollment | null;
}

export async function saveEnrollment(e: Enrollment) {
  await store().setJSON(e.token, e);
}

/** Create the enrollment for a paid checkout session if it doesn't exist yet. */
export async function ensureEnrollment(s: Stripe.Checkout.Session): Promise<{ enrollment: Enrollment; created: boolean }> {
  if (!isPaid(s)) throw new Error(`Checkout session ${s.id} is not paid`);
  const token = tokenFor(s.id);
  const existing = await getEnrollment(token);
  if (existing) return { enrollment: existing, created: false };

  const md = s.metadata ?? {};
  // Retrieve sessions with expand: ['discounts.promotion_code'] to get the human-readable code.
  const promo = s.discounts?.[0]?.promotion_code;
  const enrollment: Enrollment = {
    token,
    checkoutSessionId: s.id,
    courseSlug: md.courseSlug,
    diveSiteId: md.diveSiteId,
    students: Number(md.students),
    studentName: md.studentName,
    email: s.customer_details?.email ?? s.customer_email ?? '',
    phone: s.customer_details?.phone ?? undefined,
    otherStudents: md.otherStudents || undefined,
    addOns: md.addOns ? md.addOns.split(',') : [],
    amountPaid: s.amount_total ?? 0,
    promotionCode: promo ? (typeof promo === 'string' ? promo : promo.code) : undefined,
    createdAt: new Date().toISOString(),
    sessions: [],
  };
  const result = await store().setJSON(token, enrollment, { onlyIfNew: true });
  if (!result.modified) {
    // Another request created it first.
    return { enrollment: (await getEnrollment(token))!, created: false };
  }
  return { enrollment, created: true };
}

export async function markWelcomeEmailSent(token: string) {
  const e = await getEnrollment(token);
  if (e) await saveEnrollment({ ...e, welcomeEmailSent: true });
}
