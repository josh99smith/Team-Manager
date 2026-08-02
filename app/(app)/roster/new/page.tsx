import { createPlayer } from "@/lib/actions/players";
import { PlayerForm } from "@/components/player-form";

export default function NewPlayerPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Add player</h1>
      <PlayerForm action={createPlayer} submitLabel="Add player" />
    </div>
  );
}
