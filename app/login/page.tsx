import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  const userCount = await prisma.user.count();
  if (userCount === 0) redirect("/setup");

  const team = await prisma.team.findFirst();

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-center">
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
