import type { AttributeDefinition } from "@prisma/client";
import { setAttributeRating } from "@/lib/actions/ratings";
import { ratingTier } from "@/lib/ratings/defaults";

function barColor(v: number): string {
  if (v >= 90) return "bg-purple-500";
  if (v >= 80) return "bg-green-500";
  if (v >= 70) return "bg-blue-500";
  if (v >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

export function RatingCard({
  playerId,
  defs,
  ratings,
  weights,
  overrides,
}: {
  playerId: string;
  defs: AttributeDefinition[];
  ratings: Map<string, number>;
  weights: Map<string, number>; // attributeId -> weight for primary position
  overrides: Set<string>; // attributeIds manually overridden
}) {
  const categories: { name: string; defs: AttributeDefinition[] }[] = [];
  for (const d of defs) {
    let cat = categories.find((c) => c.name === d.category);
    if (!cat) {
      cat = { name: d.category, defs: [] };
      categories.push(cat);
    }
    cat.defs.push(d);
  }

  return (
    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
      {categories.map((cat) => (
        <div key={cat.name}>
          <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            {cat.name}
          </h3>
          <div className="space-y-1.5">
            {cat.defs.map((d) => {
              const v = ratings.get(d.id) ?? 60;
              const counts = weights.has(d.id);
              return (
                <form
                  key={d.id}
                  action={setAttributeRating.bind(null, playerId, d.id)}
                  className="flex items-center gap-2"
                >
                  <span
                    className={`text-sm w-36 shrink-0 truncate ${counts ? "text-slate-800" : "text-slate-400"}`}
                    title={
                      counts
                        ? `Counts toward OVR (weight ${weights.get(d.id)})`
                        : "Not weighted for this position"
                    }
                  >
                    {d.name}
                    {counts && <span className="text-slate-400"> •</span>}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full ${barColor(v)}`}
                      style={{ width: `${Math.max(2, v)}%` }}
                    />
                  </div>
                  <input
                    name="value"
                    type="number"
                    min={0}
                    max={99}
                    defaultValue={v}
                    className={`w-14 rounded-md border px-1.5 py-0.5 text-sm text-right ${
                      overrides.has(d.id)
                        ? "border-amber-300 bg-amber-50"
                        : "border-slate-200"
                    }`}
                    title={overrides.has(d.id) ? "Manually overridden" : undefined}
                  />
                  <button
                    type="submit"
                    className="text-xs text-slate-400 hover:text-slate-800 cursor-pointer"
                    title="Save override"
                  >
                    ✓
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function OvrBadge({ ovr }: { ovr: number }) {
  const tier = ratingTier(ovr);
  return (
    <span
      className={`inline-flex flex-col items-center rounded-xl px-3 py-1.5 ${tier.bg}`}
      title={tier.label}
    >
      <span className="text-2xl font-extrabold leading-none">{ovr}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide">OVR</span>
    </span>
  );
}
