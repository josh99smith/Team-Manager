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

function NudgeButton({
  active,
  kind,
  onClick,
  label,
  title,
}: {
  active: boolean;
  kind: "up" | "down" | "zero";
  onClick: () => void;
  label: string;
  title: string;
}) {
  const activeStyle =
    kind === "up"
      ? "bg-green-600 text-white border-green-600"
      : kind === "down"
        ? "bg-red-600 text-white border-red-600"
        : "bg-slate-200 text-slate-600 border-slate-200";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`rounded-md border w-9 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
        active ? activeStyle : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

export type GradeRowData = {
  id: string;
  name: string;
  jersey: number | null;
  positions: string;
  primaryPosition: string;
  positionList: string[]; // every position this player plays, e.g. ["WR", "CB"]
  ovr: number;
  skills: SkillSpec[]; // union of skills across all their positions, deduped
  skillsByPosition: Record<string, string[]>; // position -> skill keys to show under that tab
  mine: {
    overall: number | null;
    cats: Record<string, number>; // attribute key -> nudge step
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
  const multiPosition = p.positionList.length > 1;
  const [activePosition, setActivePosition] = useState(
    p.positionList[0] ?? p.primaryPosition
  );
  const visibleSkillKeys = new Set(p.skillsByPosition[activePosition] ?? []);

  // Overall grade: slider + letter buttons, optional until touched
  const [overall, setOverall] = useState<number | null>(p.mine?.overall ?? null);

  // Skill nudges: -2..+2 per skill, 0/absent = not graded. Saved grades with
  // small values prefill (legacy 0-100 grades are ignored for prefill).
  const initialSteps = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of p.skills) {
      const saved = p.mine?.cats[s.key];
      if (saved != null && Math.abs(saved) <= 2) m[s.key] = saved;
    }
    return m;
  }, [p]);
  const [steps, setSteps] = useState<Record<string, number>>(initialSteps);

  function setStep(key: string, step: number) {
    setSteps((prev) => {
      const next = { ...prev };
      if (step === 0 || prev[key] === step) delete next[key];
      else next[key] = step;
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
          <span className="text-xs text-slate-400">{p.positionList.join(", ")}</span>
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

          {/* Position-specific skill nudges */}
          {p.skills.length > 0 && (
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                <span className="label mb-0">
                  {activePosition} skills{" "}
                  <span className="normal-case font-normal text-slate-400">
                    — tap ▲ / ▼ to move a skill by 1 or 2 points
                  </span>
                </span>
                {multiPosition && (
                  <div className="flex gap-1">
                    {p.positionList.map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setActivePosition(pos)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                          activePosition === pos
                            ? "bg-slate-900 text-white border-slate-900"
                            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {multiPosition && (
                <p className="text-xs text-slate-400 mb-2">
                  Grading as {activePosition} — nudges made under any tab all
                  count toward this one grade for the game.
                </p>
              )}
              {/* Hidden inputs for every graded skill, not just the active tab's,
                  so switching tabs doesn't drop nudges made elsewhere. */}
              {p.skills
                .filter((s) => (steps[s.key] ?? 0) !== 0 && !visibleSkillKeys.has(s.key))
                .map((s) => (
                  <input
                    key={s.key}
                    type="hidden"
                    name={`skill:${s.key}`}
                    value={steps[s.key]}
                  />
                ))}
              <div className="space-y-1.5 mt-1.5">
                {p.skills.filter((s) => visibleSkillKeys.has(s.key)).map((s) => {
                  const step = steps[s.key] ?? 0;
                  return (
                    <div key={s.key} className="flex items-center justify-between gap-3">
                      {step !== 0 && (
                        <input type="hidden" name={`skill:${s.key}`} value={step} />
                      )}
                      <span
                        className={`text-sm min-w-0 truncate ${step !== 0 ? "text-slate-800 font-medium" : "text-slate-600"}`}
                      >
                        {s.name}
                        <span
                          className={`ml-2 font-mono text-xs ${
                            step > 0
                              ? "text-green-600 font-bold"
                              : step < 0
                                ? "text-red-600 font-bold"
                                : "text-slate-400"
                          }`}
                        >
                          {s.current}
                          {step !== 0 &&
                            ` → ${s.current + step} (${step > 0 ? "+" : ""}${step})`}
                        </span>
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <NudgeButton active={step === -2} kind="down" onClick={() => setStep(s.key, -2)} label="▼▼" title={`${s.name} −2`} />
                        <NudgeButton active={step === -1} kind="down" onClick={() => setStep(s.key, -1)} label="▼" title={`${s.name} −1`} />
                        <NudgeButton active={step === 0} kind="zero" onClick={() => setStep(s.key, 0)} label="—" title={`${s.name} not graded`} />
                        <NudgeButton active={step === 1} kind="up" onClick={() => setStep(s.key, 1)} label="▲" title={`${s.name} +1`} />
                        <NudgeButton active={step === 2} kind="up" onClick={() => setStep(s.key, 2)} label="▲▲" title={`${s.name} +2`} />
                      </div>
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
            Skill nudges apply exactly as tapped (max ±2 per event). The overall
            grade alone gives a small effort/awareness nudge.
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
