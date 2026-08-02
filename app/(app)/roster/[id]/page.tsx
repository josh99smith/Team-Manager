import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setPlayerStatus, deletePlayer } from "@/lib/actions/players";
import {
  ATTENDANCE_STATUSES,
  ATTENDANCE_LABELS,
  PLAYER_STATUS_LABELS,
  EVENT_TYPE_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatHeight } from "@/lib/format";
import { ConfirmButton } from "@/components/confirm-button";

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INJURED: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-slate-100 text-slate-600",
};

export default async function PlayerPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      attendance: {
        include: { event: true },
        orderBy: { event: { startsAt: "desc" } },
        take: 10,
      },
      tasks: { where: { status: { not: "DONE" } }, orderBy: { dueDate: "asc" } },
    },
  });
  if (!player) notFound();

  const attendanceCounts = await prisma.attendance.groupBy({
    by: ["status"],
    where: { playerId: id },
    _count: true,
  });
  const counts = Object.fromEntries(
    attendanceCounts.map((c) => [c.status, c._count])
  );

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {player.jersey != null && (
                <span className="text-slate-400 mr-2">#{player.jersey}</span>
              )}
              {player.firstName} {player.lastName}
            </h1>
            <span className={`badge ${STATUS_BADGES[player.status] ?? ""}`}>
              {PLAYER_STATUS_LABELS[player.status] ?? player.status}
            </span>
          </div>
          <p className="text-slate-500 mt-1">
            {player.positions || "No position"}
            {player.classYear ? ` · ${player.classYear}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/roster/${player.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          {player.status !== "ARCHIVED" ? (
            <form action={setPlayerStatus.bind(null, player.id, "ARCHIVED")}>
              <button className="btn-secondary">Archive</button>
            </form>
          ) : (
            <form action={setPlayerStatus.bind(null, player.id, "ACTIVE")}>
              <button className="btn-secondary">Reactivate</button>
            </form>
          )}
          <ConfirmButton
            action={deletePlayer.bind(null, player.id)}
            confirmText={`Delete ${player.firstName} ${player.lastName}? This removes all their records and cannot be undone.`}
          >
            Delete
          </ConfirmButton>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-6 space-y-3">
          <h2 className="font-semibold">Bio</h2>
          <dl className="text-sm space-y-2">
            <Row label="Height" value={formatHeight(player.heightIn)} />
            <Row
              label="Weight"
              value={player.weightLb ? `${player.weightLb} lb` : "—"}
            />
            <Row label="Birthdate" value={formatDate(player.birthdate)} />
            <Row label="Email" value={player.email ?? "—"} />
            <Row label="Phone" value={player.phone ?? "—"} />
            <Row
              label="Emergency"
              value={
                player.emergencyName
                  ? `${player.emergencyName}${player.emergencyPhone ? ` (${player.emergencyPhone})` : ""}`
                  : "—"
              }
            />
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-3">Attendance</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {ATTENDANCE_STATUSES.map((s) => (
              <div key={s} className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-xl font-bold">{counts[s] ?? 0}</div>
                <div className="text-xs text-slate-500">
                  {ATTENDANCE_LABELS[s]}
                </div>
              </div>
            ))}
          </div>
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            Recent
          </h3>
          {player.attendance.length === 0 ? (
            <p className="text-sm text-slate-400">No attendance recorded yet.</p>
          ) : (
            <ul className="text-sm space-y-1.5">
              {player.attendance.map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <Link
                    href={`/events/${a.eventId}`}
                    className="hover:underline truncate"
                  >
                    {EVENT_TYPE_LABELS[a.event.type]} ·{" "}
                    {formatDateTime(a.event.startsAt)}
                  </Link>
                  <span className="text-slate-500 shrink-0">
                    {ATTENDANCE_LABELS[a.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Open tasks</h2>
            {player.tasks.length === 0 ? (
              <p className="text-sm text-slate-400">No open tasks.</p>
            ) : (
              <ul className="text-sm space-y-1.5">
                {player.tasks.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2">
                    <span className="truncate">{t.title}</span>
                    {t.dueDate && (
                      <span className="text-slate-500 shrink-0">
                        {formatDate(t.dueDate)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-6">
            <h2 className="font-semibold mb-3">Coach notes</h2>
            <p className="text-sm whitespace-pre-wrap text-slate-700">
              {player.notes || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
