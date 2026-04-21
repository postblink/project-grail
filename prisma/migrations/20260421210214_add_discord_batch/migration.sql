-- CreateTable
CREATE TABLE "discord_batches" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "profile_url" TEXT NOT NULL,
    "items_found" INTEGER NOT NULL DEFAULT 0,
    "pct_before" INTEGER NOT NULL,
    "pct_current" INTEGER NOT NULL,
    "found_current" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "milestones" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "achievement_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "flush_after" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discord_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discord_batches_flush_after_idx" ON "discord_batches"("flush_after");

-- CreateIndex
CREATE UNIQUE INDEX "discord_batches_league_id_user_id_key" ON "discord_batches"("league_id", "user_id");

-- AddForeignKey
ALTER TABLE "discord_batches" ADD CONSTRAINT "discord_batches_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discord_batches" ADD CONSTRAINT "discord_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
