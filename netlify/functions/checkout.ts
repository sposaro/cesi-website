import type { Config } from '@netlify/functions';
import { getCourse } from '../../src/data/courses';
import { diveSites } from '../../src/config/site';
import { siteUrl } from '../../src/lib/env';
import { errorResponse, json, serverError } from '../../src/lib/http';
import { OrderError, priceOrder } from '../../src/lib/pricing';
import { stripe } from '../../src/lib/stripe';

const clean = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async (req: Request) => {
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const courseSlug = clean(body.courseSlug);
    const diveSiteId = clean(body.diveSiteId);
    const students = Number(body.students);
    const studentName = clean(body.studentName, 100);
    const email = clean(body.email, 200);
    const otherStudents = clean(body.otherStudents, 400);
    const addOns = Array.isArray(body.addOns) ? body.addOns.map((a) => clean(a, 50)).filter(Boolean).slice(0, 5) : [];

    if (!studentName) return errorResponse('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse('Please enter a valid email address.');
    if (body.agreedToPolicies !== true) return errorResponse('Please agree to the course policies.');
    if (body.medicalAcknowledged !== true) return errorResponse('Please confirm you have read the medical requirements.');

    const { lineItems } = priceOrder({ courseSlug, diveSiteId, students, addOns });
    const course = getCourse(courseSlug)!;
    const site = diveSites.find((s) => s.id === diveSiteId)!;

    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true, // enrollment codes (100% off) for students who paid elsewhere, e.g. through a partner shop
      line_items: lineItems.map((li) => ({
        quantity: li.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: li.unitAmount,
          product_data: { name: li.name, description: li.description },
        },
      })),
      metadata: { courseSlug, diveSiteId, students: String(students), studentName, otherStudents, addOns: addOns.join(',') },
      payment_intent_data: { description: `Swan City Scuba (The CESI Project): ${course.name} – ${studentName} – ${site.name}` },
      custom_text: {
        submit: { message: 'Tuition is non-refundable and is not a tax-deductible donation. After checkout you’ll pick your session dates.' },
      },
      success_url: `${siteUrl()}/swancityscuba/enroll/confirmed/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/swancityscuba/enroll/${courseSlug}/`,
    });
    return json({ url: session.url });
  } catch (e) {
    if (e instanceof OrderError) return errorResponse(e.message);
    return serverError(e);
  }
};

export const config: Config = { path: '/api/checkout' };
