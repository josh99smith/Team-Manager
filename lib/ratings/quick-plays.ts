// Quick play-by-play stat entry config, per sport. Pure data so it can be
// passed from server pages into the live-entry client component.
//
// Flow per play: pick the play type → pick player(s) for each role →
// (optionally) pick an amount like yards → record. Increments land in the
// event's StatLine rows using the same stat keys as the stat book.

export type RoleSpec = {
  key: string;
  prompt: string; // e.g. "Who threw it?"
  multiple?: boolean; // allow selecting several players (each gets the increments)
  optional?: boolean; // role can be skipped
  base: Record<string, number>; // flat stat increments
  perAmount?: Record<string, number>; // stat += amount * factor
  perTd?: Record<string, number>; // applied when the TD/score toggle is on
};

export type QuickPlay = {
  key: string;
  label: string;
  icon: string;
  amount?: { label: string; presets: number[]; allowNegative?: boolean };
  tdToggle?: boolean;
  roles: RoleSpec[];
};

const FOOTBALL_PLAYS: QuickPlay[] = [
  {
    key: "pass",
    label: "Pass",
    icon: "🎯",
    amount: { label: "Yards", presets: [3, 5, 8, 10, 15, 20, 30, 40, 50], allowNegative: true },
    tdToggle: true,
    roles: [
      {
        key: "passer",
        prompt: "Who threw it?",
        base: { passCmp: 1, passAtt: 1 },
        perAmount: { passYds: 1 },
        perTd: { passTds: 1 },
      },
      {
        key: "receiver",
        prompt: "Who caught it?",
        base: { recCatches: 1 },
        perAmount: { recYds: 1 },
        perTd: { recTds: 1 },
      },
    ],
  },
  {
    key: "incomplete",
    label: "Incompletion",
    icon: "🙅",
    roles: [{ key: "passer", prompt: "Who threw it?", base: { passAtt: 1 } }],
  },
  {
    key: "run",
    label: "Run",
    icon: "🏃",
    amount: { label: "Yards", presets: [1, 2, 3, 5, 8, 10, 15, 20, 30, 50], allowNegative: true },
    tdToggle: true,
    roles: [
      {
        key: "runner",
        prompt: "Who ran it?",
        base: { rushAtt: 1 },
        perAmount: { rushYds: 1 },
        perTd: { rushTds: 1 },
      },
    ],
  },
  {
    key: "tackle",
    label: "Tackle",
    icon: "🛑",
    roles: [
      { key: "tackler", prompt: "Who made the tackle?", multiple: true, base: { tackles: 1 } },
    ],
  },
  {
    key: "tfl",
    label: "TFL",
    icon: "💥",
    roles: [
      { key: "tackler", prompt: "Who made the stop?", base: { tackles: 1, tfl: 1 } },
    ],
  },
  {
    key: "sack",
    label: "Sack",
    icon: "🧨",
    roles: [{ key: "rusher", prompt: "Who got the sack?", base: { sacks: 1, tackles: 1 } }],
  },
  {
    key: "int",
    label: "INT",
    icon: "🧤",
    roles: [
      { key: "defender", prompt: "Who picked it off?", base: { defInts: 1 } },
      { key: "passer", prompt: "Who threw it? (optional)", optional: true, base: { passAtt: 1, passInts: 1 } },
    ],
  },
  {
    key: "ffum",
    label: "Forced fumble",
    icon: "🥊",
    roles: [
      { key: "defender", prompt: "Who forced it?", base: { ffum: 1 } },
      { key: "carrier", prompt: "Who fumbled? (optional)", optional: true, base: { fumbles: 1 } },
    ],
  },
  {
    key: "fgMade",
    label: "FG good",
    icon: "✅",
    roles: [{ key: "kicker", prompt: "Who kicked it?", base: { fgMade: 1, fgAtt: 1 } }],
  },
  {
    key: "fgMiss",
    label: "FG miss",
    icon: "❌",
    roles: [{ key: "kicker", prompt: "Who kicked it?", base: { fgAtt: 1 } }],
  },
  {
    key: "xp",
    label: "XP good",
    icon: "➕",
    roles: [{ key: "kicker", prompt: "Who kicked it?", base: { xpMade: 1 } }],
  },
];

const BASKETBALL_PLAYS: QuickPlay[] = [
  { key: "two", label: "2PT make", icon: "🏀", roles: [{ key: "scorer", prompt: "Who scored?", base: { pts: 2, fgm: 1, fga: 1 } }] },
  { key: "twoMiss", label: "2PT miss", icon: "🚫", roles: [{ key: "shooter", prompt: "Who shot it?", base: { fga: 1 } }] },
  { key: "three", label: "3PT make", icon: "🎯", roles: [{ key: "scorer", prompt: "Who scored?", base: { pts: 3, tpm: 1, tpa: 1, fgm: 1, fga: 1 } }] },
  { key: "threeMiss", label: "3PT miss", icon: "🙅", roles: [{ key: "shooter", prompt: "Who shot it?", base: { tpa: 1, fga: 1 } }] },
  { key: "ftMake", label: "FT make", icon: "✅", roles: [{ key: "shooter", prompt: "Who shot it?", base: { pts: 1, ftm: 1, fta: 1 } }] },
  { key: "ftMiss", label: "FT miss", icon: "❌", roles: [{ key: "shooter", prompt: "Who shot it?", base: { fta: 1 } }] },
  { key: "reb", label: "Rebound", icon: "🪣", roles: [{ key: "rebounder", prompt: "Who grabbed it?", base: { reb: 1 } }] },
  { key: "ast", label: "Assist", icon: "🤝", roles: [{ key: "passer", prompt: "Who assisted?", base: { ast: 1 } }] },
  { key: "stl", label: "Steal", icon: "🧤", roles: [{ key: "defender", prompt: "Who stole it?", base: { stl: 1 } }] },
  { key: "blk", label: "Block", icon: "🖐️", roles: [{ key: "defender", prompt: "Who blocked it?", base: { blk: 1 } }] },
  { key: "tov", label: "Turnover", icon: "😬", roles: [{ key: "player", prompt: "Who turned it over?", base: { tov: 1 } }] },
];

const SOCCER_PLAYS: QuickPlay[] = [
  {
    key: "goal",
    label: "Goal",
    icon: "⚽",
    roles: [
      { key: "scorer", prompt: "Who scored?", base: { goals: 1, shots: 1, shotsOnTarget: 1 } },
      { key: "assist", prompt: "Who assisted? (optional)", optional: true, base: { assists: 1, keyPasses: 1 } },
    ],
  },
  { key: "shotOn", label: "Shot on target", icon: "🎯", roles: [{ key: "shooter", prompt: "Who shot?", base: { shots: 1, shotsOnTarget: 1 } }] },
  { key: "shotOff", label: "Shot off target", icon: "🙅", roles: [{ key: "shooter", prompt: "Who shot?", base: { shots: 1 } }] },
  { key: "keyPass", label: "Key pass", icon: "🤝", roles: [{ key: "passer", prompt: "Who made the pass?", base: { keyPasses: 1 } }] },
  { key: "save", label: "Save", icon: "🧤", roles: [{ key: "keeper", prompt: "Who made the save?", base: { saves: 1 } }] },
  { key: "tackle", label: "Tackle won", icon: "🛑", roles: [{ key: "defender", prompt: "Who won it?", base: { tacklesWon: 1 } }] },
  { key: "clearance", label: "Clearance", icon: "🦶", roles: [{ key: "defender", prompt: "Who cleared it?", base: { clearances: 1 } }] },
  { key: "yellow", label: "Yellow card", icon: "🟨", roles: [{ key: "player", prompt: "Who got booked?", base: { yellowCards: 1 } }] },
  { key: "red", label: "Red card", icon: "🟥", roles: [{ key: "player", prompt: "Who was sent off?", base: { redCards: 1 } }] },
];

const BASEBALL_PLAYS: QuickPlay[] = [
  { key: "single", label: "Single", icon: "1️⃣", roles: [{ key: "batter", prompt: "Who hit it?", base: { ab: 1, hits: 1 } }] },
  { key: "double", label: "Double", icon: "2️⃣", roles: [{ key: "batter", prompt: "Who hit it?", base: { ab: 1, hits: 1, doubles: 1 } }] },
  { key: "triple", label: "Triple", icon: "3️⃣", roles: [{ key: "batter", prompt: "Who hit it?", base: { ab: 1, hits: 1, triples: 1 } }] },
  { key: "hr", label: "Home run", icon: "💣", roles: [{ key: "batter", prompt: "Who hit it?", base: { ab: 1, hits: 1, hr: 1, runs: 1, rbi: 1 } }] },
  { key: "rbi", label: "RBI", icon: "🏃", roles: [{ key: "batter", prompt: "Who drove it in?", base: { rbi: 1 } }] },
  { key: "run", label: "Run scored", icon: "🏠", roles: [{ key: "runner", prompt: "Who scored?", base: { runs: 1 } }] },
  { key: "walk", label: "Walk", icon: "🚶", roles: [{ key: "batter", prompt: "Who walked?", base: { walks: 1 } }] },
  { key: "k", label: "Strikeout (AB)", icon: "❌", roles: [{ key: "batter", prompt: "Who struck out?", base: { ab: 1, strikeouts: 1 } }] },
  { key: "out", label: "Out (AB)", icon: "🚫", roles: [{ key: "batter", prompt: "Who made the out?", base: { ab: 1 } }] },
  { key: "sb", label: "Stolen base", icon: "💨", roles: [{ key: "runner", prompt: "Who stole it?", base: { sb: 1 } }] },
  { key: "pitchK", label: "Pitcher K", icon: "🔥", roles: [{ key: "pitcher", prompt: "Who threw it?", base: { pitchKs: 1 } }] },
  { key: "pitchBB", label: "Pitcher BB", icon: "🎈", roles: [{ key: "pitcher", prompt: "Who threw it?", base: { pitchBBs: 1 } }] },
];

const QUICK_PLAYS: Record<string, QuickPlay[]> = {
  Football: FOOTBALL_PLAYS,
  Basketball: BASKETBALL_PLAYS,
  Soccer: SOCCER_PLAYS,
  Baseball: BASEBALL_PLAYS,
};

export function getQuickPlays(sport: string | null | undefined): QuickPlay[] {
  return QUICK_PLAYS[sport ?? ""] ?? FOOTBALL_PLAYS;
}
