/** A recognized `!due(...)` reminder token. */
export interface DueMatch {
  /** UTF-16 offsets into the scanned source, spanning the whole `!due(...)` token. */
  from: number;
  to: number;
  /** Exact source spelling of the whole token, e.g. `!due(2026-03-15:09:30)`. */
  source: string;
  /** The due time as an ISO 8601 UTC timestamp. */
  isoDateTime: string;
  /** Whether the token specified an explicit time (`:HH:MM`) rather than defaulting to end of day. */
  hasTime: boolean;
}

// Mirrors internal/markdown/reminder.go's dueTimeRegexp so the frontend and
// backend agree on what counts as a reminder token.
const DUE_REGEX = /!due\((\d{4})-(\d{2})-(\d{2})(?::(\d{2}):(\d{2}))?\)/g;

/**
 * Compute the due time for a matched token, or undefined when the date/time
 * doesn't name a real calendar moment (e.g. `!due(2024-02-30)`).
 *
 * A date-only token defaults to the end of that day (23:59:59 UTC); a
 * date-and-time token is used exactly as given, interpreted in UTC.
 */
function computeDueDateTime(year: number, month: number, day: number, hour?: string, minute?: string): Date | undefined {
  const hasTime = hour !== undefined && minute !== undefined;
  const h = hasTime ? Number(hour) : 23;
  const m = hasTime ? Number(minute) : 59;
  const s = hasTime ? 0 : 59;

  const date = new Date(Date.UTC(year, month - 1, day, h, m, s));
  // Date.UTC normalizes out-of-range components instead of failing, so a
  // round-trip mismatch indicates an invalid calendar date/time.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== h ||
    date.getUTCMinutes() !== m
  ) {
    return undefined;
  }
  return date;
}

/** Find every `!due(...)` reminder token in one eligible literal source run. */
export function findDueMatches(source: string): DueMatch[] {
  const matches: DueMatch[] = [];
  for (const match of source.matchAll(DUE_REGEX)) {
    const [full, year, month, day, hour, minute] = match;
    const date = computeDueDateTime(Number(year), Number(month), Number(day), hour, minute);
    if (!date) continue;

    const from = match.index ?? 0;
    matches.push({ from, to: from + full.length, source: full, isoDateTime: date.toISOString(), hasTime: hour !== undefined });
  }
  return matches;
}
