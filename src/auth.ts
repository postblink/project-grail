import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Resend({
      from: process.env.EMAIL_FROM ?? "noreply@example.com",
    }),
  ],
  // Prisma adapter manages users + accounts; JWT strategy keeps sessions out of DB
  // and allows Edge-compatible middleware (no Node.js modules needed at request time).
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (trigger === "update") {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { display_name: true, is_admin: true },
        });
        token.display_name = dbUser?.display_name ?? null;
        token.is_admin = dbUser?.is_admin ?? false;
        return token;
      }

      // `user` is only present on initial sign-in
      if (user?.id) {
        token.id = user.id;

        // Seed discord_id and display_name on first Discord login
        if (account?.provider === "discord") {
          const existing = await db.user.findUnique({
            where: { id: user.id },
            select: { discord_id: true, display_name: true, is_admin: true },
          });
          const updates: { discord_id?: string; display_name?: string } = {};
          if (!existing?.discord_id) updates.discord_id = account.providerAccountId;
          if (!existing?.display_name && user.name) updates.display_name = user.name;
          if (Object.keys(updates).length > 0) {
            await db.user.update({ where: { id: user.id }, data: updates });
          }
          token.is_admin = existing?.is_admin ?? false;
          token.display_name = updates.display_name ?? existing?.display_name ?? null;
        } else {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { is_admin: true, display_name: true },
          });
          token.is_admin = dbUser?.is_admin ?? false;
          token.display_name = dbUser?.display_name ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.is_admin = (token.is_admin as boolean) ?? false;
      session.user.display_name = (token.display_name as string | null) ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
