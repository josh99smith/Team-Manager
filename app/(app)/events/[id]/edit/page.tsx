import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateEvent } from "@/lib/actions/events";
import { EventForm } from "@/components/event-form";

export default async function EditEventPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit event</h1>
      {event.recurrenceId && (
        <p className="text-sm text-slate-500 mb-4">
          This event is part of a recurring series — changes here apply to this
          occurrence only.
        </p>
      )}
      <EventForm
        action={updateEvent.bind(null, event.id)}
        event={event}
        submitLabel="Save changes"
      />
    </div>
  );
}
