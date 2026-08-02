// Default football attribute set and position weight profiles.
// Seeded into the database on first run; editable by the head coach afterward.

export const CATEGORIES = [
  "Physical",
  "Mental",
  "Ball Skills",
  "Blocking",
  "Defense",
  "Kicking",
  "Intangibles",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_ATTRIBUTES: {
  key: string;
  name: string;
  category: Category;
}[] = [
  { key: "speed", name: "Speed", category: "Physical" },
  { key: "acceleration", name: "Acceleration", category: "Physical" },
  { key: "agility", name: "Agility", category: "Physical" },
  { key: "strength", name: "Strength", category: "Physical" },
  { key: "jumping", name: "Jumping", category: "Physical" },
  { key: "stamina", name: "Stamina", category: "Physical" },

  { key: "awareness", name: "Awareness", category: "Mental" },
  { key: "playRecognition", name: "Play Recognition", category: "Mental" },
  { key: "discipline", name: "Discipline", category: "Mental" },
  { key: "coachability", name: "Coachability", category: "Mental" },

  { key: "throwPower", name: "Throw Power", category: "Ball Skills" },
  { key: "throwAccuracy", name: "Throw Accuracy", category: "Ball Skills" },
  { key: "catching", name: "Catching", category: "Ball Skills" },
  { key: "carrying", name: "Carrying", category: "Ball Skills" },
  { key: "ballSecurity", name: "Ball Security", category: "Ball Skills" },

  { key: "runBlock", name: "Run Block", category: "Blocking" },
  { key: "passBlock", name: "Pass Block", category: "Blocking" },
  { key: "impactBlocking", name: "Impact Blocking", category: "Blocking" },

  { key: "tackling", name: "Tackling", category: "Defense" },
  { key: "blockShedding", name: "Block Shedding", category: "Defense" },
  { key: "manCoverage", name: "Man Coverage", category: "Defense" },
  { key: "zoneCoverage", name: "Zone Coverage", category: "Defense" },
  { key: "pursuit", name: "Pursuit", category: "Defense" },

  { key: "kickPower", name: "Kick Power", category: "Kicking" },
  { key: "kickAccuracy", name: "Kick Accuracy", category: "Kicking" },

  { key: "toughness", name: "Toughness", category: "Intangibles" },
  { key: "leadership", name: "Leadership", category: "Intangibles" },
  { key: "effort", name: "Effort / Motor", category: "Intangibles" },
];

// Relative weights (by attribute key) used to compute a position's OVR.
// Only attributes listed here count toward that position's overall.
export const DEFAULT_POSITION_WEIGHTS: Record<string, Record<string, number>> = {
  QB: { throwAccuracy: 25, throwPower: 15, awareness: 15, playRecognition: 10, speed: 5, agility: 5, ballSecurity: 5, leadership: 10, effort: 5, coachability: 5 },
  RB: { speed: 18, acceleration: 12, agility: 12, carrying: 10, ballSecurity: 12, strength: 8, awareness: 8, catching: 5, effort: 10, toughness: 5 },
  FB: { strength: 18, runBlock: 15, impactBlocking: 12, carrying: 8, ballSecurity: 8, speed: 8, awareness: 10, toughness: 12, effort: 9 },
  WR: { speed: 18, catching: 20, agility: 12, acceleration: 10, jumping: 8, awareness: 10, ballSecurity: 7, effort: 10, coachability: 5 },
  TE: { catching: 15, runBlock: 12, passBlock: 8, strength: 10, speed: 10, awareness: 10, jumping: 5, ballSecurity: 5, toughness: 10, effort: 15 },
  OT: { passBlock: 22, runBlock: 18, strength: 15, awareness: 12, agility: 8, playRecognition: 5, toughness: 10, effort: 10 },
  OG: { runBlock: 22, passBlock: 16, strength: 17, awareness: 10, agility: 5, impactBlocking: 10, toughness: 10, effort: 10 },
  C: { runBlock: 18, passBlock: 16, strength: 14, awareness: 16, playRecognition: 8, impactBlocking: 5, leadership: 8, toughness: 7, effort: 8 },
  DE: { blockShedding: 16, pursuit: 14, strength: 14, speed: 10, acceleration: 10, tackling: 12, playRecognition: 6, toughness: 8, effort: 10 },
  DT: { blockShedding: 20, strength: 20, tackling: 12, pursuit: 8, awareness: 8, playRecognition: 8, toughness: 12, effort: 12 },
  LB: { tackling: 18, playRecognition: 14, pursuit: 12, speed: 10, strength: 10, zoneCoverage: 8, blockShedding: 8, awareness: 6, toughness: 6, effort: 8 },
  CB: { manCoverage: 20, speed: 18, agility: 12, zoneCoverage: 10, acceleration: 10, playRecognition: 8, tackling: 6, jumping: 6, effort: 10 },
  S: { zoneCoverage: 16, tackling: 14, playRecognition: 14, speed: 12, manCoverage: 10, pursuit: 10, awareness: 8, jumping: 4, effort: 12 },
  K: { kickAccuracy: 35, kickPower: 30, awareness: 10, discipline: 10, toughness: 5, coachability: 10 },
  P: { kickPower: 32, kickAccuracy: 32, awareness: 10, discipline: 11, coachability: 15 },
  LS: { discipline: 25, awareness: 20, strength: 15, passBlock: 10, toughness: 10, coachability: 20 },
  ATH: { speed: 15, agility: 12, acceleration: 10, strength: 10, awareness: 12, catching: 6, tackling: 6, effort: 15, coachability: 14 },
};

// Which grade-sheet categories are relevant when grading a player at a position.
export const POSITION_GRADE_CATEGORIES: Record<string, Category[]> = {
  QB: ["Ball Skills", "Mental", "Physical", "Intangibles"],
  RB: ["Ball Skills", "Physical", "Mental", "Intangibles"],
  FB: ["Blocking", "Ball Skills", "Physical", "Intangibles"],
  WR: ["Ball Skills", "Physical", "Mental", "Intangibles"],
  TE: ["Ball Skills", "Blocking", "Physical", "Intangibles"],
  OT: ["Blocking", "Physical", "Mental", "Intangibles"],
  OG: ["Blocking", "Physical", "Mental", "Intangibles"],
  C: ["Blocking", "Physical", "Mental", "Intangibles"],
  DE: ["Defense", "Physical", "Mental", "Intangibles"],
  DT: ["Defense", "Physical", "Mental", "Intangibles"],
  LB: ["Defense", "Physical", "Mental", "Intangibles"],
  CB: ["Defense", "Physical", "Mental", "Intangibles"],
  S: ["Defense", "Physical", "Mental", "Intangibles"],
  K: ["Kicking", "Mental", "Intangibles"],
  P: ["Kicking", "Mental", "Intangibles"],
  LS: ["Blocking", "Mental", "Intangibles"],
  ATH: ["Physical", "Mental", "Ball Skills", "Defense", "Intangibles"],
};

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
