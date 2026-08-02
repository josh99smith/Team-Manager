"use client";

import { useState, useActionState } from "react";
import type { StatDef } from "@/lib/ratings/presets";
import { saveStatLine, type SaveState } from "@/lib/actions/stats";
import { Avatar } from "@/components/avatar";

export type StatRowData = {
  id: string;
  name: string;
  jersey: number | null;
  positions: string;
  stats: Record<string, number>;
};

export function StatBook({
  eventId,
  players,
  statDefs,
}: {
  eventId: string;
  players: StatRowData[];
  statDefs: StatDef[];
}) {
  const groups = [...new Set(statDefs.map((d) => d.group))];
  return (
    <div className="divide-y divide-slate-100">
      {players.map((p) => (
        <StatRow
          key={p.id}
          eventId={eventId}
          player={p}
          statDefs={statDefs}
          groups={groups}
        />
      ))}
    </div>
  );
}

function StatRow({
  eventId,
  player: p,
  statDefs,
  groups,
}: {
  eventId: string;
  player: StatRowData;
  statDefs: StatDef[];
  groups: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<SaveState, FormData>(
    saveStatLine.bind(null, eventId, p.id),
    { ok: false, error: null }
  );
  const entered = Object.keys(p.stats).length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full py-3 flex items-center justify-between gap-3 cursor-pointer text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex items-center gap-2">
          <span className="font-mono text-slate-400 text-sm w-6 shrink-0">
            {p.jersey ?? "—"}
          </span>
          <Avatar name={p.name} size="sm" />
          <span className="font-medium text-sm truncate">{p.name}</span>
          <span className="text-xs text-slate-400">{p.positions}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {entered && (
            <span className="text-xs text-slate-500 truncate max-w-64">
              {Object.entries(p.stats)
                .slice(0, 4)
                .map(([k, v]) => {
                  const def = statDefs.find((d) => d.key === k);
                  return `${v} ${def?.label ?? k}`;
                })
                .join(" · ")}
              {Object.keys(p.stats).length > 4 ? " …" : ""}
            </span>
          )}
          <span
            className={`text-slate-400 text-xs transition-transform ${open ? "rotate-180" : ""}`}
          >
            ▼
          </span>
        </div>
      </button>

      {open && (
        <form action={formAction} className="pb-4 pl-9 pr-2 space-y-3">
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
                        defaultValue={p.stats[d.key] ?? ""}
                        className="input mt-0.5 w-20 px-2 py-1"
                      />
                    </label>
                  ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Saving…" : entered ? "Update stats" : "Save stats"}
            </button>
            {state.ok && !pending && (
              <span className="text-sm font-medium text-green-600">✓ Saved</span>
            )}
          </div>
          {state.error && (
            <p className="text-sm text-red-600 font-medium">⚠ {state.error}</p>
          )}
        </form>
      )}
    </div>
  );
}
