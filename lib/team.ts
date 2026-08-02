import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getPreset } from "@/lib/ratings/presets";

export const getTeam = cache(async () => prisma.team.findFirst());

export async function getTeamPreset() {
  const team = await getTeam();
  return getPreset(team?.sport);
}
