import type { NextAuthConfig } from "next-auth";
import Discord from "next-auth/providers/discord";

// Minimal config used in middleware (Edge Runtime — no Node.js modules, no DB adapter).
// Resend provider omitted here: email login requires an adapter (DB), incompatible with Edge.
// src/auth.ts extends this with the Prisma adapter, Resend provider, and DB callbacks.
// Discord returns an RFC 9207 `iss` parameter on the authorization redirect. Auth.js
// checks it against the provider issuer and, with none configured, falls back to a
// placeholder, so every Discord callback failed with `error=Configuration`. Discord
// publishes this value as `issuer` in https://discord.com/.well-known/openid-configuration.
export const DISCORD_ISSUER = "https://discord.com";

export const authConfig: NextAuthConfig = {
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      issuer: DISCORD_ISSUER,
      // Link Discord to an existing email-based account (magic link) if the email matches.
      // Safe here: Discord only exposes verified emails.
      allowDangerousEmailAccountLinking: true,
    }),
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
