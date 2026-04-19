import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "noreply@example.com",
      name: "Project Grail",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "discord" && user.id) {
        const existing = await db.user.findUnique({
          where: { id: user.id },
          select: { discord_id: true, display_name: true },
        });
        const updates: { discord_id?: string; display_name?: string } = {};
        if (!existing?.discord_id) {
          updates.discord_id = account.providerAccountId;
        }
        if (!existing?.display_name && user.name) {
          updates.display_name = user.name;
        }
        if (Object.keys(updates).length > 0) {
          await db.user.update({ where: { id: user.id }, data: updates });
        }
      }
      return true;
    },
    async session({ session, user }) {
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { is_admin: true, display_name: true },
      });
      session.user.id = user.id;
      session.user.is_admin = dbUser?.is_admin ?? false;
      session.user.display_name = dbUser?.display_name ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
