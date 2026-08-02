import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logout } from "@/lib/actions/auth-actions";
import { ROLE_LABELS } from "@/lib/constants";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/roster", label: "Roster" },
  { href: "/ratings", label: "Ratings" },
  { href: "/calendar", label: "Calendar" },
  { href: "/tasks", label: "Tasks" },
  { href: "/staff", label: "Staff" },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) {
    const userCount = await prisma.user.count();
    redirect(userCount === 0 ? "/setup" : "/login");
  }

  const team = await prisma.team.findFirst();

  return (
    <div className="min-h-screen">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-8 min-w-0">
            <Link href="/" className="font-bold text-lg whitespace-nowrap">
              {team?.name ?? "Team Manager"}
              {team?.season && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {team.season}
                </span>
              )}
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-md text-sm text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-sm leading-tight">{session.user.name}</div>
              <div className="text-xs text-slate-400 leading-tight">
                {ROLE_LABELS[session.user.role] ?? session.user.role}
              </div>
            </div>
            <form action={logout}>
              <button className="text-xs text-slate-400 hover:text-white border border-slate-700 rounded-md px-2.5 py-1.5 cursor-pointer">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
