import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { deleteEvent } from "@/lib/actions/events";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/lib/constants";
import { formatDateTime, formatTime } from "@/lib/format";
import { AttendanceGrid } from "@/components/attendance-grid";
import { ConfirmButton } from "@/components/confirm-button";
import { GradeSheet } from "@/components/grade-sheet";
import { StatBook } from "@/components/stat-book";
import { getOvrForPlayers } from "@/lib/ratings/engine";
import { getTeamPreset } from "@/lib/team";

export default async function EventPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await auth();
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      attendance: true,
      grades: { include: { coach: true } },
      rsvps: { include: { player: true } },
      statLines: true,
    },
  });
  if (!event) notFound();

  const players = await prisma.player.findMany({
    where: { status: { in: ["ACTIVE", "INJURED"] } },
    orderBy: [{ jersey: "asc" }, { lastName: "asc" }],
  });
  const ovrs = await getOvrForPlayers(players);

  const statusByPlayer = Object.fromEntries(
    event.attendance.map((a) => [a.playerId, a.status])
  );

  // Grade players who attended; fall back to the whole active roster if
  // attendance hasn't been taken yet.
  const attendedIds = new Set(
    event.attendance
      .filter((a) => a.status === "PRESENT" || a.status === "LATE")
      .map((a) => a.playerId)
  );
  const gradablePlayers = (
    attendedIds.size > 0 ? players.filter((p) => attendedIds.has(p.id)) : players
  ).map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    jersey: p.jersey,
    positions: p.positions,
    ovr: ovrs.get(p.id) ?? 60,
  }));

  const myGrades = new Map(
    event.grades
      .filter((g) => g.coachId === session?.user.id)
      .map((g) => [g.playerId, g])
  );

  const title =
    event.title ||
    (event.type === "GAME" && event.opponent
      ? `vs ${event.opponent}`
      : EVENT_TYPE_LABELS[event.type] ?? event.type);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{title}</h1>
            <span className={`badge ${EVENT_TYPE_COLORS[event.type] ?? ""}`}>
              {EVENT_TYPE_LABELS[event.type] ?? event.type}
            </span>
          </div>
          <p className="text-slate-500 mt-1">
            {formatDateTime(event.startsAt)}
            {event.endsAt ? ` – ${formatTime(event.endsAt)}` : ""}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/events/${event.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <ConfirmButton
            action={deleteEvent.bind(null, event.id, "one")}
            confirmText="Delete this event? Attendance records for it will be removed."
          >
            Delete
          </ConfirmButton>
          {event.recurrenceId && (
            <ConfirmButton
              action={deleteEvent.bind(null, event.id, "series")}
              confirmText="Delete ALL events in this recurring series? This cannot be undone."
            >
              Delete series
            </ConfirmButton>
          )}
        </div>
      </div>

      {event.notes && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold mb-2">Notes / plan</h2>
          <p className="text-sm whitespace-pre-wrap text-slate-700">
            {event.notes}
          </p>
        </div>
      )}

      {event.rsvps.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold mb-3">
            Player RSVPs{" "}
            <span className="text-sm font-normal text-slate-400">
              ({event.rsvps.filter((r) => r.status === "GOING").length} going ·{" "}
              {event.rsvps.filter((r) => r.status === "MAYBE").length} maybe ·{" "}
              {event.rsvps.filter((r) => r.status === "NOT_GOING").length} out)
            </span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {event.rsvps.map((r) => (
              <span
                key={r.id}
                className={`badge ${
                  r.status === "GOING"
                    ? "bg-green-100 text-green-800"
                    : r.status === "MAYBE"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {r.player.firstName} {r.player.lastName}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Attendance</h2>
          <span className="text-sm text-slate-500">
            {event.attendance.length}/{players.length} marked
          </span>
        </div>
        {players.length === 0 ? (
          <p className="text-sm text-slate-400">
            No active players on the roster yet.
          </p>
        ) : (
          <AttendanceGrid
            eventId={event.id}
            players={players.map((p) => ({
              id: p.id,
              name: `${p.firstName} ${p.lastName}`,
              jersey: p.jersey,
              positions: p.positions,
            }))}
            statusByPlayer={statusByPlayer}
          />
        )}
      </div>

      {(event.type === "PRACTICE" ||
        event.type === "GAME" ||
        event.type === "SCRIMMAGE" ||
        event.type === "WORKOUT") && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Grade sheet</h2>
            <span className="text-sm text-slate-500">
              {new Set(event.grades.map((g) => g.playerId)).size}/
              {gradablePlayers.length} graded
              {attendedIds.size === 0 && players.length > 0
                ? " · showing full roster (no attendance taken)"
                : ""}
            </span>
          </div>
          {gradablePlayers.length === 0 ? (
            <p className="text-sm text-slate-400">No players to grade.</p>
          ) : (
            <GradeSheet
              eventId={event.id}
              players={gradablePlayers}
              myGrades={myGrades}
              allGrades={event.grades}
              gradeCategories={(await getTeamPreset()).gradeCategories}
            />
          )}
        </div>
      )}

      {(event.type === "GAME" || event.type === "SCRIMMAGE") && (
        <div className="card p-6 mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Stat book</h2>
            <span className="text-sm text-slate-500">
              {event.statLines.filter((s) => s.statsJson !== "{}").length}/
              {gradablePlayers.length} entered
            </span>
          </div>
          {gradablePlayers.length === 0 ? (
            <p className="text-sm text-slate-400">No players to track.</p>
          ) : (
            <StatBook
              eventId={event.id}
              players={gradablePlayers}
              statLines={event.statLines}
              statDefs={(await getTeamPreset()).statDefs}
            />
          )}
        </div>
      )}
    </div>
  );
}
