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
import { formatDate, formatDateTime, formatHeight, formatShortDate } from "@/lib/format";
import { ConfirmButton } from "@/components/confirm-button";
import { auth } from "@/lib/auth";
import { deletePlayerAccount } from "@/lib/actions/portal";
import { PortalAccountForm } from "./portal-account";
import { RatingCard, OvrBadge } from "@/components/rating-card";
import { TrendChart } from "@/components/trend-chart";
import {
  getAttributeDefs,
  getEffectiveRatings,
  getWeightsForPosition,
  computeOvr,
} from "@/lib/ratings/engine";
import { primaryPosition } from "@/lib/ratings/defaults";
import { getTeamPreset } from "@/lib/team";
import { sumStatLines } from "@/lib/stats";

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INJURED: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-slate-100 text-slate-600",
};

export default async function PlayerPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await auth();
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      portalUser: true,
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

  const defs = await getAttributeDefs();
  const [ratings, weights, overrideRows, ovrHistory, grades] = await Promise.all([
    getEffectiveRatings(id, defs),
    getWeightsForPosition(primaryPosition(player.positions)),
    prisma.playerRating.findMany({ where: { playerId: id, isOverride: true } }),
    prisma.ratingHistory.findMany({
      where: { playerId: id, attributeId: null },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.grade.findMany({
      where: { playerId: id },
      include: { event: true, coach: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  const ovr = computeOvr(ratings, weights);
  const overrides = new Set(overrideRows.map((r) => r.attributeId));
  const trendPoints = ovrHistory.map((h) => ({
    label: formatShortDate(h.createdAt),
    value: h.value,
  }));

  const [preset, statLines] = await Promise.all([
    getTeamPreset(),
    prisma.statLine.findMany({ where: { playerId: id } }),
  ]);
  const statTotals = sumStatLines(statLines);
  const gamesWithStats = statLines.filter((l) => l.statsJson !== "{}").length;
  const seasonStats = preset.statDefs.filter((d) => (statTotals[d.key] ?? 0) !== 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <OvrBadge ovr={ovr} />
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
          {session?.user.role === "HEAD_COACH" && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3">Player portal</h2>
              {player.portalUser ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <div className="text-slate-700">{player.portalUser.email}</div>
                    <div className="text-xs text-slate-400">
                      Read-only access: report card, schedule, RSVP
                    </div>
                  </div>
                  <ConfirmButton
                    action={deletePlayerAccount.bind(null, player.id)}
                    confirmText="Remove this player's portal login?"
                    className="btn-danger text-xs px-2 py-1"
                  >
                    Remove
                  </ConfirmButton>
                </div>
              ) : (
                <PortalAccountForm playerId={player.id} />
              )}
            </div>
          )}
        </div>
      </div>

      {seasonStats.length > 0 && (
        <div className="card p-6 mt-6">
          <h2 className="font-semibold mb-3">
            Season stats{" "}
            <span className="text-sm font-normal text-slate-400">
              ({gamesWithStats} game{gamesWithStats === 1 ? "" : "s"})
            </span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {seasonStats.map((d) => (
              <div key={d.key} className="rounded-lg bg-slate-50 px-4 py-2.5 text-center">
                <div className="text-xl font-bold">{statTotals[d.key]}</div>
                <div className="text-xs text-slate-500">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="card p-6">
          <h2 className="font-semibold mb-3">OVR trend</h2>
          <TrendChart points={trendPoints} />
        </div>
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Recent grades</h2>
          {grades.length === 0 ? (
            <p className="text-sm text-slate-400">
              No grades yet — grade this player from a practice or game page.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {grades.map((g) => {
                const cats: Record<string, number> = JSON.parse(
                  g.categoriesJson || "{}"
                );
                return (
                  <li key={g.id} className="py-2.5">
                    <div className="flex justify-between gap-2">
                      <Link
                        href={`/events/${g.eventId}`}
                        className="font-medium hover:underline truncate"
                      >
                        {EVENT_TYPE_LABELS[g.event.type]}
                        {g.event.opponent ? ` vs ${g.event.opponent}` : ""} ·{" "}
                        {formatShortDate(g.event.startsAt)}
                      </Link>
                      {g.overall != null && (
                        <span className="badge bg-slate-900 text-white shrink-0">
                          {g.overall}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {g.coach.name}
                      {Object.keys(cats).length > 0 &&
                        " · " +
                          Object.entries(cats)
                            .map(([c, v]) => `${c} ${v}`)
                            .join(", ")}
                    </div>
                    {g.notes && (
                      <div className="text-xs text-slate-600 mt-0.5">
                        “{g.notes}”
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-6 mt-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold">
            Attributes{" "}
            <span className="text-slate-400 font-normal text-sm">
              ({primaryPosition(player.positions)} weighted · • counts toward OVR)
            </span>
          </h2>
          <span className="text-xs text-slate-400">
            Edit a value and press ✓ to override. Amber = manually overridden.
          </span>
        </div>
        <RatingCard
          playerId={player.id}
          defs={defs}
          ratings={ratings}
          weights={weights}
          overrides={overrides}
        />
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
