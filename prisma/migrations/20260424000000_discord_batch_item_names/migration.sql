ALTER TABLE "discord_batches" ADD COLUMN "item_names" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
