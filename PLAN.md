# Team Manager — App Plan

A team management app for coaches: manage the roster, schedule practices and games,
assign tasks, and — the centerpiece — rate players Madden-style (0–99 attributes with
a computed overall) driven by grades the coaching staff gives after every practice
and game.

---

## 1. Core Features

### 1.1 Roster Management
- Add/edit/archive players: name, photo, jersey number, position(s), height/weight,
  birthdate/class year, contact info, emergency contact.
- Depth chart view per position (drag to reorder, auto-suggested by overall rating).
- Player profile page: bio, current ratings card, grade history, attendance, notes.
- Coach/staff accounts with roles (Head Coach, Assistant, Position Coach) that
  control who can grade and who can edit ratings weights.

### 1.2 Scheduling
- Calendar of events: practices, games, scrimmages, meetings, workouts.
- Event details: date/time, location, opponent (for games), notes/practice plan.
- Recurring events (e.g., practice every Tue/Thu at 4pm).
- Attendance tracking per event (present / late / excused / absent) — attendance
  feeds into player profiles and can factor into ratings (see 1.5).
- Optional: player/parent RSVP and reminders (later phase).

### 1.3 Tasks
- Team to-dos: assign to staff or players, due dates, status (open / in progress / done).
- Examples: "Turn in physical forms," "Watch film on Friday's opponent," "Equipment check."
- Task lists filterable by assignee, due date, and event (tasks can attach to an event).

### 1.4 Player Rating System (Madden-style)
The rating system mirrors Madden's model: every player has a set of **attributes
rated 0–99**, and a position-weighted **Overall (OVR)** computed from them.

**Attribute categories** (football default, configurable per sport):

| Category  | Attributes |
|-----------|------------|
| Physical  | Speed, Acceleration, Agility, Strength, Jumping, Stamina |
| Mental    | Awareness, Play Recognition, Discipline, Coachability |
| Ball Skills | Throw Power, Throw Accuracy, Catching, Carrying, Ball Security |
| Blocking  | Run Block, Pass Block, Impact Blocking |
| Defense   | Tackling, Block Shedding, Man Coverage, Zone Coverage, Pursuit |
| Kicking   | Kick Power, Kick Accuracy |
| Intangibles | Toughness, Leadership, Effort/Motor |

**Overall (OVR) formula**
- Each position has a weight profile (e.g., QB: Throw Accuracy 25%, Throw Power 15%,
  Awareness 20%, Speed 5%, …; RB: Speed 20%, Carrying 15%, Agility 15%, …).
- OVR = weighted average of attributes for the player's primary position, rounded to 0–99.
- Weight profiles ship with sensible defaults and are editable by the Head Coach.
- Players with multiple positions get an OVR per position (like Madden's position changes).

**Rating tiers & presentation**
- Color-coded tiers on the player card: 90+ elite, 80–89 starter, 70–79 solid,
  60–69 developing, <60 project (same mental model as Madden).
- Rating history chart per attribute — see how a player trends across the season.
- Team view: sortable ratings grid (like Madden's roster screen), team average OVR,
  top movers this week (+/- badges).

### 1.5 Practice & Game Grading
Grades are how ratings stay honest — coaches grade players after each event, and
grades drive rating adjustments.

**Grading flow**
- After any practice or game, a coach opens the event's grade sheet: the roster
  (or just the players who attended) with grade inputs per player.
- Two grading levels, selectable per event:
  - **Quick grade**: one overall grade per player (A+ … F or 0–100) plus a note.
  - **Detailed grade**: grade per attribute-category relevant to the player's
    position (e.g., a lineman gets Run Block, Pass Block, Effort; a WR gets
    Catching, Route/Agility, Effort). Optional stat entry for games (e.g.,
    receptions, tackles, TDs).
- Notes and tags per grade (e.g., "great motor", "missed assignments", "injured").
- Position coaches can grade only their groups; head coach can grade anyone and
  sees all grades.

**How grades move ratings**
- Each detailed grade maps to its attributes; quick grades map to Effort/Awareness
  plus a small global nudge.
- Ratings adjust via a rolling weighted average: recent events count more,
  games weigh more than practices (e.g., game grade weight 2×, practice 1×).
- Adjustments are capped per event (e.g., ±2 per attribute) so one bad Tuesday
  doesn't crater a rating — trends move ratings, not single data points.
- Attendance hooks in: unexcused absences slowly decay Discipline/Stamina-type
  attributes; consistent attendance nudges them up.
- Coaches can always manually override any attribute; overrides are logged with
  who/when/why.

**Reporting**
- Player report card: grades over time, per event, with coach notes.
- Weekly digest: top graded performers, biggest risers/fallers, players trending down
  (flag for coach attention).
- Exportable/printable report cards for player meetings.

---

## 2. Data Model

- **Team** — name, sport, season.
- **User** — auth identity; role (head coach / assistant / position coach), position group.
- **Player** — bio fields, jersey, positions[], status (active/injured/archived).
- **AttributeDefinition** — name, category, sport; seeded defaults.
- **PositionWeightProfile** — position → {attribute: weight} map, editable.
- **PlayerRating** — player × attribute → current value (0–99) + source (computed/override).
- **RatingHistory** — snapshot per player per attribute per event/date (powers trend charts).
- **Event** — type (practice/game/meeting), datetime, location, opponent, recurrence, notes.
- **Attendance** — player × event → status.
- **Grade** — player × event × coach → overall grade, per-category grades, stats, notes, tags.
- **Task** — title, description, assignees (users/players), due date, status, optional event link.

---

## 3. Tech Stack

- **Next.js (App Router) + TypeScript** — one codebase for UI and API, easy to deploy.
- **PostgreSQL + Prisma** (SQLite in dev) — relational fit for the model above.
- **Tailwind CSS + shadcn/ui** — fast, clean UI; Madden-style rating cards and grids.
- **Auth.js** — email login; role-based access on the server.
- **Recharts** — rating trend lines and grade charts.
- Deploy target: Vercel (or any Node host) + hosted Postgres (Neon/Supabase).

---

## 4. Build Phases

**Phase 1 — Foundation (MVP)**
1. Project scaffold, auth, team + roles.
2. Roster CRUD + player profiles.
3. Scheduling: events, recurrence, attendance.
4. Tasks.

**Phase 2 — Ratings & Grading (the differentiator)**
5. Attribute definitions, position weight profiles, seeded football defaults.
6. Player ratings + OVR computation, ratings grid, player rating card.
7. Grade sheets (quick + detailed), grades → rating adjustment engine.
8. Rating history, trend charts, weekly digest, report cards.

**Phase 3 — Polish & Extras**
9. Depth chart with OVR-based suggestions.
10. Player/parent read-only portal (see own report card, schedule, RSVP).
11. Game stat tracking tied into grades; CSV export.
12. Multi-sport attribute presets (basketball, soccer, baseball).

---

## 5. Key Screens

1. **Dashboard** — next event, pending tasks, top movers, players trending down.
2. **Roster** — Madden-style sortable ratings grid.
3. **Player Profile** — rating card + attribute bars, trend charts, grade history, notes.
4. **Calendar** — month/week views, event detail with attendance + grade sheet entry.
5. **Grade Sheet** — fast per-player grading UI built for a coach on a phone after practice.
6. **Tasks** — board/list with filters.
7. **Settings** — positions, attribute weights, grading scale, staff roles.
