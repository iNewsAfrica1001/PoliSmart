-- Additive Campaign Geography foundation only. No data is copied or rewritten here.
CREATE TABLE "master_geographic_levels" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "country_code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "master_geographic_levels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "master_geographic_areas" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "level_id" UUID NOT NULL,
  "parent_id" UUID,
  "country_code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "source_institution" TEXT,
  "source_document" TEXT,
  "source_version_date" DATE,
  "retrieval_date" DATE,
  "imported_at" TIMESTAMP(3),
  "validation_status" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "master_geographic_areas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaign_geographic_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "master_geographic_area_id" UUID NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_id" UUID NOT NULL,
  "updated_by_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "removed_at" TIMESTAMP(3),
  CONSTRAINT "campaign_geographic_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "master_geographic_levels_country_code_name_key" ON "master_geographic_levels"("country_code", "name");
CREATE UNIQUE INDEX "master_geographic_levels_country_code_order_index_key" ON "master_geographic_levels"("country_code", "order_index");
CREATE UNIQUE INDEX "master_geographic_levels_id_country_code_key" ON "master_geographic_levels"("id", "country_code");
CREATE INDEX "master_geographic_levels_country_code_is_active_order_index_idx" ON "master_geographic_levels"("country_code", "is_active", "order_index");

CREATE UNIQUE INDEX "master_geographic_areas_country_code_level_id_code_key" ON "master_geographic_areas"("country_code", "level_id", "code");
CREATE UNIQUE INDEX "master_geographic_areas_level_id_parent_id_name_key" ON "master_geographic_areas"("level_id", "parent_id", "name");
CREATE UNIQUE INDEX "master_geographic_areas_id_country_code_key" ON "master_geographic_areas"("id", "country_code");
CREATE UNIQUE INDEX "master_geographic_areas_root_level_id_name_key" ON "master_geographic_areas"("level_id", "name") WHERE "parent_id" IS NULL;
CREATE INDEX "master_geographic_areas_country_code_is_active_idx" ON "master_geographic_areas"("country_code", "is_active");
CREATE INDEX "master_geographic_areas_level_id_is_active_idx" ON "master_geographic_areas"("level_id", "is_active");
CREATE INDEX "master_geographic_areas_parent_id_is_active_idx" ON "master_geographic_areas"("parent_id", "is_active");
CREATE INDEX "master_geographic_areas_country_code_code_idx" ON "master_geographic_areas"("country_code", "code");

CREATE UNIQUE INDEX "campaign_geographic_assignments_tenant_id_campaign_id_master_geographic_area_id_key" ON "campaign_geographic_assignments"("tenant_id", "campaign_id", "master_geographic_area_id");
CREATE INDEX "campaign_geographic_assignments_tenant_id_campaign_id_is_active_idx" ON "campaign_geographic_assignments"("tenant_id", "campaign_id", "is_active");
CREATE INDEX "campaign_geographic_assignments_master_geographic_area_id_is_active_idx" ON "campaign_geographic_assignments"("master_geographic_area_id", "is_active");

ALTER TABLE "master_geographic_areas" ADD CONSTRAINT "master_geographic_areas_level_id_country_code_fkey" FOREIGN KEY ("level_id", "country_code") REFERENCES "master_geographic_levels"("id", "country_code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "master_geographic_areas" ADD CONSTRAINT "master_geographic_areas_parent_id_country_code_fkey" FOREIGN KEY ("parent_id", "country_code") REFERENCES "master_geographic_areas"("id", "country_code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "campaign_geographic_assignments" ADD CONSTRAINT "campaign_geographic_assignments_tenant_id_campaign_id_fkey" FOREIGN KEY ("tenant_id", "campaign_id") REFERENCES "campaigns"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "campaign_geographic_assignments" ADD CONSTRAINT "campaign_geographic_assignments_master_geographic_area_id_fkey" FOREIGN KEY ("master_geographic_area_id") REFERENCES "master_geographic_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "campaign_geographic_assignments" ADD CONSTRAINT "campaign_geographic_assignments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "campaign_geographic_assignments" ADD CONSTRAINT "campaign_geographic_assignments_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL PRIVILEGES ON TABLE "master_geographic_levels", "master_geographic_areas", "campaign_geographic_assignments" FROM "polismart_runtime";
GRANT SELECT ON TABLE "master_geographic_levels", "master_geographic_areas", "campaign_geographic_assignments" TO "polismart_runtime";
