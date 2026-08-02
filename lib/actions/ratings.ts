"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requireHeadCoach } from "@/lib/auth";
import { overrideAttributes } from "@/lib/ratings/engine";

// Bulk-save manual rating overrides from the slider editor.
export async function saveRatings(
  playerId: string,
  changes: Record<string, number>
) {
  await requireSession();
  await overrideAttributes(playerId, changes);
  revalidatePath(`/roster/${playerId}`);
  revalidatePath("/ratings");
  revalidatePath("/depth-chart");
  revalidatePath("/");
}

// Replace the weight profile for one position. Entries: attributeId -> weight (0-100).
export async function saveWeights(position: string, formData: FormData) {
  await requireHeadCoach();

  const entries: { attributeId: string; weight: number }[] = [];
  for (const [key, raw] of formData.entries()) {
    if (!key.startsWith("w:")) continue;
    const attributeId = key.slice(2);
    const weight = Math.min(100, Math.max(0, parseInt(String(raw) || "0", 10) || 0));
    if (weight > 0) entries.push({ attributeId, weight });
  }

  await prisma.$transaction([
    prisma.positionWeight.deleteMany({ where: { position } }),
    prisma.positionWeight.createMany({
      data: entries.map((e) => ({ position, ...e })),
    }),
  ]);

  revalidatePath("/ratings");
  revalidatePath(`/ratings/weights`);
}
