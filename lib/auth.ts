import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface User {
    role?: string;
    playerId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      playerId?: string | null;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)
          ?.toLowerCase()
          .trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          playerId: user.playerId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.playerId = user.playerId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "ASSISTANT";
        session.user.playerId = (token.playerId as string | null) ?? null;
      }
      return session;
    },
  },
});

// Coach-only guard: portal (PLAYER) accounts cannot mutate team data.
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if (session.user.role === "PLAYER") throw new Error("Not authorized");
  return session;
}

export async function requirePlayerSession() {
  const session = await auth();
  if (!session?.user?.playerId || session.user.role !== "PLAYER") {
    throw new Error("Not authorized");
  }
  return session;
}

export async function requireHeadCoach() {
  const session = await requireSession();
  if (session.user.role !== "HEAD_COACH") throw new Error("Not authorized");
  return session;
}
