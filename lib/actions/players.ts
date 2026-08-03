"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { applyArchetype } from "@/lib/ratings/engine";

function playerDataFromForm(formData: FormData) {
  const num = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    return v ? parseInt(v, 10) : null;
  };
  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const birthdateRaw = str("birthdate");

  return {
    firstName: str("firstName"),
    lastName: str("lastName"),
    jersey: num("jersey"),
    positions: formData.getAll("positions").map(String).join(","),
    heightIn: num("heightIn"),
    weightLb: num("weightLb"),
    birthdate: birthdateRaw ? new Date(birthdateRaw) : null,
    classYear: str("classYear") || null,
    email: str("email") || null,
    phone: str("phone") || null,
    emergencyName: str("emergencyName") || null,
    emergencyPhone: str("emergencyPhone") || null,
    status: str("status") || "ACTIVE",
    notes: str("notes"),
  };
}

export type FormState = { error: string | null };

function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return "Something went wrong while saving. Please try again.";
}

export async function createPlayer(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  let playerId: string;
  try {
    await requireSession();
    const data = playerDataFromForm(formData);
    if (!data.firstName || !data.lastName) {
      return { error: "First and last name are required." };
    }
    const player = await prisma.player.create({ data });
    playerId = player.id;

    const archetype = String(formData.get("archetype") ?? "").trim();
    if (archetype) await applyArchetype(player.id, archetype);
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/roster");
  revalidatePath("/ratings");
  redirect(`/roster/${playerId}`);
}

export async function updatePlayer(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await requireSession();
    const data = playerDataFromForm(formData);
    if (!data.firstName || !data.lastName) {
      return { error: "First and last name are required." };
    }
    await prisma.player.update({ where: { id }, data });

    // Optional re-roll: overwrite current ratings with the chosen archetype.
    const archetype = String(formData.get("archetype") ?? "").trim();
    if (archetype) await applyArchetype(id, archetype);
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/roster");
  revalidatePath("/ratings");
  revalidatePath(`/roster/${id}`);
  redirect(`/roster/${id}`);
}

export type ImportPlayerInput = {
  firstName: string;
  lastName: string;
  jersey: number | null;
  positions: string;
  heightIn: number | null;
  weightLb: number | null;
  classYear: string;
};

export type ImportState = { error: string | null; count: number };

// Bulk-create players from a parsed roster import (e.g. Hudl export).
// Rows are pre-validated/filtered client-side; this just persists them.
export async function bulkImportPlayers(
  rows: ImportPlayerInput[]
): Promise<ImportState> {
  await requireSession();

  const clean = rows.filter((r) => r.firstName.trim() && r.lastName.trim());
  if (clean.length === 0) return { error: "No valid players to import.", count: 0 };

  await prisma.player.createMany({
    data: clean.map((r) => ({
      firstName: r.firstName.trim(),
      lastName: r.lastName.trim(),
      jersey: r.jersey,
      positions: r.positions,
      heightIn: r.heightIn,
      weightLb: r.weightLb,
      classYear: r.classYear || null,
      status: "ACTIVE",
    })),
  });

  revalidatePath("/roster");
  revalidatePath("/ratings");
  return { error: null, count: clean.length };
}

export async function setPlayerStatus(id: string, status: string) {
  await requireSession();
  await prisma.player.update({ where: { id }, data: { status } });
  revalidatePath("/roster");
  revalidatePath(`/roster/${id}`);
}

export async function deletePlayer(id: string) {
  await requireSession();
  await prisma.player.delete({ where: { id } });
  revalidatePath("/roster");
  redirect("/roster");
}
