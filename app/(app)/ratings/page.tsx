import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  getAttributeDefs,
  getOvrForPlayers,
} from "@/lib/ratings/engine";
import {
  CATEGORIES,
  DEFAULT_RATING,
  ratingTier,
  primaryPosition,
} from "@/lib/ratings/defaults";

export default async function RatingsPage() {
  const session = await auth();
  const [players, defs] = await Promise.all([
    prisma.player.findMany({
      where: { status: { in: ["ACTIVE", "INJURED"] } },
      orderBy: [{ lastName: "asc" }],
    }),
    getAttributeDefs(),
  ]);

  const [ovrs, allRatings, weekHistory] = await Promise.all([
    getOvrForPlayers(players),
    prisma.playerRating.findMany({
      where: { playerId: { in: players.map((p) => p.id) } },
    }),
    prisma.ratingHistory.findMany({
      where: {
        attributeId: null,
        playerId: { in: players.map((p) => p.id) },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const ratingsByPlayer = new Map<string, Map<string, number>>();
  for (const r of allRatings) {
    if (!ratingsByPlayer.has(r.playerId)) ratingsByPlayer.set(r.playerId, new Map());
    ratingsByPlayer.get(r.playerId)!.set(r.attributeId, r.value);
  }

  // 7-day OVR movement per player (first vs last snapshot).
  const movers = new Map<string, number>();
  const firstSnap = new Map<string, number>();
  for (const h of weekHistory) {
    if (!firstSnap.has(h.playerId)) firstSnap.set(h.playerId, h.value);
    movers.set(h.playerId, h.value - firstSnap.get(h.playerId)!);
  }

  const defsByCategory = CATEGORIES.map((cat) => ({
    cat,
    ids: defs.filter((d) => d.category === cat).map((d) => d.id),
  }));

  const catAvg = (playerId: string, ids: string[]) => {
    const mine = ratingsByPlayer.get(playerId);
    const vals = ids.map((id) => mine?.get(id) ?? DEFAULT_RATING);
    return Math.round(vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length));
  };

  const rows = players
    .map((p) => ({ p, ovr: ovrs.get(p.id) ?? DEFAULT_RATING }))
    .sort((a, b) => b.ovr - a.ovr);

  const teamAvg =
    rows.length > 0
      ? Math.round(rows.reduce((a, r) => a + r.ovr, 0) / rows.length)
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Player ratings</h1>
          <p className="text-slate-500 text-sm mt-1">
            Team average OVR: <span className="font-semibold">{teamAvg}</span> ·
            ratings move with practice and game grades
          </p>
        </div>
        {session?.user.role === "HEAD_COACH" && (
          <Link href="/ratings/weights" className="btn-secondary">
            Edit position weights
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          No active players yet.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="px-3 py-3">#</th>
                <th className="px-3 py-3">Player</th>
                <th className="px-3 py-3">Pos</th>
                <th className="px-3 py-3">OVR</th>
                <th className="px-3 py-3">7-day</th>
                {CATEGORIES.map((c) => (
                  <th key={c} className="px-3 py-3">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, ovr }) => {
                const tier = ratingTier(ovr);
                const delta = movers.get(p.id) ?? 0;
                return (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2.5 font-mono text-slate-400">
                      {p.jersey ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/roster/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.firstName} {p.lastName}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">
                      {primaryPosition(p.positions)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`badge ${tier.bg} font-bold`}>{ovr}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {delta > 0 ? (
                        <span className="text-green-600 font-medium">▲ +{delta}</span>
                      ) : delta < 0 ? (
                        <span className="text-red-600 font-medium">▼ {delta}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    {defsByCategory.map(({ cat, ids }) => (
                      <td key={cat} className="px-3 py-2.5 text-slate-600">
                        {catAvg(p.id, ids)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-400 mt-3">
        Tiers: <span className="text-purple-700 font-medium">90+ elite</span> ·{" "}
        <span className="text-green-700 font-medium">80s starter</span> ·{" "}
        <span className="text-blue-700 font-medium">70s solid</span> ·{" "}
        <span className="text-yellow-700 font-medium">60s developing</span> ·{" "}
        <span className="text-red-700 font-medium">&lt;60 project</span>. Category
        columns are simple averages; OVR is position-weighted.
      </p>
    </div>
  );
}
