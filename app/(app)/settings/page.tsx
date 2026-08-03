import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { TeamSettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  const team = await prisma.team.findFirst();
  const isHeadCoach = session?.user.role === "HEAD_COACH";

  return (
    <div>
      <PageHeader
        title="Team settings"
        subtitle="Team name, season, and the colors that theme the app."
      />
      {!team ? (
        <p className="text-sm text-slate-500">No team found.</p>
      ) : isHeadCoach ? (
        <TeamSettingsForm
          name={team.name}
          season={team.season}
          primaryColor={team.primaryColor}
          secondaryColor={team.secondaryColor}
        />
      ) : (
        <div className="card p-6 max-w-md">
          <h2 className="font-semibold mb-1">{team.name}</h2>
          <p className="text-sm text-slate-500 mb-4">
            {team.season || "No season set"} · Only the head coach can change
            team settings.
          </p>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border border-black/10"
                style={{ backgroundColor: team.primaryColor }}
              />
              Primary
            </span>
            <span className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full border border-black/10"
                style={{ backgroundColor: team.secondaryColor }}
              />
              Secondary
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
