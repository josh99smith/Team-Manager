// Parses a Hudl roster export (the JSON you can copy from a team's roster
// page) into rows shaped for our Player model. Pure functions — safe to run
// in the browser for a live preview before anything is saved.

export type ImportRow = {
  key: string; // stable key for the preview list (userId or index)
  firstName: string;
  lastName: string;
  jersey: number | null;
  positions: string; // comma-joined, our position codes
  heightIn: number | null;
  weightLb: number | null;
  classYear: string;
  sourcePositions: string; // original Hudl position codes, for display
};

export type ParseResult = {
  rows: ImportRow[];
  duplicateNames: string[]; // full names appearing more than once
  error: string | null;
};

// Hudl's position codes -> ours. Unrecognized codes are dropped rather than
// guessed at.
const POSITION_MAP: Record<string, string> = {
  QB: "QB",
  RB: "RB",
  FB: "FB",
  WR: "WR",
  TE: "TE",
  T: "OT",
  OT: "OT",
  G: "OG",
  OG: "OG",
  C: "C",
  DE: "DE",
  DT: "DT",
  LB: "LB",
  MLB: "LB",
  OLB: "LB",
  ILB: "LB",
  CB: "CB",
  DB: "CB",
  S: "S",
  FS: "S",
  SS: "S",
  K: "K",
  P: "P",
  LS: "LS",
  ATH: "ATH",
};

function mapPositions(positions: unknown): { mapped: string; source: string } {
  if (!Array.isArray(positions)) return { mapped: "", source: "" };
  const source = positions.filter((p) => typeof p === "string");
  const mapped: string[] = [];
  for (const p of source) {
    const code = POSITION_MAP[String(p).toUpperCase()];
    if (code && !mapped.includes(code)) mapped.push(code);
  }
  return { mapped: mapped.join(","), source: source.join(",") };
}

// "5'10\"" -> 70 total inches
function parseHeight(height: unknown): number | null {
  if (typeof height !== "string") return null;
  const m = height.match(/(\d+)\s*'\s*(\d{1,2})/);
  if (!m) return null;
  const feet = parseInt(m[1], 10);
  const inches = parseInt(m[2], 10);
  if (Number.isNaN(feet) || Number.isNaN(inches)) return null;
  return feet * 12 + inches;
}

// "150lbs" -> 150; "0lbs" (Hudl's "unknown" placeholder) -> null
function parseWeight(weight: unknown): number | null {
  if (typeof weight !== "string") return null;
  const m = weight.match(/(\d+)/);
  if (!m) return null;
  const lb = parseInt(m[1], 10);
  return lb > 0 ? lb : null;
}

function splitName(fullName: string, lastName: string): { firstName: string; lastName: string } {
  const full = fullName.trim();
  const last = lastName.trim();
  if (last && full.toLowerCase().endsWith(last.toLowerCase())) {
    const first = full.slice(0, full.length - last.length).trim();
    if (first) return { firstName: first, lastName: last };
  }
  const parts = full.split(/\s+/);
  if (parts.length > 1) {
    return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
  }
  return { firstName: full || "Unknown", lastName: last };
}

export function parseHudlExport(jsonText: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return { rows: [], duplicateNames: [], error: "That doesn't look like valid JSON — paste the exported roster array as-is." };
  }
  if (!Array.isArray(data)) {
    return { rows: [], duplicateNames: [], error: "Expected a JSON array of players." };
  }

  const rows: ImportRow[] = [];
  const nameCounts = new Map<string, number>();

  data.forEach((entry, i) => {
    if (typeof entry !== "object" || entry === null) return;
    const e = entry as Record<string, unknown>;
    const fullName = typeof e.fullName === "string" ? e.fullName : "";
    const lastNameField = typeof e.lastName === "string" ? e.lastName : "";
    const { firstName, lastName } = splitName(fullName, lastNameField);
    const { mapped, source } = mapPositions(e.positions);
    const jerseyRaw = typeof e.jerseyNumber === "string" ? parseInt(e.jerseyNumber, 10) : null;

    nameCounts.set(fullName, (nameCounts.get(fullName) ?? 0) + 1);

    rows.push({
      key: typeof e.userId === "string" ? e.userId : String(i),
      firstName,
      lastName,
      jersey: jerseyRaw != null && !Number.isNaN(jerseyRaw) ? jerseyRaw : null,
      positions: mapped,
      heightIn: parseHeight(e.height),
      weightLb: parseWeight(e.weight),
      classYear: typeof e.class === "string" ? e.class : "",
      sourcePositions: source,
    });
  });

  const duplicateNames = [...nameCounts.entries()]
    .filter(([name, count]) => name && count > 1)
    .map(([name]) => name);

  return { rows, duplicateNames, error: null };
}
