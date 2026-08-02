import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";

export default async function DashboardPage() {
  const session = await auth();
  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [nextEvent, weekEvents, openTasks, activeCount, injuredCount, weekHistory] =
    await Promise.all([
      prisma.event.findFirst({
        where: { startsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
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
        take: 6,
      }),
      prisma.player.count({ where: { status: "ACTIVE" } }),
      prisma.player.count({ where: { status: "INJURED" } }),
      prisma.ratingHistory.findMany({
        where: { attributeId: null, createdAt: { gte: weekAgo } },
        orderBy: { createdAt: "asc" },
        include: { player: true },
      }),
    ]);

  // 7-day OVR movement: first vs latest snapshot per player.
  const snaps = new Map<
    string,
    { name: string; first: number; last: number }
  >();
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

  const firstName = session?.user.name?.split(" ")[0] ?? "Coach";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welcome back, {firstName}</h1>
      <p className="text-slate-500 mb-8">{formatDate(now)}</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Active players" value={activeCount} href="/roster" />
        <StatCard
          label="Injured"
          value={injuredCount}
          href="/roster?status=injured"
        />
        <StatCard label="Open tasks" value={openTasks.length} href="/tasks" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
              <span
                className={`badge ${EVENT_TYPE_COLORS[nextEvent.type] ?? ""}`}
              >
                {EVENT_TYPE_LABELS[nextEvent.type] ?? nextEvent.type}
              </span>
              <div className="font-semibold mt-2">
                {nextEvent.title ||
                  (nextEvent.opponent
                    ? `vs ${nextEvent.opponent}`
                    : EVENT_TYPE_LABELS[nextEvent.type])}
              </div>
              <div className="text-sm text-slate-300 mt-0.5">
                {formatDateTime(nextEvent.startsAt)}
                {nextEvent.location ? ` · ${nextEvent.location}` : ""}
              </div>
            </Link>
          )}
          {weekEvents.length > 1 && (
            <>
              <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                This week
              </h3>
              <ul className="text-sm space-y-1.5">
                {weekEvents
                  .filter((e) => e.id !== nextEvent?.id)
                  .map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/events/${e.id}`}
                        className="flex justify-between gap-2 hover:underline"
                      >
                        <span className="truncate">
                          {EVENT_TYPE_LABELS[e.type]}
                          {e.opponent ? ` vs ${e.opponent}` : ""}
                          {e.title ? ` — ${e.title}` : ""}
                        </span>
                        <span className="text-slate-500 shrink-0">
                          {formatDate(e.startsAt)} {formatTime(e.startsAt)}
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
              {openTasks.map((t) => (
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
                      {formatDate(t.dueDate)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Top movers — last 7 days</h2>
            <Link href="/ratings" className="text-sm text-slate-500 hover:underline">
              All ratings →
            </Link>
          </div>
          {movers.length === 0 ? (
            <p className="text-sm text-slate-400">
              No rating movement yet — grade a practice or game to get things
              moving.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {movers.map((m) => (
                <Link
                  key={m.playerId}
                  href={`/roster/${m.playerId}`}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3"
                >
                  <span className="text-sm font-medium">{m.name}</span>
                  <span className="text-sm font-bold">{m.ovr}</span>
                  <span
                    className={`text-sm font-semibold ${
                      m.delta > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {m.delta > 0 ? `▲ +${m.delta}` : `▼ ${m.delta}`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="card p-5 hover:bg-slate-50">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
    </Link>
  );
}
