import type { StatLine } from "@prisma/client";

export function sumStatLines(lines: StatLine[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const line of lines) {
    const stats: Record<string, number> = JSON.parse(line.statsJson || "{}");
    for (const [key, value] of Object.entries(stats)) {
      totals[key] = (totals[key] ?? 0) + value;
    }
  }
  return totals;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n") + "\n";
}
