# Team Manager

A team management app for coaches: roster, scheduling with attendance, tasks —
and (coming in Phase 2) a Madden-style player rating system driven by practice
and game grades. See [PLAN.md](./PLAN.md) for the full roadmap.

## Phase 1 features (current)

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
