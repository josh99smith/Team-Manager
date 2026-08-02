import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updatePlayer } from "@/lib/actions/players";
import { PlayerForm } from "@/components/player-form";

export default async function EditPlayerPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Edit {player.firstName} {player.lastName}
      </h1>
      <PlayerForm
        action={updatePlayer.bind(null, player.id)}
        player={player}
        submitLabel="Save changes"
      />
    </div>
  );
}
