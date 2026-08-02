import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeamPreset } from "@/lib/team";
import { sumStatLines, toCsv } from "@/lib/stats";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role === "PLAYER") {
    return new Response("Unauthorized", { status: 401 });
  }

  const [preset, players, statLines] = await Promise.all([
    getTeamPreset(),
    prisma.player.findMany({
      where: { status: { in: ["ACTIVE", "INJURED"] } },
      orderBy: [{ lastName: "asc" }],
    }),
    prisma.statLine.findMany(),
  ]);

  const linesByPlayer = new Map<string, typeof statLines>();
  for (const line of statLines) {
    if (!linesByPlayer.has(line.playerId)) linesByPlayer.set(line.playerId, []);
    linesByPlayer.get(line.playerId)!.push(line);
  }

  const headers = [
    "Jersey",
    "Name",
    "Games",
    ...preset.statDefs.map((d) => d.label),
  ];
  const rows = players.map((p) => {
    const lines = linesByPlayer.get(p.id) ?? [];
    const totals = sumStatLines(lines);
    return [
      p.jersey ?? "",
      `${p.firstName} ${p.lastName}`,
      lines.filter((l) => l.statsJson !== "{}").length,
      ...preset.statDefs.map((d) => totals[d.key] ?? 0),
    ];
  });

  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="season-stats.csv"',
    },
  });
}
