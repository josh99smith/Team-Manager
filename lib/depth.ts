import { prisma } from "@/lib/prisma";
import { getOvrForPlayers } from "@/lib/ratings/engine";
import type { Player } from "@prisma/client";

export type DepthRow = { player: Player; ovr: number; pinned: boolean };

// Ordered depth list for a position: manually ranked entries first (by rank),
// then everyone else who plays the position in OVR order.
export async function getDepthOrder(
  position: string,
  players: Player[],
  ovrs: Map<string, number>
): Promise<DepthRow[]> {
  const eligible = players.filter((p) =>
    p.positions.split(",").filter(Boolean).includes(position)
  );
  const entries = await prisma.depthChartEntry.findMany({
    where: { position },
    orderBy: { rank: "asc" },
  });
  const byPlayer = new Map(entries.map((e) => [e.playerId, e.rank]));

  const pinned = eligible
    .filter((p) => byPlayer.has(p.id))
    .sort((a, b) => byPlayer.get(a.id)! - byPlayer.get(b.id)!);
  const rest = eligible
    .filter((p) => !byPlayer.has(p.id))
    .sort((a, b) => (ovrs.get(b.id) ?? 0) - (ovrs.get(a.id) ?? 0));

  return [
    ...pinned.map((p) => ({ player: p, ovr: ovrs.get(p.id) ?? 60, pinned: true })),
    ...rest.map((p) => ({ player: p, ovr: ovrs.get(p.id) ?? 60, pinned: false })),
  ];
}

export async function getRosterWithOvrs() {
  const players = await prisma.player.findMany({
    where: { status: { in: ["ACTIVE", "INJURED"] } },
    orderBy: { lastName: "asc" },
  });
  const ovrs = await getOvrForPlayers(players);
  return { players, ovrs };
}
