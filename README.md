# Team Manager

A team management app for coaches: roster, scheduling with attendance, tasks,
and a Madden-style player rating system driven by practice and game grades.
See [PLAN.md](./PLAN.md) for the full roadmap.

## Phase 3 features (current)

- **Depth chart** — `/depth-chart` groups players by position, ordered by OVR
  by default with manual reordering (and one-click reset back to OVR order).
- **Player/parent portal** — the head coach can create a read-only portal
  login from any player profile. Portal users see their own OVR, rating
  trend, report card, attendance, and tasks, and can RSVP (Going / Maybe /
  Can't go) to upcoming events; coaches see RSVPs on each event page.
- **Game stat tracking** — a stat book on game/scrimmage pages with
  sport-appropriate stats; season totals on player profiles; CSV export of
  season stats and the full ratings grid from the Ratings page.
- **Multi-sport presets** — Football, Basketball, Soccer, and Baseball, each
  with its own positions, rating attributes, OVR weight profiles, grade-sheet
  categories, and stat book. Picked at first-run setup.

## Phase 2 features

- **Player ratings** — every player has 0–99 attributes (Speed, Awareness,
  Throw Accuracy, Run Block, Tackling, …) and a position-weighted Overall
  (OVR) with Madden-style tiers (90+ elite → <60 project). Ratings grid at
  `/ratings`, full attribute card with manual overrides on each player profile.
- **Grading** — grade sheets on practice/game/scrimmage/workout pages: a quick
  0–100 overall plus per-category grades relevant to the player's position,
  with notes, per coach. Players who attended are listed automatically.
- **Grades move ratings** — each grade nudges the position-relevant attributes
  (capped ±2 per event, games count double); a quick overall alone gives a
  small effort/awareness nudge. Re-grading reverts the old adjustment first.
- **History & trends** — OVR trend chart and recent-grades report card on the
  player profile; "top movers — last 7 days" on the dashboard and a 7-day
  column in the ratings grid.
- **Weight profiles** — the head coach can edit each position's attribute
  weights at `/ratings/weights`.

## Phase 1 features

- **Auth & roles** — email/password sign-in; Head Coach, Assistant, and
  Position Coach roles. First run walks you through creating the team and the
  head coach account.
- **Roster** — add/edit/archive players with bio, positions, contact and
  emergency info, and coach notes. Player profile shows attendance history and
  open tasks.
- **Scheduling** — practices, games, scrimmages, meetings, and workouts, with
  weekly recurrence. Per-event attendance (present / late / excused / absent)
  with one-tap marking.
- **Tasks** — team to-dos assignable to staff or players, with due dates,
  statuses, and optional links to events.
- **Staff** — head coach can add/remove coaching staff.

## Getting started

```bash
npm install
cp .env.example .env      # then set a real AUTH_SECRET
npx prisma db push        # creates prisma/dev.db (SQLite)
npx prisma db seed        # optional: sample roster, events, tasks
npm run dev
```

Open http://localhost:3000.

- With seed data, sign in as `coach@example.com` / `password123`.
- Without seed data, the app takes you through first-run setup to create your
  team and head coach account.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Prisma](https://prisma.io) + SQLite (swap `datasource` to Postgres for production)
- [Tailwind CSS](https://tailwindcss.com)
- [Auth.js / NextAuth v5](https://authjs.dev) credentials auth
