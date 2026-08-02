"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireHeadCoach } from "@/lib/auth";

export type FormState = { error: string | null };

export async function createStaff(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireHeadCoach();
  const str = (key: string) => String(formData.get(key) ?? "").trim();

  const name = str("name");
  const email = str("email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = str("role") || "ASSISTANT";
  const positionGroup = str("positionGroup") || null;

  if (!name || !email || !password) {
    return { error: "Name, email, and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with that email already exists." };

  await prisma.user.create({
    data: { name, email, passwordHash: await hash(password, 10), role, positionGroup },
  });
  revalidatePath("/staff");
  return { error: null };
}

export async function deleteStaff(id: string) {
  const session = await requireHeadCoach();
  if (session.user.id === id) throw new Error("You cannot delete your own account.");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/staff");
}
