-- Add is_public toggle for the public profile page (/grail/<username>).
-- Default true so existing users keep their shareable profile until they opt out.
ALTER TABLE "users" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT true;
