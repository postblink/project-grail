import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";

// Minimal config used in middleware (Edge Runtime — no Node.js modules, no DB adapter).
// Resend provider omitted here: email login requires an adapter (DB), incompatible with Edge.
// src/auth.ts extends this with the Prisma adapter, Resend provider, and DB callbacks.
export const authConfig: NextAuthConfig = {
  providers: [
    Discord({ clientId: process.env.DISCORD_CLIENT_ID!, clientSecret: process.env.DISCORD_CLIENT_SECRET! }),
  ],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    authorized({ auth }) {
      return !!auth;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.is_admin = (token.is_admin as boolean) ?? false;
      session.user.display_name = (token.display_name as string | null) ?? null;
      return session;
    },
  },
};
