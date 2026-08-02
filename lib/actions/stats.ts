"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export type SaveState = { ok: boolean; error: string | null };

// Merge play-by-play increments into each player's stat line for the event.
// Negative increments revert a play (undo).
export async function recordPlay(
  eventId: string,
  entries: { playerId: string; stats: Record<string, number> }[]
): Promise<SaveState> {
  try {
    await requireSession();

    for (const entry of entries) {
      const existing = await prisma.statLine.findUnique({
        where: { playerId_eventId: { playerId: entry.playerId, eventId } },
      });
      const stats: Record<string, number> = existing
        ? JSON.parse(existing.statsJson || "{}")
        : {};
      for (const [key, delta] of Object.entries(entry.stats)) {
        if (!Number.isFinite(delta)) continue;
        const next = (stats[key] ?? 0) + delta;
        if (next === 0) delete stats[key];
        else stats[key] = next;
      }
      await prisma.statLine.upsert({
        where: { playerId_eventId: { playerId: entry.playerId, eventId } },
        create: { playerId: entry.playerId, eventId, statsJson: JSON.stringify(stats) },
        update: { statsJson: JSON.stringify(stats) },
      });
    }

    revalidatePath(`/events/${eventId}`);
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error && e.message
          ? e.message
          : "Couldn't record the play. Check your connection and try again.",
    };
  }
}

export async function saveStatLine(
  eventId: string,
  playerId: string,
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  try {
    await requireSession();

    const stats: Record<string, number> = {};
    for (const [key, raw] of formData.entries()) {
      if (!key.startsWith("stat:")) continue;
      const value = parseFloat(String(raw).trim());
      if (!Number.isNaN(value) && value !== 0) stats[key.slice(5)] = value;
    }

    await prisma.statLine.upsert({
      where: { playerId_eventId: { playerId, eventId } },
      create: { playerId, eventId, statsJson: JSON.stringify(stats) },
      update: { statsJson: JSON.stringify(stats) },
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/roster/${playerId}`);
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error && e.message
          ? e.message
          : "Something went wrong while saving. Please try again.",
    };
  }
}
