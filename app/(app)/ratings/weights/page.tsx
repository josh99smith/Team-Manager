import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { saveWeights } from "@/lib/actions/ratings";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/page-header";
import { getAttributeDefs } from "@/lib/ratings/engine";
import { getTeamPreset } from "@/lib/team";

export default async function WeightsPage(props: {
  searchParams: Promise<{ position?: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "HEAD_COACH") redirect("/ratings");

  const { position: posParam } = await props.searchParams;
  const POSITIONS = (await getTeamPreset()).positions;
  const position = POSITIONS.includes(posParam ?? "")
    ? (posParam as string)
    : POSITIONS[0];

  const defs = await getAttributeDefs();
  const weights = await prisma.positionWeight.findMany({ where: { position } });
  const weightByAttr = new Map(weights.map((w) => [w.attributeId, w.weight]));
  const total = weights.reduce((a, w) => a + w.weight, 0);

  const categories: { name: string; defs: typeof defs }[] = [];
  for (const d of defs) {
    let cat = categories.find((c) => c.name === d.category);
    if (!cat) {
      cat = { name: d.category, defs: [] };
      categories.push(cat);
    }
    cat.defs.push(d);
  }

  return (
    <div>
      <PageHeader
        title="Position weight profiles"
        subtitle={
          <>
            Weights control how each attribute counts toward a player&apos;s OVR
            at this position. Set a weight of 0 to exclude an attribute.
            Weights are relative — they don&apos;t need to add up to 100
            (current total: {total}).
          </>
        }
      />

      <div className="flex flex-wrap gap-1 mb-6">
        {POSITIONS.map((pos) => (
          <Link
            key={pos}
            href={`/ratings/weights?position=${pos}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pos === position
                ? "bg-[var(--brand)] text-[var(--brand-ink)]"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            {pos}
          </Link>
        ))}
      </div>

      <form action={saveWeights.bind(null, position)} className="max-w-3xl">
        <div className="card p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 mb-4">
          {categories.map((cat) => (
            <div key={cat.name}>
              <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
                {cat.name}
              </h3>
              <div className="space-y-1.5">
                {cat.defs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3">
                    <label htmlFor={`w-${d.id}`} className="text-sm text-slate-700">
                      {d.name}
                    </label>
                    <input
                      id={`w-${d.id}`}
                      name={`w:${d.id}`}
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={weightByAttr.get(d.id) ?? 0}
                      className="w-16 rounded-md border border-slate-200 px-1.5 py-0.5 text-sm text-right"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <SubmitButton>Save {position} weights</SubmitButton>
      </form>
    </div>
  );
}
