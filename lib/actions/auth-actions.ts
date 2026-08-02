"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type FormState = { error: string | null };

export async function login(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return { error: null };
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw e; // NEXT_REDIRECT on success
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

// First-run setup: create the team and the head coach account.
export async function completeSetup(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const userCount = await prisma.user.count();
  if (userCount > 0) return { error: "Setup has already been completed." };

  const teamName = String(formData.get("teamName") ?? "").trim();
  const season = String(formData.get("season") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!teamName || !name || !email || !password) {
    return { error: "All fields except season are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  await prisma.team.create({
    data: { name: teamName, season },
  });
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hash(password, 10),
      role: "HEAD_COACH",
    },
  });

  redirect("/login");
}
