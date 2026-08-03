import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { buildTeamTheme, themeStyleVars } from "@/lib/theme";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  const userCount = await prisma.user.count();
  if (userCount === 0) redirect("/setup");

  const team = await prisma.team.findFirst();
  const theme = buildTeamTheme(team?.primaryColor, team?.secondaryColor);

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={themeStyleVars(theme) as React.CSSProperties}
    >
      <div className="card w-full max-w-sm p-8">
        <div
          className="w-12 h-12 rounded-xl bg-[var(--brand)] text-[var(--brand-ink)] flex items-center justify-center text-2xl mx-auto mb-4"
          aria-hidden
        >
          🏈
        </div>
        <h1 className="text-2xl font-bold text-center tracking-tight">
          {team?.name ?? "Team Manager"}
        </h1>
        <p className="text-sm text-slate-500 text-center mt-1 mb-6">
          Coach sign in
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
