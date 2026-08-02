import { ratingTier } from "@/lib/ratings/defaults";

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
