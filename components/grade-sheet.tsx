import type { Grade, User } from "@prisma/client";
import { saveGrade } from "@/lib/actions/grades";
import {
  POSITION_GRADE_CATEGORIES,
  primaryPosition,
  ratingTier,
} from "@/lib/ratings/defaults";

function gradeLetter(v: number): string {
  if (v >= 97) return "A+";
  if (v >= 93) return "A";
  if (v >= 90) return "A−";
  if (v >= 87) return "B+";
  if (v >= 83) return "B";
  if (v >= 80) return "B−";
  if (v >= 77) return "C+";
  if (v >= 73) return "C";
  if (v >= 70) return "C−";
  if (v >= 67) return "D+";
  if (v >= 63) return "D";
  if (v >= 60) return "D−";
  return "F";
}

type PlayerRow = {
  id: string;
  name: string;
  jersey: number | null;
  positions: string;
  ovr: number;
};

export function GradeSheet({
  eventId,
  players,
  myGrades,
  allGrades,
}: {
  eventId: string;
  players: PlayerRow[];
  myGrades: Map<string, Grade>; // playerId -> current coach's grade
  allGrades: (Grade & { coach: User })[];
}) {
  const othersByPlayer = new Map<string, (Grade & { coach: User })[]>();
  for (const g of allGrades) {
    if (!othersByPlayer.has(g.playerId)) othersByPlayer.set(g.playerId, []);
    othersByPlayer.get(g.playerId)!.push(g);
  }

  return (
    <div className="divide-y divide-slate-100">
      {players.map((p) => {
        const mine = myGrades.get(p.id);
        const categories =
          POSITION_GRADE_CATEGORIES[primaryPosition(p.positions)] ??
          POSITION_GRADE_CATEGORIES.ATH;
        const myCategories: Record<string, number> = mine
          ? JSON.parse(mine.categoriesJson || "{}")
          : {};
        const others = (othersByPlayer.get(p.id) ?? []).filter(
          (g) => g.id !== mine?.id
        );
        const tier = ratingTier(p.ovr);

        return (
          <details key={p.id} className="group">
            <summary className="py-3 flex items-center justify-between gap-3 cursor-pointer list-none">
              <div className="min-w-0 flex items-center gap-2">
                <span className="font-mono text-slate-400 text-sm w-7 shrink-0">
                  {p.jersey ?? "—"}
                </span>
                <span className="font-medium text-sm truncate">{p.name}</span>
                <span className="text-xs text-slate-400">{p.positions}</span>
                <span className={`badge ${tier.bg}`}>{p.ovr} OVR</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {mine?.overall != null && (
                  <span className="badge bg-slate-900 text-white">
                    {gradeLetter(mine.overall)} · {mine.overall}
                  </span>
                )}
                {mine && mine.overall == null && (
                  <span className="badge bg-slate-100 text-slate-600">graded</span>
                )}
                {others.length > 0 && (
                  <span className="text-xs text-slate-400">
                    +{others.length} other
                  </span>
                )}
                <span className="text-slate-400 text-xs group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </div>
            </summary>

            <form
              action={saveGrade.bind(null, eventId, p.id)}
              className="pb-4 pl-9 pr-2 space-y-3"
            >
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="label" htmlFor={`overall-${p.id}`}>
                    Overall (0–100)
                  </label>
                  <input
                    id={`overall-${p.id}`}
                    name="overall"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={mine?.overall ?? ""}
                    className="input w-28"
                  />
                </div>
                {categories.map((cat) => (
                  <div key={cat}>
                    <label className="label" htmlFor={`cat-${p.id}-${cat}`}>
                      {cat}
                    </label>
                    <input
                      id={`cat-${p.id}-${cat}`}
                      name={`cat:${cat}`}
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={myCategories[cat] ?? ""}
                      className="input w-24"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="label" htmlFor={`notes-${p.id}`}>
                    Notes
                  </label>
                  <input
                    id={`notes-${p.id}`}
                    name="notes"
                    defaultValue={mine?.notes ?? ""}
                    placeholder="e.g. great motor, missed assignments on 3rd down"
                    className="input"
                  />
                </div>
                <button type="submit" className="btn-primary shrink-0">
                  {mine ? "Update grade" : "Save grade"}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Category grades adjust this player&apos;s{" "}
                {primaryPosition(p.positions)} attributes (max ±2 per event;
                games count double). Overall alone gives a small
                effort/awareness nudge.
              </p>
              {others.length > 0 && (
                <div className="text-xs text-slate-500 space-y-0.5">
                  {others.map((g) => (
                    <div key={g.id}>
                      {g.coach.name}:{" "}
                      {g.overall != null
                        ? `${gradeLetter(g.overall)} (${g.overall})`
                        : "detailed"}
                      {g.notes ? ` — “${g.notes}”` : ""}
                    </div>
                  ))}
                </div>
              )}
            </form>
          </details>
        );
      })}
    </div>
  );
}
