import { PageHeader } from "@/components/page-header";
import { RosterImport } from "./roster-import";

export default function RosterImportPage() {
  return (
    <div>
      <PageHeader
        title="Import roster"
        subtitle="Paste a roster export (e.g. from Hudl) to bulk-add players. You'll get a preview to review before anything is saved."
      />
      <RosterImport />
    </div>
  );
}
