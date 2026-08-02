"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { applyGrade } from "@/lib/ratings/engine";
import { CATEGORIES } from "@/lib/ratings/defaults";

const clamp100 = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

export async function saveGrade(
  eventId: string,
  playerId: string,
  formData: FormData
) {
  const session = await requireSession();

  const overallRaw = String(formData.get("overall") ?? "").trim();
  const overall = overallRaw ? clamp100(parseInt(overallRaw, 10)) : null;
  const notes = String(formData.get("notes") ?? "").trim();

  const categories: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    const raw = String(formData.get(`cat:${cat}`) ?? "").trim();
    if (raw) categories[cat] = clamp100(parseInt(raw, 10));
  }

  if (overall == null && Object.keys(categories).length === 0 && !notes) {
    return; // nothing to save
  }

  await applyGrade({
    playerId,
    eventId,
    coachId: session.user.id,
    overall,
    categories,
    notes,
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/roster/${playerId}`);
  revalidatePath("/ratings");
  revalidatePath("/");
}

export async function deleteGrade(gradeId: string) {
  const session = await requireSession();
  const grade = await prisma.grade.findUniqueOrThrow({ where: { id: gradeId } });
  if (grade.coachId !== session.user.id && session.user.role !== "HEAD_COACH") {
    throw new Error("You can only delete your own grades.");
  }

  // Revert this grade's rating adjustments before removing it.
  const applied: Record<string, number> = JSON.parse(grade.appliedJson || "{}");
  await prisma.$transaction([
    ...Object.entries(applied).map(([attributeId, delta]) =>
      prisma.playerRating.updateMany({
        where: { playerId: grade.playerId, attributeId },
        data: { value: { decrement: delta } },
      })
    ),
    prisma.grade.delete({ where: { id: gradeId } }),
  ]);

  revalidatePath(`/events/${grade.eventId}`);
  revalidatePath(`/roster/${grade.playerId}`);
  revalidatePath("/ratings");
}
