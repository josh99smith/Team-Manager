"use client";

import { useMemo, useState, useActionState } from "react";
import { saveGrade, type SaveState } from "@/lib/actions/grades";
import { ratingTier } from "@/lib/ratings/defaults";

export function gradeLetter(v: number): string {
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

const LETTER_BUTTONS: { label: string; value: number }[] = [
  { label: "A+", value: 98 },
  { label: "A", value: 95 },
  { label: "B", value: 85 },
  { label: "C", value: 75 },
  { label: "D", value: 65 },
  { label: "F", value: 50 },
];

function overallColor(v: number): string {
  if (v >= 90) return "#a855f7";
  if (v >= 80) return "#22c55e";
  if (v >= 70) return "#3b82f6";
  if (v >= 60) return "#eab308";
  return "#ef4444";
}

export type SkillSpec = { key: string; name: string; current: number };

export type GradeRowData = {
  id: string;
  name: string;
  jersey: number | null;
  positions: string;
  primaryPosition: string;
  ovr: number;
  skills: SkillSpec[];
  mine: {
    overall: number | null;
    cats: Record<string, number>; // attribute key -> 0-100
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

  // Overall grade: slider + letter buttons, optional until touched
  const [overall, setOverall] = useState<number | null>(p.mine?.overall ?? null);

  // Skill sliders start at the saved grade, else at the player's current
  // rating ("played at their level"). Only touched skills are submitted.
  const initialSkills = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of p.skills) m[s.key] = p.mine?.cats[s.key] ?? s.current;
    return m;
  }, [p]);
  const [skillValues, setSkillValues] = useState(initialSkills);
  const [touched, setTouched] = useState<Set<string>>(
    () => new Set(Object.keys(p.mine?.cats ?? {}))
  );

  function setSkill(key: string, value: number) {
    setSkillValues((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => new Set(prev).add(key));
  }
  function clearSkill(key: string) {
    setSkillValues((prev) => ({ ...prev, [key]: initialSkills[key] }));
    setTouched((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

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
          <span className="text-xs text-slate-400">{p.primaryPosition}</span>
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
        <form action={formAction} className="pb-5 pl-2 sm:pl-9 pr-2 space-y-5">
          {/* Overall grade: letter buttons + fine slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="label mb-0">Overall grade</span>
              {overall != null ? (
                <span className="flex items-center gap-2">
                  <span
                    className="badge text-white font-bold"
                    style={{ backgroundColor: overallColor(overall) }}
                  >
                    {gradeLetter(overall)} · {overall}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOverall(null)}
                    className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    clear
                  </button>
                </span>
              ) : (
                <span className="text-xs text-slate-400">not graded</span>
              )}
            </div>
            <input type="hidden" name="overall" value={overall ?? ""} />
            <div className="flex gap-1.5 mb-2">
              {LETTER_BUTTONS.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => setOverall(b.value)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-bold cursor-pointer transition-colors ${
                    overall != null && gradeLetter(overall)[0] === b.label[0] &&
                    (b.label.length === 1 || gradeLetter(overall) === b.label)
                      ? "text-white border-transparent"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  style={
                    overall != null &&
                    gradeLetter(overall)[0] === b.label[0] &&
                    (b.label.length === 1 || gradeLetter(overall) === b.label)
                      ? { backgroundColor: overallColor(b.value) }
                      : undefined
                  }
                >
                  {b.label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={overall ?? 75}
              onChange={(e) => setOverall(parseInt(e.target.value, 10))}
              className="w-full h-6 cursor-pointer"
              style={{ accentColor: overall != null ? overallColor(overall) : "#94a3b8" }}
              aria-label="Overall grade slider"
            />
          </div>

          {/* Position-specific skill sliders */}
          {p.skills.length > 0 && (
            <div>
              <span className="label">
                {p.primaryPosition} skills{" "}
                <span className="normal-case font-normal text-slate-400">
                  — sliders start at the player&apos;s current rating; above = played
                  better, below = worse
                </span>
              </span>
              <div className="space-y-2.5 mt-1.5">
                {p.skills.map((s) => {
                  const v = skillValues[s.key];
                  const isTouched = touched.has(s.key);
                  const delta = v - s.current;
                  return (
                    <div key={s.key} className="flex items-center gap-3">
                      {isTouched && (
                        <input type="hidden" name={`skill:${s.key}`} value={v} />
                      )}
                      <span
                        className={`text-sm w-36 shrink-0 truncate ${isTouched ? "text-slate-800 font-medium" : "text-slate-500"}`}
                        title={`Current rating: ${s.current}`}
                      >
                        {s.name}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={v}
                        onChange={(e) => setSkill(s.key, parseInt(e.target.value, 10))}
                        className="flex-1 h-6 cursor-pointer"
                        style={{
                          accentColor: !isTouched
                            ? "#cbd5e1"
                            : delta > 0
                              ? "#22c55e"
                              : delta < 0
                                ? "#ef4444"
                                : "#64748b",
                        }}
                        aria-label={`${s.name} grade`}
                      />
                      <span
                        className={`w-16 text-right font-mono text-sm shrink-0 ${
                          !isTouched
                            ? "text-slate-300"
                            : delta > 0
                              ? "text-green-600 font-semibold"
                              : delta < 0
                                ? "text-red-600 font-semibold"
                                : "text-slate-500"
                        }`}
                      >
                        {isTouched
                          ? `${v}${delta !== 0 ? ` ${delta > 0 ? "▲" : "▼"}` : ""}`
                          : "—"}
                      </span>
                      <button
                        type="button"
                        onClick={() => clearSkill(s.key)}
                        disabled={!isTouched}
                        className="text-xs text-slate-300 enabled:text-slate-400 enabled:hover:text-red-600 enabled:cursor-pointer shrink-0"
                        title="Don't grade this skill"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
            Graded skills adjust those exact attributes (max ±2 per event; games
            count double). The overall grade alone gives a small
            effort/awareness nudge.
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
