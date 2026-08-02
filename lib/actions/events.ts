"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

const MAX_RECURRENCE_INSTANCES = 60;

export type FormState = { error: string | null };

function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return "Something went wrong while saving. Please try again.";
}

function eventDataFromForm(formData: FormData) {
  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const startsAtRaw = str("startsAt");
  const endsAtRaw = str("endsAt");
  if (!startsAtRaw) return null;

  return {
    type: str("type") || "PRACTICE",
    title: str("title"),
    startsAt: new Date(startsAtRaw),
    endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
    location: str("location"),
    opponent: str("opponent") || null,
    notes: str("notes"),
  };
}

export async function createEvent(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  let target: string;
  try {
    await requireSession();
    const data = eventDataFromForm(formData);
    if (!data) return { error: "A start date and time is required." };

    const repeatDays = formData
      .getAll("repeatDays")
      .map((d) => parseInt(String(d), 10));
    const repeatUntilRaw = String(formData.get("repeatUntil") ?? "").trim();

    if (repeatDays.length === 0 || !repeatUntilRaw) {
      // Non-recurring: single event.
      const event = await prisma.event.create({ data });
      target = `/events/${event.id}`;
    } else {
      // Recurring: materialize one event per matching weekday through the end date.
      const until = new Date(repeatUntilRaw + "T23:59:59");
      const durationMs = data.endsAt
        ? data.endsAt.getTime() - data.startsAt.getTime()
        : 0;
      const recurrenceId = randomUUID();

      const instances: (typeof data & { recurrenceId: string })[] = [];
      const cursor = new Date(data.startsAt);
      while (cursor <= until && instances.length < MAX_RECURRENCE_INSTANCES) {
        if (repeatDays.includes(cursor.getDay())) {
          const startsAt = new Date(cursor);
          instances.push({
            ...data,
            startsAt,
            endsAt: durationMs ? new Date(startsAt.getTime() + durationMs) : null,
            recurrenceId,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      if (instances.length === 0) {
        return { error: "No dates match the selected repeat days before the end date." };
      }

      await prisma.event.createMany({ data: instances });
      target = "/calendar";
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/calendar");
  redirect(target);
}

export async function updateEvent(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await requireSession();
    const data = eventDataFromForm(formData);
    if (!data) return { error: "A start date and time is required." };
    await prisma.event.update({ where: { id }, data });
  } catch (e) {
    return { error: errorMessage(e) };
  }

  revalidatePath("/calendar");
  revalidatePath(`/events/${id}`);
  redirect(`/events/${id}`);
}

export async function deleteEvent(id: string, scope: "one" | "series" = "one") {
  await requireSession();
  const event = await prisma.event.findUniqueOrThrow({ where: { id } });
  if (scope === "series" && event.recurrenceId) {
    await prisma.event.deleteMany({ where: { recurrenceId: event.recurrenceId } });
  } else {
    await prisma.event.delete({ where: { id } });
  }
  revalidatePath("/calendar");
  redirect("/calendar");
}

export async function markAttendance(
  eventId: string,
  playerId: string,
  status: string
) {
  await requireSession();
  await prisma.attendance.upsert({
    where: { playerId_eventId: { playerId, eventId } },
    create: { playerId, eventId, status },
    update: { status },
  });
  revalidatePath(`/events/${eventId}`);
}

export async function clearAttendance(eventId: string, playerId: string) {
  await requireSession();
  await prisma.attendance.deleteMany({ where: { eventId, playerId } });
  revalidatePath(`/events/${eventId}`);
}
