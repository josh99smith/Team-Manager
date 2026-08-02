import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updatePlayer } from "@/lib/actions/players";
import { PlayerForm } from "@/components/player-form";
import { PageHeader } from "@/components/page-header";
import { getTeamPreset } from "@/lib/team";

export default async function EditPlayerPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const [player, preset] = await Promise.all([
    prisma.player.findUnique({ where: { id } }),
    getTeamPreset(),
  ]);
  if (!player) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${player.firstName} ${player.lastName}`} />
      <PlayerForm
        action={updatePlayer.bind(null, player.id)}
        player={player}
        submitLabel="Save changes"
        positions={preset.positions}
        archetypes={preset.archetypes}
      />
    </div>
  );
}
