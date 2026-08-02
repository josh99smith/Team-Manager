// Dependency-free SVG line chart for rating trends.
export function TrendChart({
  points,
  height = 120,
  min = 40,
  max = 99,
}: {
  points: { label: string; value: number }[];
  height?: number;
  min?: number;
  max?: number;
}) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-slate-400">
        Not enough history yet — grades add data points over time.
      </p>
    );
  }

  const width = 560;
  const pad = 24;
  const lo = Math.min(min, ...points.map((p) => p.value)) - 2;
  const hi = Math.max(max, ...points.map((p) => p.value)) + 2;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (points.length - 1);
  const y = (v: number) => pad + ((hi - v) * (height - pad * 2)) / (hi - lo);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const delta = last - first;

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold">{last}</span>
        <span
          className={`text-sm font-medium ${
            delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-slate-400"
          }`}
        >
          {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "—"} since{" "}
          {points[0].label}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Rating trend chart"
      >
        <path d={path} fill="none" stroke="#0f172a" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill="#0f172a">
            <title>{`${p.label}: ${p.value}`}</title>
          </circle>
        ))}
        <text x={pad} y={height - 6} fontSize="10" fill="#94a3b8">
          {points[0].label}
        </text>
        <text x={width - pad} y={height - 6} fontSize="10" fill="#94a3b8" textAnchor="end">
          {points[points.length - 1].label}
        </text>
      </svg>
    </div>
  );
}
