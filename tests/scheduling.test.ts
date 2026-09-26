import { describe, expect, it } from 'vitest';
import { getCourse } from '../src/data/courses';
import { diveSites } from '../src/config/site';
import { findSlots, lastBookedEnd, nextSession, sessionShape } from '../src/lib/scheduling';
import { addDays, localDate, zonedToUtc } from '../src/lib/time';

const tz = 'America/New_York';

describe('time helpers', () => {
  it('converts Florida wall time to UTC across DST', () => {
    expect(zonedToUtc('2026-07-04', '08:00', tz).toISOString()).toBe('2026-07-04T12:00:00.000Z'); // EDT
    expect(zonedToUtc('2026-12-05', '08:00', tz).toISOString()).toBe('2026-12-05T13:00:00.000Z'); // EST
    expect(zonedToUtc('2026-11-01', '08:00', tz).toISOString()).toBe('2026-11-01T13:00:00.000Z'); // DST ends 2am that day
    expect(zonedToUtc('2026-03-08', '08:00', tz).toISOString()).toBe('2026-03-08T12:00:00.000Z'); // DST starts 2am that day
  });

  it('gets the local date and adds days across month ends', () => {
    expect(localDate(new Date('2026-10-01T02:00:00Z'), tz)).toBe('2026-09-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('findSlots', () => {
  const rules = { timeZone: tz, now: new Date('2026-10-01T12:00:00Z'), minLeadHours: 48, maxDaysAhead: 5 };

  it('offers each start time on each day, respecting lead time and window', () => {
    const slots = findSlots({ hours: 6, startTimes: ['08:00', '12:00'], busy: [], rules });
    // now = Oct 1 8am local; earliest = Oct 3 8am local; last day = Oct 6
    expect(slots[0].start).toBe('2026-10-03T12:00:00.000Z');
    expect(slots.at(-1)!.start).toBe('2026-10-06T16:00:00.000Z');
    expect(slots).toHaveLength(8);
  });

  it('skips slots that overlap busy time', () => {
    const busy = [{ start: new Date('2026-10-03T15:00:00Z'), end: new Date('2026-10-03T16:00:00Z') }];
    const slots = findSlots({ hours: 6, startTimes: ['08:00', '12:00'], busy, rules });
    const oct3 = slots.filter((s) => s.start.startsWith('2026-10-03'));
    // Busy 11am-noon local: the 8am-2pm slot overlaps it, the noon-6pm slot doesn't.
    expect(oct3.map((s) => s.start)).toEqual(['2026-10-03T16:00:00.000Z']);
  });

  it('treats back-to-back busy time as free', () => {
    const busy = [{ start: new Date('2026-10-03T10:00:00Z'), end: new Date('2026-10-03T12:00:00Z') }];
    const slots = findSlots({ hours: 6, startTimes: ['08:00'], busy, rules });
    expect(slots[0].start).toBe('2026-10-03T12:00:00.000Z');
  });

  it('only offers days after the previous session', () => {
    const notBefore = new Date('2026-10-04T18:00:00Z');
    const slots = findSlots({ hours: 6, startTimes: ['08:00'], busy: [], rules, notBefore });
    expect(slots[0].start).toBe('2026-10-05T12:00:00.000Z');
  });
});

describe('course session order', () => {
  const ow = getCourse('open-water')!;

  it('books sessions in order', () => {
    expect(nextSession(ow, [])?.key).toBe('pool-1');
    const booked = [{ key: 'pool-1', eventId: 'a', start: '2026-10-03T12:00:00Z', end: '2026-10-03T18:00:00Z' }];
    expect(nextSession(ow, booked)?.key).toBe('pool-2');
    expect(lastBookedEnd(booked)?.toISOString()).toBe('2026-10-03T18:00:00.000Z');
  });

  it('uses the dive site for open-water day length', () => {
    const owDay = ow.sessions!.find((s) => s.kind === 'open-water')!;
    const denton = diveSites.find((d) => d.id === 'lake-denton')!;
    expect(sessionShape(owDay, denton)).toEqual({ hours: denton.openWaterDayHours, startTimes: denton.openWaterStartTimes });
  });
});
