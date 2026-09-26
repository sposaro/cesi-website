// Minimal time-zone helpers built on Intl, so we don't need a date library.

/** Offset of `tz` from UTC at `instant`, in minutes (e.g. -240 for EDT). */
export function tzOffsetMinutes(instant: Date, tz: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName')!.value; // "GMT-04:00" or "GMT"
  const m = name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** Convert a wall-clock date ("2026-10-03") and time ("08:00") in `tz` to a UTC Date. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  let result = asUtc - tzOffsetMinutes(new Date(asUtc), tz) * 60_000;
  // Re-check once in case the guess landed on the other side of a DST change.
  const corrected = asUtc - tzOffsetMinutes(new Date(result), tz) * 60_000;
  if (corrected !== result) result = corrected;
  return new Date(result);
}

/** Local calendar date ("YYYY-MM-DD") of `instant` in `tz`. */
export function localDate(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}

/** Add whole days to a "YYYY-MM-DD" date string. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
