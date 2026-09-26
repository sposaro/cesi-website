import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-in for Netlify Blobs.
const blobs = new Map<string, unknown>();
vi.mock('@netlify/blobs', () => ({
  getStore: () => ({
    get: async (k: string) => blobs.get(k) ?? null,
    setJSON: async (k: string, v: unknown, o?: { onlyIfNew?: boolean }) => {
      if (o?.onlyIfNew && blobs.has(k)) return { modified: false };
      blobs.set(k, structuredClone(v));
      return { modified: true };
    },
  }),
}));

// Fake Google Calendar: one busy block, and records created events.
const created: any[] = [];
const events = new Map<string, any>();
vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
  const u = String(url);
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  if (u.includes('oauth2.googleapis.com/token')) return ok({ access_token: 'x', expires_in: 3600 });
  if (u.endsWith('/freeBusy')) {
    return ok({ calendars: { primary: { busy: [{ start: '2026-10-03T00:00:00Z', end: '2026-10-04T04:00:00Z' }] } } });
  }
  if (u.includes('/events?sendUpdates=all')) {
    const body = JSON.parse(String(init!.body));
    const ev = { id: `ev${created.length + 1}`, status: 'confirmed', ...body };
    created.push(ev);
    events.set(ev.id, ev);
    return ok(ev);
  }
  const m = u.match(/\/events\/([^/?]+)$/);
  if (m) return events.has(m[1]) ? ok(events.get(m[1])) : new Response('gone', { status: 404 });
  throw new Error(`unexpected fetch ${u}`);
});

process.env.ENROLLMENT_SECRET = 'test-secret';
process.env.GOOGLE_CLIENT_ID = 'id';
process.env.GOOGLE_CLIENT_SECRET = 'secret';
process.env.GOOGLE_REFRESH_TOKEN = 'refresh';

const { ensureEnrollment, getEnrollment } = await import('../src/lib/enrollments');
const { availability, book, BookingError, refreshSessions, view } = await import('../src/lib/booking');

const checkout = {
  id: 'cs_test_123',
  status: 'complete',
  payment_status: 'no_payment_required', // shop code, 100% off
  amount_total: 0,
  customer_details: { email: 'diver@example.com', phone: '+18635551234' },
  metadata: { courseSlug: 'open-water', diveSiteId: 'lake-denton', students: '1', studentName: 'Pat Diver', otherStudents: '' },
  discounts: [{ promotion_code: { code: 'SCUBAETC-001' } }],
} as any;

describe('enroll and book', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));
  });

  it('creates the enrollment once, even if called twice', async () => {
    const a = await ensureEnrollment(checkout);
    const b = await ensureEnrollment(checkout);
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.enrollment.token).toBe(a.enrollment.token);
    expect(a.enrollment.promotionCode).toBe('SCUBAETC-001');
  });

  it('books all four sessions in order, skipping busy time, then deletes and rebooks', async () => {
    const { enrollment } = await ensureEnrollment(checkout);
    let e = enrollment;

    const first = await availability(e);
    expect(first.sessionKey).toBe('pool-1');
    // Oct 3 is busy all day, so the earliest slot is Oct 4 8am local.
    expect(first.slots[0].start).toBe('2026-10-04T12:00:00.000Z');

    await expect(book(e, 'open-water-1', first.slots[0].start)).rejects.toBeInstanceOf(BookingError);

    for (const key of ['pool-1', 'pool-2', 'open-water-1', 'open-water-2']) {
      const { sessionKey, slots } = await availability(e);
      expect(sessionKey).toBe(key);
      e = await book(e, key, slots[0].start);
    }
    expect(created).toHaveLength(4);
    expect(created[2].location).toContain('Lake Denton');
    expect(created[0].attendees[0].email).toBe('diver@example.com');
    // Each session on a later day than the one before.
    const days = e.sessions.map((s) => s.start.slice(0, 10));
    expect(new Set(days).size).toBe(4);
    expect(view(e).nextSessionKey).toBeNull();

    // Instructor deletes the last event in Google Calendar: the student can book it again.
    events.delete(e.sessions[3].eventId);
    e = await refreshSessions((await getEnrollment(e.token))!);
    expect(view(e).nextSessionKey).toBe('open-water-2');
  });
});
