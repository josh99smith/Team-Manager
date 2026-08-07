import { PageHeader } from "@/components/page-header";
import { CalendarImport } from "./calendar-import";

export default function CalendarImportPage() {
  return (
    <div>
      <PageHeader
        title="Import schedule"
        subtitle="Upload or snap a photo of a schedule and the AI will read it into events. You'll get a preview — with duplicate and conflict warnings — to review before anything is saved."
      />
      <CalendarImport />
    </div>
  );
}
