"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireHeadCoach, requirePlayerSession } from "@/lib/auth";

export type FormState = { error: string | null };

// Head coach creates a read-only portal login for a player (or their parent).
export async function createPlayerAccount(
  playerId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireHeadCoach();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const [player, existingEmail, existingAccount] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId } }),
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { playerId } }),
  ]);
  if (!player) return { error: "Player not found." };
  if (existingEmail) return { error: "A user with that email already exists." };
  if (existingAccount) return { error: "This player already has a portal account." };

  await prisma.user.create({
    data: {
      name: `${player.firstName} ${player.lastName}`,
      email,
      passwordHash: await hash(password, 10),
      role: "PLAYER",
      playerId,
    },
  });
  revalidatePath(`/roster/${playerId}`);
  return { error: null };
}

export async function deletePlayerAccount(playerId: string) {
  await requireHeadCoach();
  await prisma.user.deleteMany({ where: { playerId, role: "PLAYER" } });
  revalidatePath(`/roster/${playerId}`);
}

// Player sets their own RSVP from the portal. Status: GOING | MAYBE | NOT_GOING
export async function setRsvp(eventId: string, status: string) {
  const session = await requirePlayerSession();
  const playerId = session.user.playerId!;
  if (!["GOING", "MAYBE", "NOT_GOING"].includes(status)) return;

  await prisma.rsvp.upsert({
    where: { playerId_eventId: { playerId, eventId } },
    create: { playerId, eventId, status },
    update: { status },
  });
  revalidatePath("/portal");
}
