import Link from "next/link";
import { getTeamPreset } from "@/lib/team";
import { getDepthOrder, getRosterWithOvrs } from "@/lib/depth";
import { moveDepth, resetDepth } from "@/lib/actions/depth";
import { ratingTier } from "@/lib/ratings/defaults";

export default async function DepthChartPage() {
  const preset = await getTeamPreset();
  const { players, ovrs } = await getRosterWithOvrs();

  const columns = [];
  for (const position of preset.positions) {
    const rows = await getDepthOrder(position, players, ovrs);
    if (rows.length > 0) columns.push({ position, rows });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Depth chart</h1>
        <p className="text-slate-500 text-sm mt-1">
          Ordered by OVR by default — use the arrows to set your own order.
          Positions come from each player&apos;s profile.
        </p>
      </div>

      {columns.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          No players with positions yet. Assign positions on player profiles to
          build the depth chart.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {columns.map(({ position, rows }) => {
            const manual = rows.some((r) => r.pinned);
            return (
              <div key={position} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-lg">{position}</h2>
                  {manual && (
                    <form action={resetDepth.bind(null, position)}>
                      <button
                        className="text-xs text-slate-400 hover:text-slate-800 cursor-pointer"
                        title="Discard manual order and sort by OVR"
                      >
                        ↺ Reset to OVR order
                      </button>
                    </form>
                  )}
                </div>
                <ol className="space-y-1.5">
                  {rows.map((row, i) => {
                    const tier = ratingTier(row.ovr);
                    return (
                      <li
                        key={row.player.id}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                          i === 0 ? "bg-slate-900 text-white" : "bg-slate-50"
                        }`}
                      >
                        <span
                          className={`text-xs font-bold w-6 text-center shrink-0 ${
                            i === 0 ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <Link
                          href={`/roster/${row.player.id}`}
                          className="text-sm font-medium truncate flex-1 hover:underline"
                        >
                          {row.player.firstName} {row.player.lastName}
                          {row.player.status === "INJURED" && (
                            <span className="ml-1.5 text-xs text-red-400">✚</span>
                          )}
                        </Link>
                        <span className={`badge font-bold ${tier.bg}`}>{row.ovr}</span>
                        <div className="flex flex-col shrink-0">
                          <form action={moveDepth.bind(null, position, row.player.id, "up")}>
                            <button
                              disabled={i === 0}
                              className="text-[10px] leading-none px-1 disabled:opacity-20 cursor-pointer"
                              aria-label="Move up"
                            >
                              ▲
                            </button>
                          </form>
                          <form action={moveDepth.bind(null, position, row.player.id, "down")}>
                            <button
                              disabled={i === rows.length - 1}
                              className="text-[10px] leading-none px-1 disabled:opacity-20 cursor-pointer"
                              aria-label="Move down"
                            >
                              ▼
                            </button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
