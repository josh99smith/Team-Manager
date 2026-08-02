// Backward-compatible re-exports of the football preset plus sport-agnostic
// helpers. Per-sport data lives in ./presets.

import { PRESETS } from "./presets";

export { PRESETS, SPORTS, getPreset } from "./presets";

export const DEFAULT_ATTRIBUTES = PRESETS.Football.attributes;
export const DEFAULT_POSITION_WEIGHTS = PRESETS.Football.positionWeights;
export const POSITION_GRADE_CATEGORIES = PRESETS.Football.gradeCategories;

export const DEFAULT_RATING = 60;

// Rating tier used for color-coding, same mental model as Madden.
export function ratingTier(v: number): {
  label: string;
  text: string;
  bg: string;
} {
  if (v >= 90) return { label: "Elite", text: "text-purple-700", bg: "bg-purple-100 text-purple-800" };
  if (v >= 80) return { label: "Starter", text: "text-green-700", bg: "bg-green-100 text-green-800" };
  if (v >= 70) return { label: "Solid", text: "text-blue-700", bg: "bg-blue-100 text-blue-800" };
  if (v >= 60) return { label: "Developing", text: "text-yellow-700", bg: "bg-yellow-100 text-yellow-800" };
  return { label: "Project", text: "text-red-700", bg: "bg-red-100 text-red-800" };
}

export function primaryPosition(positions: string): string {
  return positions.split(",").filter(Boolean)[0] ?? "ATH";
}
