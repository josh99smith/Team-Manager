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
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/roster") return pathname.startsWith("/roster");
  if (href === "/calendar")
    return pathname.startsWith("/calendar") || pathname.startsWith("/events");
  return pathname.startsWith(href);
}

// Header surface color is whatever the team picked, so text/borders are
// tied to --secondary-ink (opacity-scaled) rather than fixed slate shades —
// that way a light team color still reads correctly.
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
    <header
      className="sticky top-0 z-50 bg-[var(--secondary)] text-[var(--secondary-ink)]"
    >
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14 gap-3">
        <Link href="/" className="font-bold text-lg whitespace-nowrap min-w-0 truncate">
          {teamName}
          {season && (
            <span className="ml-2 text-xs font-normal opacity-60">{season}</span>
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
                  ? "bg-[var(--brand)]/25 font-medium"
                  : "opacity-70 hover:opacity-100 hover:bg-[var(--secondary-ink)]/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-sm leading-tight">{userName}</div>
            <div className="text-xs opacity-60 leading-tight">{roleLabel}</div>
          </div>
          {userName && <Avatar name={userName} size="sm" />}
          <form action={logout}>
            <button className="text-xs opacity-70 hover:opacity-100 border border-[var(--secondary-ink)]/25 rounded-md px-2.5 py-1.5 cursor-pointer">
              Sign out
            </button>
          </form>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="md:hidden shrink-0 rounded-md border border-[var(--secondary-ink)]/25 px-3 py-1.5 text-lg leading-none cursor-pointer"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-[var(--secondary-ink)]/15 bg-[var(--secondary)] pb-4">
          <nav className="px-3 pt-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-base ${
                  isActive(pathname, item.href)
                    ? "bg-[var(--brand)]/25 font-medium"
                    : "opacity-70 hover:bg-[var(--secondary-ink)]/10"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 mx-3 pt-3 border-t border-[var(--secondary-ink)]/15 flex items-center justify-between gap-3">
            <div className="px-3 flex items-center gap-3">
              {userName && <Avatar name={userName} size="sm" />}
              <div>
                <div className="text-sm">{userName}</div>
                <div className="text-xs opacity-60">{roleLabel}</div>
              </div>
            </div>
            <form action={logout}>
              <button className="text-sm opacity-70 hover:opacity-100 border border-[var(--secondary-ink)]/25 rounded-md px-3 py-2 cursor-pointer">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
