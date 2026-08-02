"use client";

import { useState, useActionState } from "react";
import { saveGrade, type SaveState } from "@/lib/actions/grades";
import { ratingTier } from "@/lib/ratings/defaults";

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

export type GradeRowData = {
  id: string;
  name: string;
  jersey: number | null;
  positions: string;
  primaryPosition: string;
  ovr: number;
  categories: string[];
  mine: {
    overall: number | null;
    cats: Record<string, number>;
    notes: string;
  } | null;
  others: { coach: string; overall: number | null; notes: string }[];
};

export function GradeSheet({
  eventId,
  players,
}: {
  eventId: string;
  players: GradeRowData[];
}) {
  return (
    <div className="divide-y divide-slate-100">
      {players.map((p) => (
        <GradeRow key={p.id} eventId={eventId} player={p} />
      ))}
    </div>
  );
}

function GradeRow({
  eventId,
  player: p,
}: {
  eventId: string;
  player: GradeRowData;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<SaveState, FormData>(
    saveGrade.bind(null, eventId, p.id),
    { ok: false, error: null }
  );
  const tier = ratingTier(p.ovr);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full py-3 flex items-center justify-between gap-3 cursor-pointer text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex items-center gap-2">
          <span className="font-mono text-slate-400 text-sm w-7 shrink-0">
            {p.jersey ?? "—"}
          </span>
          <span className="font-medium text-sm truncate">{p.name}</span>
          <span className="text-xs text-slate-400">{p.positions}</span>
          <span className={`badge ${tier.bg}`}>{p.ovr} OVR</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {p.mine?.overall != null && (
            <span className="badge bg-slate-900 text-white">
              {gradeLetter(p.mine.overall)} · {p.mine.overall}
            </span>
          )}
          {p.mine && p.mine.overall == null && (
            <span className="badge bg-slate-100 text-slate-600">graded</span>
          )}
          {p.others.length > 0 && (
            <span className="text-xs text-slate-400">+{p.others.length} other</span>
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
                defaultValue={p.mine?.overall ?? ""}
                className="input w-28"
              />
            </div>
            {p.categories.map((cat) => (
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
                  defaultValue={p.mine?.cats[cat] ?? ""}
                  className="input w-24"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-56">
              <label className="label" htmlFor={`notes-${p.id}`}>
                Notes
              </label>
              <input
                id={`notes-${p.id}`}
                name="notes"
                defaultValue={p.mine?.notes ?? ""}
                placeholder="e.g. great motor, missed assignments on 3rd down"
                className="input"
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {state.ok && !pending && (
                <span className="text-sm font-medium text-green-600">✓ Saved</span>
              )}
              <button type="submit" disabled={pending} className="btn-primary">
                {pending ? "Saving…" : p.mine ? "Update grade" : "Save grade"}
              </button>
            </div>
          </div>
          {state.error && (
            <p className="text-sm text-red-600 font-medium">⚠ {state.error}</p>
          )}
          <p className="text-xs text-slate-400">
            Category grades adjust this player&apos;s {p.primaryPosition}{" "}
            attributes (max ±2 per event; games count double). Overall alone
            gives a small effort/awareness nudge.
          </p>
          {p.others.length > 0 && (
            <div className="text-xs text-slate-500 space-y-0.5">
              {p.others.map((g, i) => (
                <div key={i}>
                  {g.coach}:{" "}
                  {g.overall != null
                    ? `${gradeLetter(g.overall)} (${g.overall})`
                    : "detailed"}
                  {g.notes ? ` — “${g.notes}”` : ""}
                </div>
              ))}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
