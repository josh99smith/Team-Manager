"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requireHeadCoach } from "@/lib/auth";
import { overrideAttribute } from "@/lib/ratings/engine";

export async function setAttributeRating(
  playerId: string,
  attributeId: string,
  formData: FormData
) {
  await requireSession();
  const value = parseInt(String(formData.get("value") ?? ""), 10);
  if (Number.isNaN(value)) return;
  await overrideAttribute(playerId, attributeId, value);
  revalidatePath(`/roster/${playerId}`);
  revalidatePath("/ratings");
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
