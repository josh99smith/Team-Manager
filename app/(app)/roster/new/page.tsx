import { createPlayer } from "@/lib/actions/players";
import { PlayerForm } from "@/components/player-form";
import { getTeamPreset } from "@/lib/team";

export default async function NewPlayerPage() {
  const preset = await getTeamPreset();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add player</h1>
      <PlayerForm
        action={createPlayer}
        submitLabel="Add player"
        positions={preset.positions}
      />
    </div>
  );
}
