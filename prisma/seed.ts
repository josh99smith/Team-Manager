import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import {
  DEFAULT_ATTRIBUTES,
  DEFAULT_POSITION_WEIGHTS,
  DEFAULT_RATING,
  primaryPosition,
} from "../lib/ratings/defaults";

const prisma = new PrismaClient();

// Seed attribute definitions + position weight profiles (idempotent).
async function seedRatingDefaults() {
  if ((await prisma.attributeDefinition.count()) > 0) return;
  await prisma.attributeDefinition.createMany({
    data: DEFAULT_ATTRIBUTES.map((a, i) => ({ ...a, sort: i })),
  });
  const defs = await prisma.attributeDefinition.findMany();
  const byKey = new Map(defs.map((d) => [d.key, d.id]));
  const rows: { position: string; attributeId: string; weight: number }[] = [];
  for (const [position, weights] of Object.entries(DEFAULT_POSITION_WEIGHTS)) {
    for (const [key, weight] of Object.entries(weights)) {
      const attributeId = byKey.get(key);
      if (attributeId) rows.push({ position, attributeId, weight });
    }
  }
  await prisma.positionWeight.createMany({ data: rows });
  console.log(`Seeded ${defs.length} attributes and default position weights.`);
}

// Give players without ratings a varied-but-deterministic starting profile.
async function seedPlayerRatings() {
  const players = await prisma.player.findMany({
    where: { ratings: { none: {} } },
  });
  if (players.length === 0) return;
  const defs = await prisma.attributeDefinition.findMany();

  for (const [pi, p] of players.entries()) {
    const pos = primaryPosition(p.positions);
    const weights = DEFAULT_POSITION_WEIGHTS[pos] ?? {};
    await prisma.playerRating.createMany({
      data: defs.map((d, di) => {
        // Deterministic pseudo-variance; weighted attributes skew higher.
        const wiggle = ((pi * 7 + di * 13) % 21) - 10; // -10..+10
        const bonus = d.key in weights ? 8 : 0;
        const value = Math.min(
          99,
          Math.max(35, DEFAULT_RATING + bonus + wiggle)
        );
        return { playerId: p.id, attributeId: d.id, value };
      }),
    });
  }
  console.log(`Seeded starting ratings for ${players.length} players.`);
}

async function main() {
  await seedRatingDefaults();

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    await seedPlayerRatings();
    console.log("Database already has users — skipped sample team data.");
    return;
  }

  await prisma.team.create({
    data: { name: "Eastside Eagles", sport: "Football", season: "2026" },
  });

  const coach = await prisma.user.create({
    data: {
      name: "Head Coach",
      email: "coach@example.com",
      passwordHash: await hash("password123", 10),
      role: "HEAD_COACH",
    },
  });

  await prisma.user.create({
    data: {
      name: "Alex Rivera",
      email: "assistant@example.com",
      passwordHash: await hash("password123", 10),
      role: "POSITION_COACH",
      positionGroup: "WR/DB",
    },
  });

  const playersData = [
    { firstName: "Marcus", lastName: "Johnson", jersey: 7, positions: "QB", heightIn: 74, weightLb: 195, classYear: "Senior" },
    { firstName: "DeShawn", lastName: "Williams", jersey: 22, positions: "RB", heightIn: 70, weightLb: 205, classYear: "Junior" },
    { firstName: "Tyler", lastName: "Brooks", jersey: 84, positions: "WR", heightIn: 73, weightLb: 180, classYear: "Senior" },
    { firstName: "Jamal", lastName: "Carter", jersey: 11, positions: "WR,CB", heightIn: 71, weightLb: 175, classYear: "Sophomore" },
    { firstName: "Ethan", lastName: "Kowalski", jersey: 55, positions: "C,OG", heightIn: 75, weightLb: 265, classYear: "Senior" },
    { firstName: "Miguel", lastName: "Santos", jersey: 72, positions: "OT", heightIn: 77, weightLb: 280, classYear: "Junior" },
    { firstName: "Chris", lastName: "Nguyen", jersey: 44, positions: "LB", heightIn: 72, weightLb: 220, classYear: "Junior" },
    { firstName: "Andre", lastName: "Thompson", jersey: 21, positions: "S", heightIn: 72, weightLb: 190, classYear: "Senior" },
    { firstName: "Kevin", lastName: "O'Brien", jersey: 3, positions: "K,P", heightIn: 70, weightLb: 170, classYear: "Sophomore" },
    { firstName: "Darius", lastName: "Mitchell", jersey: 88, positions: "TE", heightIn: 76, weightLb: 235, classYear: "Junior", status: "INJURED", notes: "Ankle sprain — expected back in 2 weeks." },
  ];

  const players = [];
  for (const p of playersData) {
    players.push(await prisma.player.create({ data: p }));
  }

  // Events: practices this week + a game Friday
  const now = new Date();
  const day = (offset: number, hour: number, minute = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute);
    return d;
  };

  const practice = await prisma.event.create({
    data: {
      type: "PRACTICE",
      startsAt: day(-2, 16),
      endsAt: day(-2, 18),
      location: "Main field",
      notes: "Install day — red zone package.",
    },
  });

  await prisma.event.createMany({
    data: [
      { type: "PRACTICE", startsAt: day(1, 16), endsAt: day(1, 18), location: "Main field" },
      { type: "PRACTICE", startsAt: day(3, 16), endsAt: day(3, 18), location: "Main field" },
      { type: "GAME", startsAt: day(5, 19), endsAt: day(5, 22), location: "Home stadium", opponent: "Westview Wolves" },
      { type: "MEETING", startsAt: day(4, 15, 30), endsAt: day(4, 16, 30), location: "Film room", title: "Film session", notes: "Review Westview's blitz packages." },
    ],
  });

  // Attendance for the past practice
  for (const [i, p] of players.entries()) {
    await prisma.attendance.create({
      data: {
        playerId: p.id,
        eventId: practice.id,
        status: i === 3 ? "LATE" : i === 9 ? "EXCUSED" : "PRESENT",
      },
    });
  }

  await prisma.task.createMany({
    data: [
      { title: "Collect physical forms", description: "Still missing forms from 3 players.", status: "IN_PROGRESS", assigneeUserId: coach.id, dueDate: day(4, 0) },
      { title: "Order new practice jerseys", status: "OPEN", dueDate: day(10, 0) },
      { title: "Watch film on Westview Wolves", description: "Focus on their blitz packages.", status: "OPEN", assigneePlayerId: players[0].id, dueDate: day(4, 0) },
      { title: "Set up game-day equipment checklist", status: "DONE" },
    ],
  });

  await seedPlayerRatings();

  console.log("Seeded: 1 team, 2 coaches, 10 players, 5 events, 4 tasks.");
  console.log("Login: coach@example.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
