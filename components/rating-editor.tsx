"use client";

import { useMemo, useState, useTransition } from "react";
import { saveRatings } from "@/lib/actions/ratings";

export type RatingRow = {
  attributeId: string;
  name: string;
  value: number;
  countsTowardOvr: boolean;
  isOverride: boolean;
};

export type RatingGroup = { category: string; rows: RatingRow[] };

function valueColor(v: number): string {
  if (v >= 90) return "#a855f7";
  if (v >= 80) return "#22c55e";
  if (v >= 70) return "#3b82f6";
  if (v >= 60) return "#eab308";
  return "#ef4444";
}

export function RatingEditor({
  playerId,
  groups,
}: {
  playerId: string;
  groups: RatingGroup[];
}) {
  const initial = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of groups) for (const r of g.rows) m[r.attributeId] = r.value;
    return m;
  }, [groups]);

  const [values, setValues] = useState<Record<string, number>>(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const changed = Object.entries(values).filter(([id, v]) => v !== initial[id]);

  function save() {
    const changes = Object.fromEntries(changed);
    startTransition(async () => {
      await saveRatings(playerId, changes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
        {groups.map((g) => (
          <div key={g.category}>
            <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
              {g.category}
            </h3>
            <div className="space-y-2.5">
              {g.rows.map((r) => {
                const v = values[r.attributeId] ?? r.value;
                const dirty = v !== initial[r.attributeId];
                return (
                  <div key={r.attributeId} className="flex items-center gap-3">
                    <span
                      className={`text-sm w-36 shrink-0 truncate ${
                        r.countsTowardOvr ? "text-slate-800" : "text-slate-400"
                      }`}
                      title={
                        r.countsTowardOvr
                          ? "Counts toward OVR at this position"
                          : "Not weighted for this position"
                      }
                    >
                      {r.name}
                      {r.countsTowardOvr && <span className="text-slate-400"> •</span>}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={99}
                      value={v}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [r.attributeId]: parseInt(e.target.value, 10),
                        }))
                      }
                      className="flex-1 h-6 cursor-pointer"
                      style={{ accentColor: valueColor(v) }}
                      aria-label={`${r.name} rating`}
                    />
                    <span
                      className={`w-9 text-right font-mono text-sm font-semibold ${
                        dirty ? "text-slate-900" : "text-slate-500"
                      }`}
                      style={{ color: dirty ? valueColor(v) : undefined }}
                    >
                      {v}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <div className="flex items-center gap-3 bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-lg px-4 py-3">
          {saved && changed.length === 0 && (
            <span className="text-sm font-medium text-green-600">✓ Ratings saved</span>
          )}
          {changed.length > 0 && (
            <>
              <span className="text-sm text-slate-500">
                {changed.length} unsaved change{changed.length === 1 ? "" : "s"}
              </span>
              <button
                onClick={() => setValues(initial)}
                disabled={pending}
                className="btn-secondary"
              >
                Discard
              </button>
            </>
          )}
          <button
            onClick={save}
            disabled={pending || changed.length === 0}
            className="btn-primary"
          >
            {pending ? "Saving…" : "Save ratings"}
          </button>
        </div>
      </div>
    </div>
  );
}
