"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { getTeam, getTeamPreset } from "@/lib/team";
import { EVENT_TYPES } from "@/lib/constants";
import { extractFromImage, isSupportedImageType } from "@/lib/ai/vision";
import type { ImportRow } from "@/lib/import/hudl";
import {
  buildScheduleRows,
  combineDateTime,
  localISODate,
  type ParsedScheduleRow,
  type RawScheduleEvent,
} from "@/lib/import/schedule";

function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return "Something went wrong reading that photo. Please try again.";
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // base64-decoded size, generous for a phone photo

function assertUsableImage(base64: string, mediaType: string) {
  if (!isSupportedImageType(mediaType)) {
    throw new Error("Unsupported image type — use a JPEG, PNG, WebP, or GIF photo.");
  }
  const approxBytes = (base64.length * 3) / 4;
  if (approxBytes > MAX_IMAGE_BYTES) {
    throw new Error("That photo is too large — try a smaller image or a tighter crop.");
  }
}

// ---- Schedule photo import ----

const SCHEDULE_SCHEMA = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: [...EVENT_TYPES] },
          title: { type: "string" },
          date: { type: "string", description: "ISO date, YYYY-MM-DD" },
          startTime: { type: "string", description: "24-hour HH:MM, empty string if not shown" },
          endTime: { type: "string", description: "24-hour HH:MM, empty string if not shown" },
          location: { type: "string" },
          opponent: { type: "string", description: "empty string if not applicable" },
          notes: { type: "string" },
        },
        required: ["type", "title", "date", "startTime", "endTime", "location", "opponent", "notes"],
        additionalProperties: false,
      },
    },
  },
  required: ["events"],
  additionalProperties: false,
};

function schedulePrompt(todayIso: string): string {
  return `You are extracting a sports team's schedule from a photo. Read every event you can find (practices, games, scrimmages, meetings, workouts) and return them as structured data.

Today's date is ${todayIso}. If the photo doesn't show a year, infer the most likely year from context (assume the current or upcoming season relative to today).

For each event:
- type: one of PRACTICE, GAME, SCRIMMAGE, MEETING, WORKOUT. Use GAME for anything against an opponent, SCRIMMAGE for scrimmages/jamborees, MEETING for team meetings, WORKOUT for conditioning/lifting, PRACTICE for everything else.
- title: a short label only if the photo gives one distinct from the type (e.g. "Senior Night", "Homecoming"); otherwise empty string.
- date: the event's date as YYYY-MM-DD.
- startTime / endTime: 24-hour HH:MM. Leave endTime as an empty string if it isn't shown.
- location: the venue/field name if shown, else empty string.
- opponent: the opposing team's name for games/scrimmages, else empty string.
- notes: anything else worth keeping (uniform color, what to bring), else empty string.

Return every event you can read, even if some fields are uncertain — leave a field empty rather than guessing wildly. Skip section headers, page titles, and anything that isn't an actual scheduled event.`;
}

export type SchedulePhotoResult =
  | { rows: ParsedScheduleRow[]; error: null }
  | { rows: null; error: string };

export async function parseSchedulePhoto(
  base64: string,
  mediaType: string
): Promise<SchedulePhotoResult> {
  try {
    await requireSession();
    assertUsableImage(base64, mediaType);

    const todayIso = localISODate(new Date());
    const extracted = await extractFromImage<{ events: RawScheduleEvent[] }>({
      base64,
      mediaType,
      schema: SCHEDULE_SCHEMA,
      prompt: schedulePrompt(todayIso),
    });

    const parsed = extracted.events.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date));
    if (parsed.length === 0) {
      return { rows: null, error: "Couldn't find any events in that photo — try a clearer, more direct shot." };
    }

    const dates = parsed.map((e) => e.date).sort();
    const windowStart = new Date(`${dates[0]}T00:00:00`);
    windowStart.setDate(windowStart.getDate() - 1);
    const windowEnd = new Date(`${dates[dates.length - 1]}T00:00:00`);
    windowEnd.setDate(windowEnd.getDate() + 2);

    const existingEvents = await prisma.event.findMany({
      where: { startsAt: { gte: windowStart, lt: windowEnd } },
    });

    const rows = buildScheduleRows(parsed, existingEvents);
    return { rows, error: null };
  } catch (e) {
    return { rows: null, error: errorMessage(e) };
  }
}

export type ImportEventInput = {
  type: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  opponent: string;
  notes: string;
};

export type ImportState = { error: string | null; count: number };

export async function bulkImportEvents(rows: ImportEventInput[]): Promise<ImportState> {
  await requireSession();

  const eventTypes = new Set<string>(EVENT_TYPES);
  const data = rows
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date))
    .map((r) => {
      const startsAt = combineDateTime(r.date, r.startTime) ?? new Date(`${r.date}T00:00:00`);
      const endsAt = r.endTime ? combineDateTime(r.date, r.endTime) : null;
      return {
        type: eventTypes.has(r.type) ? r.type : "PRACTICE",
        title: r.title.trim(),
        startsAt,
        endsAt: endsAt && endsAt > startsAt ? endsAt : null,
        location: r.location.trim(),
        opponent: r.opponent.trim() || null,
        notes: r.notes.trim(),
      };
    });

  if (data.length === 0) return { error: "No valid events to import.", count: 0 };

  await prisma.event.createMany({ data });

  return { error: null, count: data.length };
}

// ---- Roster photo import ----

type RawRosterPlayer = {
  firstName: string;
  lastName: string;
  jersey: number | null;
  positions: string;
  heightIn: number | null;
  weightLb: number | null;
  classYear: string;
};

const ROSTER_SCHEMA = {
  type: "object",
  properties: {
    players: {
      type: "array",
      items: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          jersey: { anyOf: [{ type: "integer" }, { type: "null" }] },
          positions: { type: "string", description: "comma-separated position codes" },
          heightIn: { anyOf: [{ type: "integer" }, { type: "null" }] },
          weightLb: { anyOf: [{ type: "integer" }, { type: "null" }] },
          classYear: { type: "string" },
        },
        required: ["firstName", "lastName", "jersey", "positions", "heightIn", "weightLb", "classYear"],
        additionalProperties: false,
      },
    },
  },
  required: ["players"],
  additionalProperties: false,
};

function rosterPrompt(sport: string, positions: string[]): string {
  return `You are extracting a ${sport} team roster from a photo — a printed roster sheet, program, spreadsheet, or handwritten list. Read every player row you can find.

For each player:
- firstName, lastName: split from the full name shown.
- jersey: the player's number as an integer, or null if not shown.
- positions: comma-separated position codes chosen ONLY from this list: ${positions.join(", ")}. Map whatever position label the photo uses to the closest code in that list. Leave as an empty string if no position is shown or none map.
- heightIn: total height in inches (e.g. 5'10" -> 70), or null if not shown.
- weightLb: weight in pounds as an integer, or null if not shown.
- classYear: the player's class/grade as shown (e.g. "Senior", "12", "Sr"), or empty string if not shown.

Return every player row you can read, even if some fields are uncertain — leave uncertain fields empty/null rather than guessing wildly. Skip rows that are clearly headers or not real players.`;
}

export type RosterPhotoResult =
  | { rows: ImportRow[]; duplicateNames: string[]; existingNames: string[]; error: null }
  | { rows: null; duplicateNames: []; existingNames: []; error: string };

export async function parseRosterPhoto(
  base64: string,
  mediaType: string
): Promise<RosterPhotoResult> {
  try {
    await requireSession();
    assertUsableImage(base64, mediaType);

    const [team, preset, existingPlayers] = await Promise.all([
      getTeam(),
      getTeamPreset(),
      prisma.player.findMany({
        where: { status: { in: ["ACTIVE", "INJURED"] } },
        select: { firstName: true, lastName: true },
      }),
    ]);

    const extracted = await extractFromImage<{ players: RawRosterPlayer[] }>({
      base64,
      mediaType,
      schema: ROSTER_SCHEMA,
      prompt: rosterPrompt(team?.sport || "Football", preset.positions),
    });

    const parsed = extracted.players.filter((p) => p.firstName.trim() || p.lastName.trim());
    if (parsed.length === 0) {
      return { rows: null, duplicateNames: [], existingNames: [], error: "Couldn't find any players in that photo — try a clearer, more direct shot." };
    }

    const rows: ImportRow[] = parsed.map((p, i) => ({
      key: String(i),
      firstName: p.firstName.trim() || "Unknown",
      lastName: p.lastName.trim(),
      jersey: p.jersey,
      positions: p.positions,
      heightIn: p.heightIn,
      weightLb: p.weightLb,
      classYear: p.classYear,
      sourcePositions: "",
    }));

    const nameCounts = new Map<string, number>();
    for (const r of rows) {
      const full = `${r.firstName} ${r.lastName}`;
      nameCounts.set(full, (nameCounts.get(full) ?? 0) + 1);
    }
    const existingNames = new Set(
      existingPlayers.map((p) => `${p.firstName} ${p.lastName}`.toLowerCase())
    );

    const duplicateNames = new Set<string>();
    const alreadyOnRoster = new Set<string>();
    for (const r of rows) {
      const full = `${r.firstName} ${r.lastName}`;
      if ((nameCounts.get(full) ?? 0) > 1) duplicateNames.add(full);
      if (existingNames.has(full.toLowerCase())) {
        duplicateNames.add(full);
        alreadyOnRoster.add(full);
      }
    }

    return {
      rows,
      duplicateNames: [...duplicateNames],
      existingNames: [...alreadyOnRoster],
      error: null,
    };
  } catch (e) {
    return { rows: null, duplicateNames: [], existingNames: [], error: errorMessage(e) };
  }
}
