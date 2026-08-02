import { createEvent } from "@/lib/actions/events";
import { EventForm } from "@/components/event-form";
import { PageHeader } from "@/components/page-header";

export default function NewEventPage() {
  return (
    <div>
      <PageHeader title="Add event" />
      <EventForm action={createEvent} submitLabel="Add event" allowRecurrence />
    </div>
  );
}
