import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team Manager",
  description: "Roster, scheduling, tasks, and player development for your team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
