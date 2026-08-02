"use client";

import { useTransition, useOptimistic } from "react";
import { markAttendance, clearAttendance } from "@/lib/actions/events";
import { ATTENDANCE_STATUSES, ATTENDANCE_LABELS } from "@/lib/constants";
import { Avatar } from "@/components/avatar";

const STATUS_ACTIVE_STYLES: Record<string, string> = {
  PRESENT: "bg-green-600 text-white border-green-600",
  LATE: "bg-yellow-500 text-white border-yellow-500",
  EXCUSED: "bg-blue-600 text-white border-blue-600",
  ABSENT: "bg-red-600 text-white border-red-600",
};

type PlayerRow = {
  id: string;
  name: string;
  jersey: number | null;
  positions: string;
};

export function AttendanceGrid({
  eventId,
  players,
  statusByPlayer,
}: {
  eventId: string;
  players: PlayerRow[];
  statusByPlayer: Record<string, string>;
}) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(statusByPlayer);

  function setStatus(playerId: string, status: string | null) {
    startTransition(async () => {
      setOptimistic((prev) => {
        const next = { ...prev };
        if (status === null) delete next[playerId];
        else next[playerId] = status;
        return next;
      });
      if (status === null) await clearAttendance(eventId, playerId);
      else await markAttendance(eventId, playerId, status);
    });
  }

  function markAllPresent() {
    startTransition(async () => {
      setOptimistic((prev) => {
        const next = { ...prev };
        for (const p of players) if (!next[p.id]) next[p.id] = "PRESENT";
        return next;
      });
      for (const p of players) {
        if (!statusByPlayer[p.id]) {
          await markAttendance(eventId, p.id, "PRESENT");
        }
      }
    });
  }

  return (
    <div>
      <div className="mb-3">
        <button onClick={markAllPresent} className="btn-secondary text-xs">
          Mark all unmarked present
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {players.map((p) => {
          const current = optimistic[p.id];
          return (
            <div
              key={p.id}
              className="py-2.5 flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="min-w-0 flex items-center gap-2.5">
                <span className="font-mono text-slate-400 text-sm">
                  {p.jersey ?? "—"}
                </span>
                <Avatar name={p.name} size="sm" />
                <span className="font-medium text-sm">{p.name}</span>
                {p.positions && (
                  <span className="text-xs text-slate-400">{p.positions}</span>
                )}
              </div>
              <div className="flex gap-1">
                {ATTENDANCE_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(p.id, current === s ? null : s)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                      current === s
                        ? STATUS_ACTIVE_STYLES[s]
                        : "border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {ATTENDANCE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
