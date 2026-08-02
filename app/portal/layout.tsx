import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logout } from "@/lib/actions/auth-actions";

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PLAYER") redirect("/");

  const team = await prisma.team.findFirst();

  return (
    <div className="min-h-screen">
      <header className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="font-bold text-lg">
            {team?.name ?? "Team Manager"}
            <span className="ml-2 text-xs font-normal text-slate-400">
              Player Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300 hidden sm:inline">
              {session.user.name}
            </span>
            <form action={logout}>
              <button className="text-xs text-slate-400 hover:text-white border border-slate-700 rounded-md px-2.5 py-1.5 cursor-pointer">
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
