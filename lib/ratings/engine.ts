import { prisma } from "@/lib/prisma";
import { DEFAULT_RATING, primaryPosition } from "./defaults";
import { getPreset } from "./presets";
import type { AttributeDefinition } from "@prisma/client";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// How hard a single event can move a rating, and how much event types count.
const MAX_DELTA_PER_EVENT = 2;
const EVENT_MULTIPLIERS: Record<string, number> = {
  GAME: 2,
  SCRIMMAGE: 1.5,
};
// A category grade this many points above/below the current rating produces ±1 (pre-multiplier).
const GRADE_SENSITIVITY = 15;

// Seed attribute definitions + position weights for the team's sport if the
// tables are empty.
export async function ensureRatingDefaults() {
  const count = await prisma.attributeDefinition.count();
  if (count > 0) return;

  const team = await prisma.team.findFirst();
  const preset = getPreset(team?.sport);

  await prisma.attributeDefinition.createMany({
    data: preset.attributes.map((a, i) => ({ ...a, sort: i })),
  });
  const defs = await prisma.attributeDefinition.findMany();
  const byKey = new Map(defs.map((d) => [d.key, d.id]));

  const weightRows: { position: string; attributeId: string; weight: number }[] = [];
  for (const [position, weights] of Object.entries(preset.positionWeights)) {
    for (const [key, weight] of Object.entries(weights)) {
      const attributeId = byKey.get(key);
      if (attributeId) weightRows.push({ position, attributeId, weight });
    }
  }
  await prisma.positionWeight.createMany({ data: weightRows });
}

export async function getAttributeDefs(): Promise<AttributeDefinition[]> {
  await ensureRatingDefaults();
  return prisma.attributeDefinition.findMany({ orderBy: { sort: "asc" } });
}

export type WeightMap = Map<string, number>; // attributeId -> weight

export async function getWeightsForPosition(position: string): Promise<WeightMap> {
  await ensureRatingDefaults();
  const rows = await prisma.positionWeight.findMany({ where: { position } });
  return new Map(rows.map((w) => [w.attributeId, w.weight]));
}

// attributeId -> effective value (missing rows default to DEFAULT_RATING)
export async function getEffectiveRatings(
  playerId: string,
  defs: AttributeDefinition[]
): Promise<Map<string, number>> {
  const rows = await prisma.playerRating.findMany({ where: { playerId } });
  const byAttr = new Map(rows.map((r) => [r.attributeId, r.value]));
  return new Map(defs.map((d) => [d.id, byAttr.get(d.id) ?? DEFAULT_RATING]));
}

export function computeOvr(
  ratings: Map<string, number>,
  weights: WeightMap
): number {
  let total = 0;
  let weightSum = 0;
  for (const [attributeId, weight] of weights) {
    total += (ratings.get(attributeId) ?? DEFAULT_RATING) * weight;
    weightSum += weight;
  }
  if (weightSum === 0) {
    const values = [...ratings.values()];
    if (values.length === 0) return DEFAULT_RATING;
    return clamp(Math.round(values.reduce((a, b) => a + b, 0) / values.length), 0, 99);
  }
  return clamp(Math.round(total / weightSum), 0, 99);
}

// OVR for every player in one pass (roster grid, dashboard).
export async function getOvrForPlayers(
  players: { id: string; positions: string }[]
): Promise<Map<string, number>> {
  await ensureRatingDefaults();
  const [allWeights, allRatings] = await Promise.all([
    prisma.positionWeight.findMany(),
    prisma.playerRating.findMany({
      where: { playerId: { in: players.map((p) => p.id) } },
    }),
  ]);

  const weightsByPosition = new Map<string, WeightMap>();
  for (const w of allWeights) {
    if (!weightsByPosition.has(w.position)) weightsByPosition.set(w.position, new Map());
    weightsByPosition.get(w.position)!.set(w.attributeId, w.weight);
  }
  const ratingsByPlayer = new Map<string, Map<string, number>>();
  for (const r of allRatings) {
    if (!ratingsByPlayer.has(r.playerId)) ratingsByPlayer.set(r.playerId, new Map());
    ratingsByPlayer.get(r.playerId)!.set(r.attributeId, r.value);
  }

  const result = new Map<string, number>();
  for (const p of players) {
    const weights = weightsByPosition.get(primaryPosition(p.positions)) ?? new Map();
    result.set(p.id, computeOvr(ratingsByPlayer.get(p.id) ?? new Map(), weights));
  }
  return result;
}

export type GradeInput = {
  playerId: string;
  eventId: string;
  coachId: string;
  overall: number | null; // 0-100 quick grade
  categories: Record<string, number>; // category name -> 0-100
  notes: string;
};

// Save a grade and adjust the player's ratings.
// Re-grading first reverts the previously applied deltas so edits don't stack.
export async function applyGrade(input: GradeInput) {
  const [defs, event, player] = await Promise.all([
    getAttributeDefs(),
    prisma.event.findUniqueOrThrow({ where: { id: input.eventId } }),
    prisma.player.findUniqueOrThrow({ where: { id: input.playerId } }),
  ]);
  const position = primaryPosition(player.positions);
  const weights = await getWeightsForPosition(position);

  const existing = await prisma.grade.findUnique({
    where: {
      playerId_eventId_coachId: {
        playerId: input.playerId,
        eventId: input.eventId,
        coachId: input.coachId,
      },
    },
  });

  const ratings = await getEffectiveRatings(input.playerId, defs);

  // Revert previously applied deltas from this grade.
  if (existing) {
    const prevApplied: Record<string, number> = JSON.parse(existing.appliedJson || "{}");
    for (const [attributeId, delta] of Object.entries(prevApplied)) {
      if (ratings.has(attributeId)) {
        ratings.set(attributeId, clamp(ratings.get(attributeId)! - delta, 0, 99));
      }
    }
  }

  // OVR before this grade — used as a baseline snapshot the first time a
  // player's rating ever moves, so trend charts and movers have a start point.
  const preOvr = computeOvr(ratings, weights);
  const hasHistory =
    (await prisma.ratingHistory.count({
      where: { playerId: input.playerId, attributeId: null },
    })) > 0;

  const mult = EVENT_MULTIPLIERS[event.type] ?? 1;
  const applied: Record<string, number> = {};

  // Detailed category grades move every position-relevant attribute in that category.
  const defsByCategory = new Map<string, AttributeDefinition[]>();
  for (const d of defs) {
    if (!defsByCategory.has(d.category)) defsByCategory.set(d.category, []);
    defsByCategory.get(d.category)!.push(d);
  }
  for (const [category, grade] of Object.entries(input.categories)) {
    for (const def of defsByCategory.get(category) ?? []) {
      if (!weights.has(def.id)) continue; // only attributes that matter for the position
      const current = ratings.get(def.id) ?? DEFAULT_RATING;
      const delta = clamp(
        Math.round(((grade - current) / GRADE_SENSITIVITY) * mult),
        -MAX_DELTA_PER_EVENT,
        MAX_DELTA_PER_EVENT
      );
      if (delta !== 0) applied[def.id] = (applied[def.id] ?? 0) + delta;
    }
  }

  // Quick overall grade gives a small nudge to effort and awareness.
  if (input.overall != null) {
    for (const key of ["effort", "awareness"]) {
      const def = defs.find((d) => d.key === key);
      if (!def || applied[def.id]) continue;
      const current = ratings.get(def.id) ?? DEFAULT_RATING;
      const delta = clamp(Math.round((input.overall - current) / 20), -1, 1);
      if (delta !== 0) applied[def.id] = delta;
    }
  }

  // New effective values after applying deltas.
  const changed: { attributeId: string; value: number }[] = [];
  for (const [attributeId, delta] of Object.entries(applied)) {
    const next = clamp((ratings.get(attributeId) ?? DEFAULT_RATING) + delta, 0, 99);
    ratings.set(attributeId, next);
    changed.push({ attributeId, value: next });
  }
  // If we reverted an old grade, rows whose reverted value differs must be written too.
  const revertOnly = existing
    ? Object.keys(JSON.parse(existing.appliedJson || "{}")).filter((id) => !(id in applied))
    : [];
  for (const attributeId of revertOnly) {
    changed.push({ attributeId, value: ratings.get(attributeId) ?? DEFAULT_RATING });
  }

  const ovr = computeOvr(ratings, weights);

  await prisma.$transaction([
    ...(hasHistory
      ? []
      : [
          prisma.ratingHistory.create({
            data: {
              playerId: input.playerId,
              attributeId: null,
              value: preOvr,
              reason: "baseline",
              createdAt: new Date(Date.now() - 1000),
            },
          }),
        ]),
    prisma.grade.upsert({
      where: {
        playerId_eventId_coachId: {
          playerId: input.playerId,
          eventId: input.eventId,
          coachId: input.coachId,
        },
      },
      create: {
        playerId: input.playerId,
        eventId: input.eventId,
        coachId: input.coachId,
        overall: input.overall,
        categoriesJson: JSON.stringify(input.categories),
        appliedJson: JSON.stringify(applied),
        notes: input.notes,
      },
      update: {
        overall: input.overall,
        categoriesJson: JSON.stringify(input.categories),
        appliedJson: JSON.stringify(applied),
        notes: input.notes,
      },
    }),
    ...changed.map(({ attributeId, value }) =>
      prisma.playerRating.upsert({
        where: { playerId_attributeId: { playerId: input.playerId, attributeId } },
        create: { playerId: input.playerId, attributeId, value },
        update: { value },
      })
    ),
    ...Object.keys(applied).map((attributeId) =>
      prisma.ratingHistory.create({
        data: {
          playerId: input.playerId,
          attributeId,
          value: ratings.get(attributeId)!,
          eventId: input.eventId,
          reason: "grade",
        },
      })
    ),
    prisma.ratingHistory.create({
      data: {
        playerId: input.playerId,
        attributeId: null,
        value: ovr,
        eventId: input.eventId,
        reason: "grade",
      },
    }),
  ]);

  return { applied, ovr };
}

// Manual coach override of a single attribute.
export async function overrideAttribute(
  playerId: string,
  attributeId: string,
  value: number
) {
  const defs = await getAttributeDefs();
  const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
  const weights = await getWeightsForPosition(primaryPosition(player.positions));

  const next = clamp(Math.round(value), 0, 99);
  const ratings = await getEffectiveRatings(playerId, defs);
  const preOvr = computeOvr(ratings, weights);
  const hasHistory =
    (await prisma.ratingHistory.count({
      where: { playerId, attributeId: null },
    })) > 0;
  ratings.set(attributeId, next);
  const ovr = computeOvr(ratings, weights);

  await prisma.$transaction([
    ...(hasHistory
      ? []
      : [
          prisma.ratingHistory.create({
            data: {
              playerId,
              attributeId: null,
              value: preOvr,
              reason: "baseline",
              createdAt: new Date(Date.now() - 1000),
            },
          }),
        ]),
    prisma.playerRating.upsert({
      where: { playerId_attributeId: { playerId, attributeId } },
      create: { playerId, attributeId, value: next, isOverride: true },
      update: { value: next, isOverride: true },
    }),
    prisma.ratingHistory.create({
      data: { playerId, attributeId, value: next, reason: "override" },
    }),
    prisma.ratingHistory.create({
      data: { playerId, attributeId: null, value: ovr, reason: "override" },
    }),
  ]);

  return ovr;
}
