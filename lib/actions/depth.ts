"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { getDepthOrder, getRosterWithOvrs } from "@/lib/depth";

// Move a player up/down one slot at a position. Materializes the current
// (manual + OVR-suggested) order into explicit ranks, then swaps.
export async function moveDepth(
  position: string,
  playerId: string,
  direction: "up" | "down"
) {
  await requireSession();
  const { players, ovrs } = await getRosterWithOvrs();
  const order = await getDepthOrder(position, players, ovrs);

  const ids = order.map((r) => r.player.id);
  const i = ids.indexOf(playerId);
  if (i === -1) return;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];

  await prisma.$transaction([
    prisma.depthChartEntry.deleteMany({ where: { position } }),
    prisma.depthChartEntry.createMany({
      data: ids.map((pid, rank) => ({ position, playerId: pid, rank })),
    }),
  ]);
  revalidatePath("/depth-chart");
}

// Drop manual ordering for a position — back to pure OVR order.
export async function resetDepth(position: string) {
  await requireSession();
  await prisma.depthChartEntry.deleteMany({ where: { position } });
  revalidatePath("/depth-chart");
}
