import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttributeDefs, getOvrForPlayers } from "@/lib/ratings/engine";
import { DEFAULT_RATING, primaryPosition } from "@/lib/ratings/defaults";
import { toCsv } from "@/lib/stats";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role === "PLAYER") {
    return new Response("Unauthorized", { status: 401 });
  }

  const [defs, players] = await Promise.all([
    getAttributeDefs(),
    prisma.player.findMany({
      where: { status: { in: ["ACTIVE", "INJURED"] } },
      orderBy: [{ lastName: "asc" }],
    }),
  ]);
  const [ovrs, allRatings] = await Promise.all([
    getOvrForPlayers(players),
    prisma.playerRating.findMany({
      where: { playerId: { in: players.map((p) => p.id) } },
    }),
  ]);
  const byPlayer = new Map<string, Map<string, number>>();
  for (const r of allRatings) {
    if (!byPlayer.has(r.playerId)) byPlayer.set(r.playerId, new Map());
    byPlayer.get(r.playerId)!.set(r.attributeId, r.value);
  }

  const headers = ["Jersey", "Name", "Position", "OVR", ...defs.map((d) => d.name)];
  const rows = players.map((p) => [
    p.jersey ?? "",
    `${p.firstName} ${p.lastName}`,
    primaryPosition(p.positions),
    ovrs.get(p.id) ?? DEFAULT_RATING,
    ...defs.map((d) => byPlayer.get(p.id)?.get(d.id) ?? DEFAULT_RATING),
  ]);

  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="ratings.csv"',
    },
  });
}
