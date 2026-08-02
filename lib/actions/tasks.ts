"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function createTask(formData: FormData) {
  await requireSession();
  const str = (key: string) => String(formData.get(key) ?? "").trim();

  const title = str("title");
  if (!title) throw new Error("Title is required");

  const dueDateRaw = str("dueDate");
  const assignee = str("assignee"); // "user:<id>" | "player:<id>" | ""
  const eventId = str("eventId");

  await prisma.task.create({
    data: {
      title,
      description: str("description"),
      dueDate: dueDateRaw ? new Date(dueDateRaw + "T23:59:59") : null,
      assigneeUserId: assignee.startsWith("user:") ? assignee.slice(5) : null,
      assigneePlayerId: assignee.startsWith("player:") ? assignee.slice(7) : null,
      eventId: eventId || null,
    },
  });
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function setTaskStatus(id: string, status: string) {
  await requireSession();
  await prisma.task.update({ where: { id }, data: { status } });
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(id: string) {
  await requireSession();
  await prisma.task.delete({ where: { id } });
  revalidatePath("/tasks");
  revalidatePath("/");
}
