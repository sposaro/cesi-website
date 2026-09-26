import type { Course, SessionTemplate } from '../data/courses';
import type { DiveSite } from '../config/site';
import { addDays, localDate, zonedToUtc } from './time';

export interface Interval {
  start: Date;
  end: Date;
}

export interface Slot {
  start: string; // ISO
  end: string; // ISO
}

export interface SlotRules {
  timeZone: string;
  now: Date;
  minLeadHours: number;
  maxDaysAhead: number;
}

/** Length and start times for a session, taking the dive site into account for open-water days. */
export function sessionShape(template: SessionTemplate, site: DiveSite) {
  if (template.kind === 'open-water') {
    return { hours: site.openWaterDayHours, startTimes: site.openWaterStartTimes };
  }
  return { hours: template.durationHours ?? 4, startTimes: template.startTimes ?? ['09:00'] };
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/**
 * Candidate slots for one session: every allowed start time on every day in the booking window
 * that doesn't overlap busy time and starts on a later day than `notBefore` (the previous session).
 */
export function findSlots(opts: {
  hours: number;
  startTimes: string[];
  busy: Interval[];
  rules: SlotRules;
  /** The session must start on a later calendar day than this instant (previous session's end). */
  notBefore?: Date;
}): Slot[] {
  const { hours, startTimes, busy, rules } = opts;
  const earliest = new Date(rules.now.getTime() + rules.minLeadHours * 3_600_000);
  const firstDay = opts.notBefore
    ? maxDate(localDate(earliest, rules.timeZone), addDays(localDate(opts.notBefore, rules.timeZone), 1))
    : localDate(earliest, rules.timeZone);
  const lastDay = addDays(localDate(rules.now, rules.timeZone), rules.maxDaysAhead);

  const slots: Slot[] = [];
  for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
    for (const time of startTimes) {
      const start = zonedToUtc(day, time, rules.timeZone);
      const end = new Date(start.getTime() + hours * 3_600_000);
      if (start < earliest) continue;
      if (busy.some((b) => overlaps({ start, end }, b))) continue;
      slots.push({ start: start.toISOString(), end: end.toISOString() });
    }
  }
  return slots;
}

const maxDate = (a: string, b: string) => (a > b ? a : b);

export interface BookedSession {
  key: string;
  eventId: string;
  start: string;
  end: string;
}

/**
 * The next session a student may book: sessions are booked in course order.
 * Returns undefined when everything is booked.
 */
export function nextSession(course: Course, booked: BookedSession[]): SessionTemplate | undefined {
  const done = new Set(booked.map((b) => b.key));
  return course.sessions?.find((s) => !done.has(s.key));
}

/** End of the latest booked session, used so each session lands after the one before it. */
export function lastBookedEnd(booked: BookedSession[]): Date | undefined {
  if (!booked.length) return undefined;
  return new Date(Math.max(...booked.map((b) => new Date(b.end).getTime())));
}
