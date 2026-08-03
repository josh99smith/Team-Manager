import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const userCount = await prisma.user.count();
  if (userCount > 0) redirect("/login");

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div
          className="w-12 h-12 rounded-xl bg-[var(--brand)] text-[var(--brand-ink)] flex items-center justify-center text-2xl mx-auto mb-4"
          aria-hidden
        >
          🏈
        </div>
        <h1 className="text-2xl font-bold text-center tracking-tight">
          Welcome to Team Manager
        </h1>
        <p className="text-sm text-slate-500 text-center mt-1 mb-6">
          Set up your team and head coach account to get started.
        </p>
        <SetupForm />
      </div>
    </main>
  );
}
