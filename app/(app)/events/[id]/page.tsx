import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { deleteEvent } from "@/lib/actions/events";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/lib/constants";
import { formatDateTime, formatTime } from "@/lib/format";
import { AttendanceGrid } from "@/components/attendance-grid";
import { ConfirmButton } from "@/components/confirm-button";
import { GradeSheet, type GradeRowData } from "@/components/grade-sheet";
import { StatBook } from "@/components/stat-book";
import { getOvrForPlayers, getAttributeDefs } from "@/lib/ratings/engine";
import { getTeamPreset } from "@/lib/team";
import { primaryPosition, DEFAULT_RATING } from "@/lib/ratings/defaults";

const GRADED_SKILLS_PER_POSITION = 6;

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
  const preset = await getTeamPreset();
  const statsByPlayer = new Map(
    event.statLines.map((s) => [
      s.playerId,
      JSON.parse(s.statsJson || "{}") as Record<string, number>,
    ])
  );

  // Position-specific grading skills: the top-weighted attributes for each
  // player's primary position, with their current rating as the anchor.
  const [defs, allWeights, allRatings] = await Promise.all([
    getAttributeDefs(),
    prisma.positionWeight.findMany(),
    prisma.playerRating.findMany({
      where: { playerId: { in: players.map((p) => p.id) } },
    }),
  ]);
  const defById = new Map(defs.map((d) => [d.id, d]));
  const topSkillsByPosition = new Map<string, { key: string; name: string }[]>();
  for (const w of allWeights) {
    if (!topSkillsByPosition.has(w.position)) topSkillsByPosition.set(w.position, []);
  }
  for (const position of topSkillsByPosition.keys()) {
    const top = allWeights
      .filter((w) => w.position === position)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, GRADED_SKILLS_PER_POSITION)
      .map((w) => defById.get(w.attributeId))
      .filter((d) => d != null)
      .map((d) => ({ key: d.key, name: d.name }));
    topSkillsByPosition.set(position, top);
  }
  const ratingsByPlayer = new Map<string, Map<string, number>>();
  for (const r of allRatings) {
    if (!ratingsByPlayer.has(r.playerId)) ratingsByPlayer.set(r.playerId, new Map());
    ratingsByPlayer.get(r.playerId)!.set(r.attributeId, r.value);
  }
  const defIdByKey = new Map(defs.map((d) => [d.key, d.id]));

  const gradablePlayers: GradeRowData[] = (
    attendedIds.size > 0 ? players.filter((p) => attendedIds.has(p.id)) : players
  ).map((p) => {
    const mine = event.grades.find(
      (g) => g.playerId === p.id && g.coachId === session?.user.id
    );
    const others = event.grades
      .filter((g) => g.playerId === p.id && g.coachId !== session?.user.id)
      .map((g) => ({ coach: g.coach.name, overall: g.overall, notes: g.notes }));
    const pos = primaryPosition(p.positions);
    const positionList = p.positions.split(",").filter(Boolean);
    if (positionList.length === 0) positionList.push(pos);
    const myRatings = ratingsByPlayer.get(p.id);

    // Union of skills across every position this player plays, deduped by
    // attribute key (rating is the same regardless of which tab shows it).
    const skillsByPosition: Record<string, string[]> = {};
    const seen = new Map<string, { key: string; name: string }>();
    for (const position of positionList) {
      const top = topSkillsByPosition.get(position) ?? [];
      skillsByPosition[position] = top.map((s) => s.key);
      for (const s of top) if (!seen.has(s.key)) seen.set(s.key, s);
    }
    const skills = [...seen.values()].map((s) => ({
      ...s,
      current: myRatings?.get(defIdByKey.get(s.key) ?? "") ?? DEFAULT_RATING,
    }));

    return {
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      jersey: p.jersey,
      positions: p.positions,
      primaryPosition: pos,
      positionList,
      ovr: ovrs.get(p.id) ?? 60,
      skills,
      skillsByPosition,
      mine: mine
        ? {
            overall: mine.overall,
            cats: JSON.parse(mine.categoriesJson || "{}"),
            notes: mine.notes,
          }
        : null,
      others,
    };
  });

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
        <div className="flex gap-2 flex-wrap">
          {(event.type === "GAME" || event.type === "SCRIMMAGE") && (
            <Link href={`/events/${event.id}/live`} className="btn-primary">
              ⚡ Live stats
            </Link>
          )}
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
            <GradeSheet eventId={event.id} players={gradablePlayers} />
          )}
        </div>
      )}

      {(event.type === "GAME" || event.type === "SCRIMMAGE") && (
        <div className="card p-6 mt-6">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <h2 className="font-semibold">Stat book</h2>
            <div className="flex items-center gap-3">
              <Link
                href={`/events/${event.id}/live`}
                className="text-sm text-slate-500 hover:underline"
              >
                ⚡ Live entry →
              </Link>
              <span className="text-sm text-slate-500">
                {event.statLines.filter((s) => s.statsJson !== "{}").length}/
                {gradablePlayers.length} entered
              </span>
            </div>
          </div>
          {gradablePlayers.length === 0 ? (
            <p className="text-sm text-slate-400">No players to track.</p>
          ) : (
            <StatBook
              eventId={event.id}
              players={gradablePlayers.map((p) => ({
                id: p.id,
                name: p.name,
                jersey: p.jersey,
                positions: p.positions,
                stats: statsByPlayer.get(p.id) ?? {},
              }))}
              statDefs={preset.statDefs}
            />
          )}
        </div>
      )}
    </div>
  );
}
