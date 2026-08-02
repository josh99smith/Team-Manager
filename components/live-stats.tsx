"use client";

import { useState, useTransition } from "react";
import type { QuickPlay } from "@/lib/ratings/quick-plays";
import { recordPlay } from "@/lib/actions/stats";
import { Avatar } from "@/components/avatar";

type PlayerChip = { id: string; name: string; jersey: number | null; positions: string };

type LogEntry = {
  id: number;
  summary: string;
  entries: { playerId: string; stats: Record<string, number> }[];
};

export function LiveStats({
  eventId,
  players,
  plays,
}: {
  eventId: string;
  players: PlayerChip[];
  plays: QuickPlay[];
}) {
  const [play, setPlay] = useState<QuickPlay | null>(null);
  const [roleIndex, setRoleIndex] = useState(0);
  // role key -> selected player ids
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [td, setTd] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [nextId, setNextId] = useState(1);

  const reset = () => {
    setPlay(null);
    setRoleIndex(0);
    setPicked({});
    setAmount(null);
    setCustomAmount("");
    setTd(false);
    setError(null);
  };

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? "?";

  function buildEntries(
    p: QuickPlay,
    pickedRoles: Record<string, string[]>,
    amt: number,
    isTd: boolean
  ) {
    const entries: { playerId: string; stats: Record<string, number> }[] = [];
    for (const role of p.roles) {
      for (const playerId of pickedRoles[role.key] ?? []) {
        const stats: Record<string, number> = { ...role.base };
        if (p.amount && role.perAmount) {
          for (const [key, factor] of Object.entries(role.perAmount)) {
            stats[key] = (stats[key] ?? 0) + amt * factor;
          }
        }
        if (isTd && role.perTd) {
          for (const [key, inc] of Object.entries(role.perTd)) {
            stats[key] = (stats[key] ?? 0) + inc;
          }
        }
        entries.push({ playerId, stats });
      }
    }
    return entries;
  }

  function submit(p: QuickPlay, pickedRoles: Record<string, string[]>, amt: number, isTd: boolean) {
    const entries = buildEntries(p, pickedRoles, amt, isTd);
    if (entries.length === 0) {
      reset();
      return;
    }
    const names = p.roles
      .flatMap((r) => pickedRoles[r.key] ?? [])
      .map(playerName)
      .join(" → ");
    const summary = `${p.icon} ${p.label} — ${names}${p.amount ? `, ${amt} ${p.amount.label.toLowerCase()}` : ""}${isTd ? " · TD!" : ""}`;
    const id = nextId;
    setNextId(id + 1);

    startTransition(async () => {
      const result = await recordPlay(eventId, entries);
      if (result.ok) {
        setLog((prev) => [{ id, summary, entries }, ...prev].slice(0, 30));
        reset();
      } else {
        setError(result.error);
      }
    });
  }

  function undo(entry: LogEntry) {
    const negated = entry.entries.map((e) => ({
      playerId: e.playerId,
      stats: Object.fromEntries(Object.entries(e.stats).map(([k, v]) => [k, -v])),
    }));
    startTransition(async () => {
      const result = await recordPlay(eventId, negated);
      if (result.ok) {
        setLog((prev) => prev.filter((l) => l.id !== entry.id));
      } else {
        setError(result.error);
      }
    });
  }

  // Advance after a role gets its pick(s)
  function confirmRole(role: QuickPlay["roles"][number], ids: string[]) {
    if (!play) return;
    const nextPicked = { ...picked, [role.key]: ids };
    setPicked(nextPicked);
    const isLastRole = roleIndex >= play.roles.length - 1;
    if (!isLastRole) {
      setRoleIndex(roleIndex + 1);
    } else if (play.amount) {
      setRoleIndex(play.roles.length); // amount step
    } else {
      submit(play, nextPicked, 0, false);
    }
  }

  const currentRole = play && roleIndex < play.roles.length ? play.roles[roleIndex] : null;
  const onAmountStep = play != null && roleIndex >= play.roles.length && play.amount != null;

  return (
    <div>
      {/* Step 1: play type */}
      {!play && (
        <>
          <h2 className="label mb-2">What happened?</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {plays.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  setPlay(p);
                  setRoleIndex(0);
                }}
                className="card card-hover p-3 text-center hover:bg-slate-50 cursor-pointer"
              >
                <div className="text-2xl">{p.icon}</div>
                <div className="text-sm font-medium mt-1">{p.label}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Step 2: player per role */}
      {play && currentRole && (
        <RolePicker
          key={`${play.key}-${currentRole.key}`}
          play={play}
          role={currentRole}
          players={players}
          onConfirm={(ids) => confirmRole(currentRole, ids)}
          onCancel={reset}
        />
      )}

      {/* Step 3: amount + TD */}
      {onAmountStep && play?.amount && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="label mb-0">
              {play.icon} {play.label} — {play.amount.label}?
            </h2>
            <button onClick={reset} className="text-sm text-slate-400 hover:text-slate-700 cursor-pointer">
              ✕ Cancel
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {play.amount.presets.map((v) => (
              <button
                key={v}
                onClick={() => {
                  setAmount(v);
                  setCustomAmount(String(v));
                }}
                className={`rounded-lg border px-4 py-3 text-base font-semibold cursor-pointer ${
                  amount === v
                    ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                    : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                {v}
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              placeholder="Other"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                const v = parseInt(e.target.value, 10);
                setAmount(Number.isNaN(v) ? null : v);
              }}
              className="input w-24 text-center text-base"
            />
          </div>
          {play.tdToggle && (
            <label className="flex items-center gap-2 mb-4 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={td} onChange={(e) => setTd(e.target.checked)} />
              🏆 Touchdown / score on this play
            </label>
          )}
          <button
            onClick={() => submit(play, picked, amount ?? 0, td)}
            disabled={pending || amount == null}
            className="btn-primary w-full py-3 text-base"
          >
            {pending ? "Recording…" : `Record play${amount != null ? ` (${amount} ${play.amount.label.toLowerCase()})` : ""}`}
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 font-medium mt-3">⚠ {error}</p>
      )}

      {/* Play log */}
      <div className="mt-6">
        <h3 className="label">This session ({log.length} plays)</h3>
        {log.length === 0 ? (
          <p className="text-sm text-slate-400">
            Recorded plays show up here — totals go straight into the stat book.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {log.map((entry) => (
              <li key={entry.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{entry.summary}</span>
                <button
                  onClick={() => undo(entry)}
                  disabled={pending}
                  className="text-xs text-slate-400 hover:text-red-600 shrink-0 cursor-pointer"
                >
                  ↩ Undo
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RolePicker({
  play,
  role,
  players,
  onConfirm,
  onCancel,
}: {
  play: QuickPlay;
  role: QuickPlay["roles"][number];
  players: PlayerChip[];
  onConfirm: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    if (role.multiple) {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    } else {
      onConfirm([id]); // single pick advances immediately
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="label mb-0">
          {play.icon} {play.label} — {role.prompt}
        </h2>
        <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-700 cursor-pointer">
          ✕ Cancel
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={`rounded-lg border px-3 py-3 flex items-center gap-2 text-left cursor-pointer ${
              selected.includes(p.id)
                ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                : "border-slate-300 bg-white hover:bg-slate-50"
            }`}
          >
            <Avatar name={p.name} size="sm" />
            <span className="min-w-0">
              <span className="font-mono text-sm mr-1.5 opacity-60">
                {p.jersey ?? "—"}
              </span>
              <span className="text-sm font-medium">{p.name}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        {role.multiple && (
          <button
            onClick={() => onConfirm(selected)}
            disabled={selected.length === 0}
            className="btn-primary flex-1 py-3"
          >
            Next ({selected.length} selected)
          </button>
        )}
        {role.optional && (
          <button onClick={() => onConfirm([])} className="btn-secondary flex-1 py-3">
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
