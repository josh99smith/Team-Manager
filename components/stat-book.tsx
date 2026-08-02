import type { StatLine } from "@prisma/client";
import type { StatDef } from "@/lib/ratings/presets";
import { saveStatLine } from "@/lib/actions/stats";

type PlayerRow = {
  id: string;
  name: string;
  jersey: number | null;
  positions: string;
};

export function StatBook({
  eventId,
  players,
  statLines,
  statDefs,
}: {
  eventId: string;
  players: PlayerRow[];
  statLines: StatLine[];
  statDefs: StatDef[];
}) {
  const byPlayer = new Map(statLines.map((s) => [s.playerId, s]));
  const groups = [...new Set(statDefs.map((d) => d.group))];

  return (
    <div className="divide-y divide-slate-100">
      {players.map((p) => {
        const line = byPlayer.get(p.id);
        const stats: Record<string, number> = line
          ? JSON.parse(line.statsJson || "{}")
          : {};
        const entered = Object.keys(stats).length > 0;

        return (
          <details key={p.id} className="group">
            <summary className="py-3 flex items-center justify-between gap-3 cursor-pointer list-none">
              <div className="min-w-0 flex items-center gap-2">
                <span className="font-mono text-slate-400 text-sm w-7 shrink-0">
                  {p.jersey ?? "—"}
                </span>
                <span className="font-medium text-sm truncate">{p.name}</span>
                <span className="text-xs text-slate-400">{p.positions}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {entered && (
                  <span className="text-xs text-slate-500 truncate max-w-64">
                    {Object.entries(stats)
                      .slice(0, 4)
                      .map(([k, v]) => {
                        const def = statDefs.find((d) => d.key === k);
                        return `${v} ${def?.label ?? k}`;
                      })
                      .join(" · ")}
                    {Object.keys(stats).length > 4 ? " …" : ""}
                  </span>
                )}
                <span className="text-slate-400 text-xs group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </div>
            </summary>

            <form
              action={saveStatLine.bind(null, eventId, p.id)}
              className="pb-4 pl-9 pr-2 space-y-3"
            >
              {groups.map((group) => (
                <div key={group}>
                  <div className="label">{group}</div>
                  <div className="flex flex-wrap gap-2">
                    {statDefs
                      .filter((d) => d.group === group)
                      .map((d) => (
                        <label key={d.key} className="text-xs text-slate-500">
                          {d.label}
                          <input
                            name={`stat:${d.key}`}
                            type="number"
                            step="any"
                            defaultValue={stats[d.key] ?? ""}
                            className="input mt-0.5 w-20 px-2 py-1"
                          />
                        </label>
                      ))}
                  </div>
                </div>
              ))}
              <button type="submit" className="btn-primary">
                {entered ? "Update stats" : "Save stats"}
              </button>
            </form>
          </details>
        );
      })}
    </div>
  );
}
