import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatShortDate, formatTime } from "@/lib/format";
import { getOvrForPlayers } from "@/lib/ratings/engine";
import { ratingTier } from "@/lib/ratings/defaults";

export default async function DashboardPage() {
  const session = await auth();
  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    nextEvent,
    weekEvents,
    openTasks,
    activePlayers,
    injuredCount,
    weekHistory,
    recentGrades,
    lastGradableEvent,
    recentAttendance,
  ] = await Promise.all([
    prisma.event.findFirst({
      where: { startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      include: { _count: { select: { rsvps: { where: { status: "GOING" } } } } },
    }),
    prisma.event.findMany({
      where: { startsAt: { gte: now, lte: weekOut } },
      orderBy: { startsAt: "asc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: { status: { not: "DONE" } },
      include: { assigneeUser: true, assigneePlayer: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.player.findMany({ where: { status: "ACTIVE" } }),
    prisma.player.count({ where: { status: "INJURED" } }),
    prisma.ratingHistory.findMany({
      where: { attributeId: null, createdAt: { gte: weekAgo } },
      orderBy: { createdAt: "asc" },
      include: { player: true },
    }),
    prisma.grade.findMany({
      include: { player: true, event: true, coach: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.event.findFirst({
      where: { startsAt: { lt: now }, type: { in: ["PRACTICE", "GAME", "SCRIMMAGE", "WORKOUT"] } },
      orderBy: { startsAt: "desc" },
    }),
    prisma.attendance.findMany({
      where: { event: { startsAt: { gte: twoWeeksAgo, lt: now } } },
    }),
  ]);

  // Team OVR + top-rated players
  const ovrs = await getOvrForPlayers(activePlayers);
  const rated = activePlayers
    .map((p) => ({ p, ovr: ovrs.get(p.id) ?? 60 }))
    .sort((a, b) => b.ovr - a.ovr);
  const teamAvg =
    rated.length > 0
      ? Math.round(rated.reduce((a, r) => a + r.ovr, 0) / rated.length)
      : null;
  const topRated = rated.slice(0, 3);

  // Attendance rate: share of marked players present or late, last 14 days
  const attendanceRate =
    recentAttendance.length > 0
      ? Math.round(
          (recentAttendance.filter((a) => a.status === "PRESENT" || a.status === "LATE")
            .length /
            recentAttendance.length) *
            100
        )
      : null;

  // 7-day OVR movement: first vs latest snapshot per player
  const snaps = new Map<string, { name: string; first: number; last: number }>();
  for (const h of weekHistory) {
    const existing = snaps.get(h.playerId);
    if (!existing) {
      snaps.set(h.playerId, {
        name: `${h.player.firstName} ${h.player.lastName}`,
        first: h.value,
        last: h.value,
      });
    } else {
      existing.last = h.value;
    }
  }
  const movers = [...snaps.entries()]
    .map(([playerId, s]) => ({ playerId, name: s.name, delta: s.last - s.first, ovr: s.last }))
    .filter((m) => m.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  const overdueTasks = openTasks.filter((t) => t.dueDate && t.dueDate < now);
  const firstName = session?.user.name?.split(" ")[0] ?? "Coach";

  const daysUntil = (d: Date) => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThen = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((startOfThen.getTime() - startOfToday.getTime()) / 86400000);
  };
  const countdownLabel = (d: Date) => {
    const days = daysUntil(d);
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `In ${days} days`;
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {firstName}</h1>
          <p className="text-slate-500">{formatDate(now)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/events/new" className="btn-secondary">
            + Event
          </Link>
          <Link href="/roster/new" className="btn-secondary">
            + Player
          </Link>
          {lastGradableEvent && (
            <Link href={`/events/${lastGradableEvent.id}`} className="btn-primary">
              Grade {EVENT_TYPE_LABELS[lastGradableEvent.type]?.toLowerCase()} ·{" "}
              {formatShortDate(lastGradableEvent.startsAt)}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          value={String(activePlayers.length)}
          label="Active players"
          sub={injuredCount > 0 ? `+ ${injuredCount} injured` : "none injured"}
          href="/roster"
        />
        <StatCard
          value={teamAvg != null ? String(teamAvg) : "—"}
          label="Team OVR"
          sub={teamAvg != null ? ratingTier(teamAvg).label : "no ratings yet"}
          href="/ratings"
        />
        <StatCard
          value={attendanceRate != null ? `${attendanceRate}%` : "—"}
          label="Attendance"
          sub={
            attendanceRate != null
              ? "last 14 days"
              : "no attendance taken yet"
          }
          href="/calendar?view=past"
        />
        <StatCard
          value={String(openTasks.length)}
          label="Open tasks"
          sub={
            overdueTasks.length > 0
              ? `⚠ ${overdueTasks.length} overdue`
              : "nothing overdue"
          }
          subClass={overdueTasks.length > 0 ? "text-red-600 font-medium" : undefined}
          href="/tasks"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Next up</h2>
            <Link href="/calendar" className="text-sm text-slate-500 hover:underline">
              Full calendar →
            </Link>
          </div>
          {!nextEvent ? (
            <p className="text-sm text-slate-400 mb-4">
              Nothing scheduled.{" "}
              <Link href="/events/new" className="underline">
                Add an event
              </Link>
              .
            </p>
          ) : (
            <Link
              href={`/events/${nextEvent.id}`}
              className="block rounded-lg bg-slate-900 text-white p-4 mb-4 hover:bg-slate-800"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`badge ${EVENT_TYPE_COLORS[nextEvent.type] ?? ""}`}>
                  {EVENT_TYPE_LABELS[nextEvent.type] ?? nextEvent.type}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  {countdownLabel(nextEvent.startsAt)}
                </span>
              </div>
              <div className="font-semibold mt-2 text-lg">
                {nextEvent.title ||
                  (nextEvent.opponent
                    ? `vs ${nextEvent.opponent}`
                    : EVENT_TYPE_LABELS[nextEvent.type])}
              </div>
              <div className="text-sm text-slate-300 mt-0.5">
                {formatDateTime(nextEvent.startsAt)}
                {nextEvent.location ? ` · ${nextEvent.location}` : ""}
              </div>
              {nextEvent._count.rsvps > 0 && (
                <div className="text-xs text-slate-400 mt-1.5">
                  {`${nextEvent._count.rsvps} player${nextEvent._count.rsvps === 1 ? "" : "s"} RSVP'd going`}
                </div>
              )}
            </Link>
          )}
          {weekEvents.filter((e) => e.id !== nextEvent?.id).length > 0 && (
            <>
              <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                This week
              </h3>
              <ul className="text-sm divide-y divide-slate-100">
                {weekEvents
                  .filter((e) => e.id !== nextEvent?.id)
                  .map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/events/${e.id}`}
                        className="flex justify-between gap-2 py-2 hover:bg-slate-50 rounded px-1 -mx-1"
                      >
                        <span className="truncate min-w-0">
                          <span className={`badge mr-2 ${EVENT_TYPE_COLORS[e.type] ?? ""}`}>
                            {EVENT_TYPE_LABELS[e.type]}
                          </span>
                          {e.title || (e.opponent ? `vs ${e.opponent}` : "")}
                        </span>
                        <span className="text-slate-500 shrink-0">
                          {formatShortDate(e.startsAt)} · {formatTime(e.startsAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Open tasks</h2>
            <Link href="/tasks" className="text-sm text-slate-500 hover:underline">
              All tasks →
            </Link>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-sm text-slate-400">All caught up. 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {openTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="py-2.5 flex justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.title}</div>
                    <div className="text-xs text-slate-500">
                      {TASK_STATUS_LABELS[t.status]}
                      {t.assigneeUser ? ` · ${t.assigneeUser.name}` : ""}
                      {t.assigneePlayer
                        ? ` · ${t.assigneePlayer.firstName} ${t.assigneePlayer.lastName}`
                        : ""}
                    </div>
                  </div>
                  {t.dueDate && (
                    <span
                      className={`text-xs shrink-0 ${
                        t.dueDate < now ? "text-red-600 font-medium" : "text-slate-500"
                      }`}
                    >
                      {t.dueDate < now ? "⚠ " : ""}
                      {formatDate(t.dueDate)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">
              {movers.length > 0 ? "Top movers — last 7 days" : "Top rated"}
            </h2>
            <Link href="/ratings" className="text-sm text-slate-500 hover:underline">
              All ratings →
            </Link>
          </div>
          {movers.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {movers.map((m) => (
                <li key={m.playerId}>
                  <Link
                    href={`/roster/${m.playerId}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 rounded px-1 -mx-1 text-sm"
                  >
                    <span className="font-medium truncate min-w-0">{m.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className={`badge font-bold ${ratingTier(m.ovr).bg}`}>
                        {m.ovr}
                      </span>
                      <span
                        className={`font-semibold w-12 text-right ${
                          m.delta > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {m.delta > 0 ? `▲ +${m.delta}` : `▼ ${m.delta}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : topRated.length > 0 ? (
            <>
              <ul className="divide-y divide-slate-100">
                {topRated.map(({ p, ovr }, i) => (
                  <li key={p.id}>
                    <Link
                      href={`/roster/${p.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 rounded px-1 -mx-1 text-sm"
                    >
                      <span className="truncate min-w-0">
                        <span className="text-slate-400 font-mono mr-2">{i + 1}.</span>
                        <span className="font-medium">
                          {p.firstName} {p.lastName}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">{p.positions}</span>
                      </span>
                      <span className={`badge font-bold shrink-0 ${ratingTier(ovr).bg}`}>
                        {ovr}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mt-3">
                Movers appear here once grades start shifting ratings.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Add players to see ratings here.
            </p>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent grades</h2>
            {lastGradableEvent && (
              <Link
                href={`/events/${lastGradableEvent.id}`}
                className="text-sm text-slate-500 hover:underline"
              >
                Grade sheet →
              </Link>
            )}
          </div>
          {recentGrades.length === 0 ? (
            <p className="text-sm text-slate-400">
              No grades yet — open a practice or game and grade players to start
              moving ratings.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentGrades.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/roster/${g.playerId}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 rounded px-1 -mx-1 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {g.player.firstName} {g.player.lastName}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {EVENT_TYPE_LABELS[g.event.type]}
                        {g.event.opponent ? ` vs ${g.event.opponent}` : ""} ·{" "}
                        {formatShortDate(g.event.startsAt)} · {g.coach.name}
                        {g.notes ? ` — “${g.notes}”` : ""}
                      </div>
                    </div>
                    {g.overall != null && (
                      <span className="badge bg-slate-900 text-white shrink-0">
                        {g.overall}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  sub,
  subClass,
  href,
}: {
  value: string;
  label: string;
  sub: string;
  subClass?: string;
  href: string;
}) {
  return (
    <Link href={href} className="card p-5 hover:bg-slate-50">
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-sm text-slate-600 mt-0.5">{label}</div>
      <div className={`text-xs mt-1 ${subClass ?? "text-slate-400"}`}>{sub}</div>
    </Link>
  );
}
