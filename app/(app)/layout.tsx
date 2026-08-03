import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/constants";
import { AppHeader } from "@/components/app-header";
import { buildTeamTheme, themeStyleVars } from "@/lib/theme";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) {
    const userCount = await prisma.user.count();
    redirect(userCount === 0 ? "/setup" : "/login");
  }
  if (session.user.role === "PLAYER") redirect("/portal");

  const team = await prisma.team.findFirst();
  const theme = buildTeamTheme(team?.primaryColor, team?.secondaryColor);

  return (
    <div
      className="min-h-screen"
      style={themeStyleVars(theme) as React.CSSProperties}
    >
      <AppHeader
        teamName={team?.name ?? "Team Manager"}
        season={team?.season ?? ""}
        userName={session.user.name ?? ""}
        roleLabel={ROLE_LABELS[session.user.role] ?? session.user.role}
      />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
