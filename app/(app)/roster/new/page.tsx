import { createPlayer } from "@/lib/actions/players";
import { PlayerForm } from "@/components/player-form";
import { PageHeader } from "@/components/page-header";
import { getTeamPreset } from "@/lib/team";

export default async function NewPlayerPage() {
  const preset = await getTeamPreset();
  return (
    <div>
      <PageHeader title="Add player" />
      <PlayerForm
        action={createPlayer}
        submitLabel="Add player"
        positions={preset.positions}
        archetypes={preset.archetypes}
      />
    </div>
  );
}
