import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTeam } from "@/lib/team";
import { getQuickPlays } from "@/lib/ratings/quick-plays";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { LiveStats } from "@/components/live-stats";

export default async function LiveStatsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const [event, team] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { attendance: true } }),
    getTeam(),
  ]);
  if (!event) notFound();

  const players = await prisma.player.findMany({
    where: { status: { in: ["ACTIVE", "INJURED"] } },
    orderBy: [{ jersey: "asc" }, { lastName: "asc" }],
  });

  // Prefer players marked present/late; fall back to the full active roster.
  const attendedIds = new Set(
    event.attendance
      .filter((a) => a.status === "PRESENT" || a.status === "LATE")
      .map((a) => a.playerId)
  );
  const available = (
    attendedIds.size > 0 ? players.filter((p) => attendedIds.has(p.id)) : players
  ).map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    jersey: p.jersey,
    positions: p.positions,
  }));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">⚡ Live stats</h1>
        <Link href={`/events/${event.id}`} className="btn-secondary">
          Done → stat book
        </Link>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        {EVENT_TYPE_LABELS[event.type]}
        {event.opponent ? ` vs ${event.opponent}` : ""} ·{" "}
        {formatDateTime(event.startsAt)} — tap what happened after each play.
      </p>
      <LiveStats
        eventId={event.id}
        players={available}
        plays={getQuickPlays(team?.sport)}
      />
    </div>
  );
}
