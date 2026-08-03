import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logout } from "@/lib/actions/auth-actions";
import { buildTeamTheme, themeStyleVars } from "@/lib/theme";

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PLAYER") redirect("/");

  const team = await prisma.team.findFirst();
  const theme = buildTeamTheme(team?.primaryColor, team?.secondaryColor);

  return (
    <div
      className="min-h-screen"
      style={themeStyleVars(theme) as React.CSSProperties}
    >
      <header className="bg-[var(--secondary)] text-[var(--secondary-ink)]">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="font-bold text-lg">
            {team?.name ?? "Team Manager"}
            <span className="ml-2 text-xs font-normal opacity-60">
              Player Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm opacity-70 hidden sm:inline">
              {session.user.name}
            </span>
            <form action={logout}>
              <button className="text-xs opacity-70 hover:opacity-100 border border-[var(--secondary-ink)]/25 rounded-md px-2.5 py-1.5 cursor-pointer">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
