import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/format";

export default async function CalendarPage(props: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await props.searchParams;
  const showPast = view === "past";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const events = await prisma.event.findMany({
    where: showPast
      ? { startsAt: { lt: startOfToday } }
      : { startsAt: { gte: startOfToday } },
    orderBy: { startsAt: showPast ? "desc" : "asc" },
    take: 100,
    include: { _count: { select: { attendance: true } } },
  });

  // Group events by calendar day for display.
  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const key = formatDate(e.startsAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Link href="/events/new" className="btn-primary">
          + Add event
        </Link>
      </div>

      <div className="flex gap-1 mb-4">
        <Link
          href="/calendar"
          className={`px-3 py-1.5 rounded-lg text-sm ${!showPast ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200"}`}
        >
          Upcoming
        </Link>
        <Link
          href="/calendar?view=past"
          className={`px-3 py-1.5 rounded-lg text-sm ${showPast ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200"}`}
        >
          Past
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          {showPast ? "No past events." : "Nothing scheduled. Add a practice or game to get started."}
        </div>
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, dayEvents]) => (
            <div key={day}>
              <h2 className="text-sm font-semibold text-slate-500 mb-2">{day}</h2>
              <div className="space-y-2">
                {dayEvents.map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.id}`}
                    className="card p-4 flex items-center gap-4 hover:bg-slate-50"
                  >
                    <span className={`badge ${EVENT_TYPE_COLORS[e.type] ?? ""}`}>
                      {EVENT_TYPE_LABELS[e.type] ?? e.type}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {e.title ||
                          (e.type === "GAME" && e.opponent
                            ? `vs ${e.opponent}`
                            : EVENT_TYPE_LABELS[e.type])}
                        {e.recurrenceId && (
                          <span className="ml-2 text-xs text-slate-400">↻ recurring</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {formatTime(e.startsAt)}
                        {e.endsAt ? `–${formatTime(e.endsAt)}` : ""}
                        {e.location ? ` · ${e.location}` : ""}
                      </div>
                    </div>
                    {e._count.attendance > 0 && (
                      <span className="text-xs text-slate-400 shrink-0">
                        {e._count.attendance} marked
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
