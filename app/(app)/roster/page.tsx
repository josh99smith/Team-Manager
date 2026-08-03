import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PLAYER_STATUS_LABELS } from "@/lib/constants";
import { formatHeight } from "@/lib/format";
import { getOvrForPlayers } from "@/lib/ratings/engine";
import { ratingTier } from "@/lib/ratings/defaults";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/avatar";

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INJURED: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-slate-100 text-slate-600",
};

export default async function RosterPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await props.searchParams;
  const filter = status ?? "current"; // current = active + injured

  const players = await prisma.player.findMany({
    where:
      filter === "current"
        ? { status: { in: ["ACTIVE", "INJURED"] } }
        : filter === "all"
          ? {}
          : { status: filter.toUpperCase() },
    orderBy: [{ jersey: "asc" }, { lastName: "asc" }],
  });
  const ovrs = await getOvrForPlayers(players);

  const filters = [
    { key: "current", label: "Current" },
    { key: "injured", label: "Injured" },
    { key: "archived", label: "Archived" },
    { key: "all", label: "All" },
  ];

  return (
    <div>
      <PageHeader
        title="Roster"
        actions={
          <>
            <Link href="/roster/import" className="btn-secondary">
              Import roster
            </Link>
            <Link href="/roster/new" className="btn-primary">
              + Add player
            </Link>
          </>
        }
      />

      <div className="flex gap-1 mb-4">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "current" ? "/roster" : `/roster?status=${f.key}`}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === f.key
                ? "bg-[var(--brand)] text-[var(--brand-ink)] font-medium"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {players.length === 0 ? (
        <EmptyState
          icon="🏈"
          title="No players yet"
          description="Add your first player to build the roster."
          action={
            <Link href="/roster/new" className="btn-primary">
              + Add player
            </Link>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">OVR</th>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Ht / Wt</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-mono text-slate-500">
                    {p.jersey ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/roster/${p.id}`}
                      className="flex items-center gap-2.5 font-medium text-slate-900 hover:underline w-fit"
                    >
                      <Avatar name={`${p.firstName} ${p.lastName}`} size="sm" />
                      {p.firstName} {p.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge font-bold ${ratingTier(ovrs.get(p.id) ?? 60).bg}`}
                    >
                      {ovrs.get(p.id) ?? 60}
                    </span>
                  </td>
                  <td className="px-4 py-3">{p.positions || "—"}</td>
                  <td className="px-4 py-3">{p.classYear ?? "—"}</td>
                  <td className="px-4 py-3">
                    {formatHeight(p.heightIn)}
                    {p.weightLb ? ` / ${p.weightLb} lb` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_BADGES[p.status] ?? ""}`}>
                      {PLAYER_STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-400 mt-3">
        {players.length} player{players.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
