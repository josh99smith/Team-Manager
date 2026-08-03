"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireHeadCoach } from "@/lib/auth";
import { isValidHex, clampForUse } from "@/lib/theme";

export type FormState = { error: string | null; ok?: boolean };

export async function saveTeamSettings(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireHeadCoach();

  const name = String(formData.get("name") ?? "").trim();
  const season = String(formData.get("season") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "").trim();
  const secondaryColor = String(formData.get("secondaryColor") ?? "").trim();

  if (!name) return { error: "Team name is required." };
  if (!isValidHex(primaryColor) || !isValidHex(secondaryColor)) {
    return { error: "Colors must be valid — pick them from the color swatches." };
  }

  const team = await prisma.team.findFirst();
  if (!team) return { error: "No team found." };

  await prisma.team.update({
    where: { id: team.id },
    data: {
      name,
      season,
      // Very light colors are gently deepened so they stay readable as
      // button/header text and as link color on a white page.
      primaryColor: clampForUse(primaryColor),
      secondaryColor: clampForUse(secondaryColor),
    },
  });

  // The whole app shell (header, buttons, active states) reads team colors,
  // so bust every cached layout, not just this page.
  revalidatePath("/", "layout");
  return { error: null, ok: true };
}
