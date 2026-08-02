"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth-actions";
import { Avatar } from "@/components/avatar";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/roster", label: "Roster", icon: "👥" },
  { href: "/ratings", label: "Ratings", icon: "📊" },
  { href: "/depth-chart", label: "Depth Chart", icon: "🗂️" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/tasks", label: "Tasks", icon: "✅" },
  { href: "/staff", label: "Staff", icon: "🎧" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/roster") return pathname.startsWith("/roster");
  if (href === "/calendar")
    return pathname.startsWith("/calendar") || pathname.startsWith("/events");
  return pathname.startsWith(href);
}

export function AppHeader({
  teamName,
  season,
  userName,
  roleLabel,
}: {
  teamName: string;
  season: string;
  userName: string;
  roleLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever navigation happens.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14 gap-3">
        <Link href="/" className="font-bold text-lg whitespace-nowrap min-w-0 truncate">
          {teamName}
          {season && (
            <span className="ml-2 text-xs font-normal text-slate-400">{season}</span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                isActive(pathname, item.href)
                  ? "bg-[var(--brand)]/25 text-white font-medium"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-sm leading-tight">{userName}</div>
            <div className="text-xs text-slate-400 leading-tight">{roleLabel}</div>
          </div>
          {userName && <Avatar name={userName} size="sm" />}
          <form action={logout}>
            <button className="text-xs text-slate-400 hover:text-white border border-slate-700 rounded-md px-2.5 py-1.5 cursor-pointer">
              Sign out
            </button>
          </form>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="md:hidden shrink-0 rounded-md border border-slate-700 px-3 py-1.5 text-lg leading-none cursor-pointer"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 pb-4">
          <nav className="px-3 pt-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-base ${
                  isActive(pathname, item.href)
                    ? "bg-[var(--brand)]/25 text-white font-medium"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 mx-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="px-3 flex items-center gap-3">
              {userName && <Avatar name={userName} size="sm" />}
              <div>
                <div className="text-sm">{userName}</div>
                <div className="text-xs text-slate-400">{roleLabel}</div>
              </div>
            </div>
            <form action={logout}>
              <button className="text-sm text-slate-300 hover:text-white border border-slate-700 rounded-md px-3 py-2 cursor-pointer">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
