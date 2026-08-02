"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export type SaveState = { ok: boolean; error: string | null };

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
