-- Additive geographic governance metadata for controlled Nigeria configuration.
ALTER TABLE "geographic_levels" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "geographic_areas"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "source_institution" TEXT,
  ADD COLUMN "source_document" TEXT,
  ADD COLUMN "source_version_date" DATE,
  ADD COLUMN "imported_at" TIMESTAMP(3),
  ADD COLUMN "validation_status" TEXT;

CREATE INDEX "geographic_levels_tenant_id_is_active_idx" ON "geographic_levels"("tenant_id", "is_active");
CREATE INDEX "geographic_areas_tenant_campaign_active_idx" ON "geographic_areas"("tenant_id", "campaign_id", "is_active");
