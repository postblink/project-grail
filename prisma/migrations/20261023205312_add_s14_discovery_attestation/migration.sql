ALTER TABLE "grail_entries"
  ADD COLUMN "discovery_drop_attested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "discovery_identification_attested" BOOLEAN NOT NULL DEFAULT false;
