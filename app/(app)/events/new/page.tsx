import { createEvent } from "@/lib/actions/events";
import { EventForm } from "@/components/event-form";

export default function NewEventPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add event</h1>
      <EventForm action={createEvent} submitLabel="Add event" allowRecurrence />
    </div>
  );
}
