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

export async function createPlayer(formData: FormData) {
  await requireSession();
  const data = playerDataFromForm(formData);
  if (!data.firstName || !data.lastName) throw new Error("Name is required");
  const player = await prisma.player.create({ data });

  const archetype = String(formData.get("archetype") ?? "").trim();
  if (archetype) await applyArchetype(player.id, archetype);

  revalidatePath("/roster");
  revalidatePath("/ratings");
  redirect(`/roster/${player.id}`);
}

export async function updatePlayer(id: string, formData: FormData) {
  await requireSession();
  const data = playerDataFromForm(formData);
  if (!data.firstName || !data.lastName) throw new Error("Name is required");
  await prisma.player.update({ where: { id }, data });

  // Optional re-roll: overwrite current ratings with the chosen archetype.
  const archetype = String(formData.get("archetype") ?? "").trim();
  if (archetype) await applyArchetype(id, archetype);

  revalidatePath("/roster");
  revalidatePath("/ratings");
  revalidatePath(`/roster/${id}`);
  redirect(`/roster/${id}`);
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
