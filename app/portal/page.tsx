import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setRsvp } from "@/lib/actions/portal";
import {
  ATTENDANCE_STATUSES,
  ATTENDANCE_LABELS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatShortDate, formatTime } from "@/lib/format";
import { OvrBadge } from "@/components/rating-card";
import { TrendChart } from "@/components/trend-chart";
import {
  getAttributeDefs,
  getEffectiveRatings,
  getWeightsForPosition,
  computeOvr,
} from "@/lib/ratings/engine";
import { primaryPosition, ratingTier } from "@/lib/ratings/defaults";

const RSVP_OPTIONS = [
  { value: "GOING", label: "Going", active: "bg-green-600 text-white border-green-600" },
  { value: "MAYBE", label: "Maybe", active: "bg-yellow-500 text-white border-yellow-500" },
  { value: "NOT_GOING", label: "Can't go", active: "bg-red-600 text-white border-red-600" },
];

export default async function PortalPage() {
  const session = await auth();
  const playerId = session?.user.playerId;
  if (!playerId) redirect("/login");

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: {
      tasks: { where: { status: { not: "DONE" } }, orderBy: { dueDate: "asc" } },
      rsvps: true,
    },
  });
  if (!player) redirect("/login");

  const defs = await getAttributeDefs();
  const [ratings, weights, ovrHistory, grades, attendanceCounts, upcoming] =
    await Promise.all([
      getEffectiveRatings(playerId, defs),
      getWeightsForPosition(primaryPosition(player.positions)),
      prisma.ratingHistory.findMany({
        where: { playerId, attributeId: null },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
      prisma.grade.findMany({
        where: { playerId },
        include: { event: true, coach: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.attendance.groupBy({
        by: ["status"],
        where: { playerId },
        _count: true,
      }),
      prisma.event.findMany({
        where: { startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 8,
      }),
    ]);

  const ovr = computeOvr(ratings, weights);
  const tier = ratingTier(ovr);
  const counts = Object.fromEntries(attendanceCounts.map((c) => [c.status, c._count]));
  const rsvpByEvent = new Map(player.rsvps.map((r) => [r.eventId, r.status]));

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <OvrBadge ovr={ovr} />
        <div>
          <h1 className="text-2xl font-bold">
            {player.jersey != null && (
              <span className="text-slate-400 mr-2">#{player.jersey}</span>
            )}
            {player.firstName} {player.lastName}
          </h1>
          <p className="text-slate-500">
            {player.positions || "No position"} · {tier.label}
          </p>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold mb-4">Upcoming — are you coming?</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing scheduled.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcoming.map((e) => {
              const current = rsvpByEvent.get(e.id);
              return (
                <div
                  key={e.id}
                  className="py-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <span className={`badge mr-2 ${EVENT_TYPE_COLORS[e.type] ?? ""}`}>
                      {EVENT_TYPE_LABELS[e.type] ?? e.type}
                    </span>
                    <span className="text-sm font-medium">
                      {e.title || (e.opponent ? `vs ${e.opponent}` : EVENT_TYPE_LABELS[e.type])}
                    </span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatDateTime(e.startsAt)}
                      {e.endsAt ? ` – ${formatTime(e.endsAt)}` : ""}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {RSVP_OPTIONS.map((opt) => (
                      <form key={opt.value} action={setRsvp.bind(null, e.id, opt.value)}>
                        <button
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                            current === opt.value
                              ? opt.active
                              : "border-slate-200 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold mb-3">My rating trend</h2>
          <TrendChart
            points={ovrHistory.map((h) => ({
              label: formatShortDate(h.createdAt),
              value: h.value,
            }))}
          />
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-3">My attendance</h2>
          <div className="grid grid-cols-2 gap-2">
            {ATTENDANCE_STATUSES.map((s) => (
              <div key={s} className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-xl font-bold">{counts[s] ?? 0}</div>
                <div className="text-xs text-slate-500">{ATTENDANCE_LABELS[s]}</div>
              </div>
            ))}
          </div>
          {player.tasks.length > 0 && (
            <>
              <h3 className="text-xs uppercase tracking-wide text-slate-500 mt-4 mb-2">
                My tasks
              </h3>
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
            </>
          )}
        </div>

        <div className="card p-6 md:col-span-2">
          <h2 className="font-semibold mb-3">My report card</h2>
          {grades.length === 0 ? (
            <p className="text-sm text-slate-400">No grades yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {grades.map((g) => {
                const cats: Record<string, number> = JSON.parse(g.categoriesJson || "{}");
                return (
                  <li key={g.id} className="py-2.5">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">
                        {EVENT_TYPE_LABELS[g.event.type]}
                        {g.event.opponent ? ` vs ${g.event.opponent}` : ""} ·{" "}
                        {formatShortDate(g.event.startsAt)}
                      </span>
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
                      <div className="text-xs text-slate-600 mt-0.5">“{g.notes}”</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
