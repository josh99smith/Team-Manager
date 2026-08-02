"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function saveStatLine(
  eventId: string,
  playerId: string,
  formData: FormData
) {
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
}
