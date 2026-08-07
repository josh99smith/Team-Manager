// Pure helpers for turning AI-extracted schedule rows into preview rows with
// duplicate/conflict warnings. No I/O — safe to unit test directly, and kept
// separate from lib/actions/ai-import.ts because "use server" files may only
// export async functions.

import { EVENT_TYPE_LABELS } from "@/lib/constants";

export type RawScheduleEvent = {
  type: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM or ""
  endTime: string; // HH:MM or ""
  location: string;
  opponent: string;
  notes: string;
};

export type ExistingEventLike = {
  id: string;
  type: string;
  title: string;
  opponent: string | null;
  startsAt: Date;
  endsAt: Date | null;
};

export type ParsedScheduleRow = RawScheduleEvent & {
  key: string;
  duplicateWarning: string | null;
  conflictWarning: string | null;
};

// Assume a 2-hour default duration for anything missing an end time — only
// used to detect likely overlaps, never persisted.
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

export function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function combineDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const t = /^\d{1,2}:\d{2}$/.test(time) ? time.padStart(5, "0") : "00:00";
  const d = new Date(`${date}T${t}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function rangeFor(
  date: string,
  startTime: string,
  endTime: string
): { start: Date; end: Date } | null {
  const start = combineDateTime(date, startTime);
  if (!start) return null;
  const endRaw = endTime ? combineDateTime(date, endTime) : null;
  const end = endRaw && endRaw > start ? endRaw : new Date(start.getTime() + DEFAULT_DURATION_MS);
  return { start, end };
}

function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
  return a.start < b.end && b.start < a.end;
}

function describeEvent(e: { type: string; title: string; opponent: string | null }): string {
  if (e.title) return e.title;
  if (e.opponent) return `vs ${e.opponent}`;
  return EVENT_TYPE_LABELS[e.type] ?? e.type;
}

export function buildScheduleRows(
  parsed: RawScheduleEvent[],
  existingEvents: ExistingEventLike[]
): ParsedScheduleRow[] {
  const ranges = parsed.map((e) => rangeFor(e.date, e.startTime, e.endTime));

  return parsed.map((e, i) => {
    const day = e.date;
    const range = ranges[i];

    const duplicate = existingEvents.find((ev) => {
      if (localISODate(ev.startsAt) !== day) return false;
      if (ev.type !== e.type) return false;
      const oppMatch = (e.opponent || "").trim().toLowerCase() === (ev.opponent || "").trim().toLowerCase();
      const titleMatch = (e.title || "").trim().toLowerCase() === (ev.title || "").trim().toLowerCase();
      return oppMatch || titleMatch;
    });

    let conflict: string | null = null;
    if (range) {
      const existingConflict = existingEvents.find((ev) => {
        if (duplicate && ev.id === duplicate.id) return false;
        if (localISODate(ev.startsAt) !== day) return false;
        const evRange = {
          start: ev.startsAt,
          end: ev.endsAt ?? new Date(ev.startsAt.getTime() + DEFAULT_DURATION_MS),
        };
        return overlaps(range, evRange);
      });
      if (existingConflict) {
        conflict = `Overlaps with "${describeEvent(existingConflict)}" already on the calendar`;
      } else {
        const batchConflictIndex = parsed.findIndex((other, j) => {
          if (j === i) return false;
          const otherRange = ranges[j];
          return !!otherRange && overlaps(range, otherRange);
        });
        if (batchConflictIndex !== -1) {
          const other = parsed[batchConflictIndex];
          conflict = `Overlaps with "${describeEvent({ ...other, opponent: other.opponent || null })}" in this same import`;
        }
      }
    }

    return {
      ...e,
      key: String(i),
      duplicateWarning: duplicate
        ? `Possible duplicate of "${describeEvent(duplicate)}" already on the calendar`
        : null,
      conflictWarning: conflict,
    };
  });
}
