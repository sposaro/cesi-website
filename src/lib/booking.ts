import { booking as rules, diveSites, org, policies, site } from '../config/site';
import { getCourse, isBookable, type SessionTemplate } from '../data/courses';
import { escapeHtml, sendEmail } from './email';
import { optionalEnv, siteUrl } from './env';
import { saveEnrollment, type Enrollment } from './enrollments';
import { createEvent, getBusy, getEvent } from './google';
import { findSlots, lastBookedEnd, nextSession, sessionShape, type Slot } from './scheduling';

export class BookingError extends Error {}

export function context(e: Enrollment) {
  const course = getCourse(e.courseSlug);
  const diveSite = diveSites.find((s) => s.id === e.diveSiteId);
  if (!course || !isBookable(course) || !diveSite) throw new Error(`Enrollment ${e.checkoutSessionId} references a missing course or site`);
  return { course, diveSite };
}

export const scheduleUrl = (e: Enrollment) => `${siteUrl()}${site.basePath}/schedule/?t=${e.token}`;

/**
 * Sync booked sessions with Google Calendar: if the instructor moved an event, pick up the new
 * time; if they deleted it, the student can book that session again.
 */
export async function refreshSessions(e: Enrollment): Promise<Enrollment> {
  let changed = false;
  const sessions = [];
  for (const s of e.sessions) {
    const ev = await getEvent(s.eventId);
    if (!ev) {
      changed = true;
      continue;
    }
    const start = ev.start.dateTime ?? s.start;
    const end = ev.end.dateTime ?? s.end;
    if (start !== s.start || end !== s.end) changed = true;
    sessions.push({ ...s, start: new Date(start).toISOString(), end: new Date(end).toISOString() });
  }
  if (changed) {
    e = { ...e, sessions };
    await saveEnrollment(e);
  }
  return e;
}

export function view(e: Enrollment) {
  const { course, diveSite } = context(e);
  const next = nextSession(course, e.sessions);
  return {
    course: { name: course.name, slug: course.slug, makeupSessions: course.makeupSessions ?? 0 },
    addOns: (e.addOns ?? []).map((id) => course.addOns?.find((a) => a.id === id)?.name ?? id),
    diveSite: { name: diveSite.name, feeNote: diveSite.siteFeeNote ?? null },
    studentName: e.studentName,
    students: e.students,
    sessions: course.sessions.map((t) => {
      const booked = e.sessions.find((s) => s.key === t.key);
      return { key: t.key, title: t.title, description: t.description, kind: t.kind, start: booked?.start ?? null, end: booked?.end ?? null };
    }),
    nextSessionKey: next?.key ?? null,
    timeZone: site.timeZone,
  };
}

async function openSlots(e: Enrollment, template: SessionTemplate, now = new Date()): Promise<Slot[]> {
  const { course, diveSite } = context(e);
  const { hours, startTimes } = sessionShape(template, diveSite);
  // Only sessions that come earlier in the course constrain this one.
  const earlierKeys = new Set(course.sessions.slice(0, course.sessions.indexOf(template)).map((t) => t.key));
  const windowEnd = new Date(now.getTime() + (rules.maxDaysAhead + 2) * 86_400_000);
  const busy = await getBusy(now, windowEnd);
  return findSlots({
    hours,
    startTimes,
    busy,
    notBefore: lastBookedEnd(e.sessions.filter((s) => earlierKeys.has(s.key))),
    rules: { timeZone: site.timeZone, now, minLeadHours: rules.minLeadHours, maxDaysAhead: rules.maxDaysAhead },
  });
}

export async function availability(e: Enrollment) {
  const { course } = context(e);
  const next = nextSession(course, e.sessions);
  if (!next) return { sessionKey: null, slots: [] };
  return { sessionKey: next.key, slots: await openSlots(e, next) };
}

export async function book(e: Enrollment, sessionKey: string, start: string): Promise<Enrollment> {
  const { course, diveSite } = context(e);
  const next = nextSession(course, e.sessions);
  if (!next) throw new BookingError('All sessions for this course are already scheduled.');
  if (next.key !== sessionKey) throw new BookingError(`Please schedule ${next.title} first.`);

  // Re-check against live calendar data right before booking.
  const slot = (await openSlots(e, next)).find((s) => s.start === new Date(start).toISOString());
  if (!slot) throw new BookingError('Sorry, that time was just taken. Please pick another.');

  const location = next.kind === 'open-water' ? diveSite.address : site.shop.address;
  const event = await createEvent({
    summary: `Swan City Scuba – ${course.name}: ${next.title} (${e.studentName}${e.students > 1 ? ` +${e.students - 1}` : ''})`,
    location,
    start: slot.start,
    end: slot.end,
    attendee: { email: e.email, name: e.studentName },
    privateProps: { checkoutSessionId: e.checkoutSessionId, sessionKey: next.key },
    description: [
      next.description,
      '',
      next.kind === 'open-water' && diveSite.siteFeeNote ? `Site fee: ${diveSite.siteFeeNote}` : '',
      'Bring: mask, fins, snorkel, swimsuit, towel, water and a snack.',
      e.students > 1 ? `Students: ${e.studentName}${e.otherStudents ? `, ${e.otherStudents}` : ''}` : '',
      e.phone ? `Phone: ${e.phone}` : '',
      '',
      `Your schedule: ${scheduleUrl(e)}`,
      'Need to change this? Reply to this invite or contact your instructor at least 48 hours ahead.',
    ]
      .filter((line, i, all) => line || all[i - 1])
      .join('\n'),
  });

  const updated: Enrollment = {
    ...e,
    sessions: [...e.sessions, { key: next.key, eventId: event.id, start: slot.start, end: slot.end }],
  };
  await saveEnrollment(updated);
  return updated;
}

export async function sendEnrollmentEmails(e: Enrollment) {
  const { course, diveSite } = context(e);
  const link = scheduleUrl(e);
  const instructorEmail = optionalEnv('INSTRUCTOR_EMAIL');
  await sendEmail({
    to: e.email,
    replyTo: instructorEmail,
    subject: `You're enrolled: ${course.name}`,
    html: `
      <p>Hi ${escapeHtml(e.studentName)},</p>
      <p>Welcome to <strong>${escapeHtml(course.name)}</strong> with ${escapeHtml(site.name)}, an educational program of ${escapeHtml(org.name)}. Your next step is to pick your dates:</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#0b5563;color:#fff;border-radius:8px;text-decoration:none">Schedule my sessions</a></p>
      <p>This link is private to you. Keep this email so you can come back to it.</p>
      <p><strong>Before your first water session:</strong> ${escapeHtml(policies.medical)}</p>
      <p><strong>Bring your own mask, fins and snorkel.</strong>${diveSite.siteFeeNote ? ` Open water dives: ${escapeHtml(diveSite.siteFeeNote)}` : ''}</p>
      <p>See you in the water,<br>${escapeHtml(site.instructor.name)}<br>${escapeHtml(site.name)} · ${escapeHtml(org.name)}</p>
      <p style="color:#666;font-size:12px">${escapeHtml(policies.tuitionNotDonation)} ${escapeHtml(org.name)} is a ${escapeHtml(org.taxStatus)}, EIN ${escapeHtml(org.ein)}.</p>`,
  });
  if (instructorEmail) {
    await sendEmail({
      to: instructorEmail,
      subject: `New enrollment: ${course.name} – ${e.studentName}`,
      html: `
        <p><strong>${escapeHtml(e.studentName)}</strong> (${escapeHtml(e.email)}${e.phone ? `, ${escapeHtml(e.phone)}` : ''}) enrolled in ${escapeHtml(course.name)}.</p>
        <ul>
          <li>Students: ${e.students}${e.otherStudents ? ` (${escapeHtml(e.otherStudents)})` : ''}</li>
          <li>Open water site: ${escapeHtml(diveSite.name)}</li>
          ${e.addOns?.length ? `<li>Add-ons: ${escapeHtml(e.addOns.join(', '))}</li>` : ''}
          <li>Paid: $${(e.amountPaid / 100).toFixed(2)}${e.promotionCode ? ` (code ${escapeHtml(e.promotionCode)})` : ''}</li>
        </ul>
        <p>They'll pick dates at their private link; sessions will appear on your Google Calendar.</p>`,
    });
  }
}
