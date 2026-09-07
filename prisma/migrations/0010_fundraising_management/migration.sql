-- Additive V1.1 fundraising administration schema. No payment data is collected or processed.
CREATE TYPE "FundraisingRecordStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REVERSED', 'ARCHIVED');
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

CREATE TABLE "fundraising_goals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "campaign_id" UUID NOT NULL,
  "title" TEXT NOT NULL, "target_amount" DECIMAL(18,2) NOT NULL, "currency" VARCHAR(3) NOT NULL, "starts_at" DATE, "ends_at" DATE,
  "status" "FundraisingRecordStatus" NOT NULL DEFAULT 'PLANNED', "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fundraising_goals_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "fundraising_contacts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "campaign_id" UUID NOT NULL,
  "display_name" TEXT NOT NULL, "email" TEXT, "phone" TEXT, "affiliation" TEXT, "notes" TEXT,
  "status" "FundraisingRecordStatus" NOT NULL DEFAULT 'ACTIVE', "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fundraising_contacts_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "fundraising_contributions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "campaign_id" UUID NOT NULL,
  "contact_id" UUID, "goal_id" UUID, "amount" DECIMAL(18,2) NOT NULL, "currency" VARCHAR(3) NOT NULL, "contributed_at" DATE NOT NULL,
  "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING', "external_reference" TEXT, "source_method" TEXT,
  "archived_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "fundraising_contributions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "fundraising_activities" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "campaign_id" UUID NOT NULL,
  "title" TEXT NOT NULL, "activity_type" TEXT NOT NULL, "occurs_at" TIMESTAMP(3) NOT NULL,
  "status" "FundraisingRecordStatus" NOT NULL DEFAULT 'PLANNED', "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fundraising_activities_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "fundraising_follow_ups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "campaign_id" UUID NOT NULL,
  "contact_id" UUID, "title" TEXT NOT NULL, "due_at" TIMESTAMP(3) NOT NULL,
  "status" "FollowUpStatus" NOT NULL DEFAULT 'OPEN', "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fundraising_follow_ups_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "fundraising_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "campaign_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL, "entity_type" TEXT NOT NULL, "entity_id" UUID NOT NULL, "action" TEXT NOT NULL,
  "changes" JSONB NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fundraising_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fundraising_goals_tenant_id_campaign_id_status_idx" ON "fundraising_goals"("tenant_id", "campaign_id", "status");
CREATE INDEX "fundraising_contacts_tenant_id_campaign_id_status_idx" ON "fundraising_contacts"("tenant_id", "campaign_id", "status");
CREATE INDEX "fundraising_contributions_tenant_id_campaign_id_status_contributed_at_idx" ON "fundraising_contributions"("tenant_id", "campaign_id", "status", "contributed_at");
CREATE INDEX "fundraising_contributions_tenant_id_contact_id_idx" ON "fundraising_contributions"("tenant_id", "contact_id");
CREATE INDEX "fundraising_contributions_tenant_id_goal_id_idx" ON "fundraising_contributions"("tenant_id", "goal_id");
CREATE INDEX "fundraising_activities_tenant_id_campaign_id_status_occurs_at_idx" ON "fundraising_activities"("tenant_id", "campaign_id", "status", "occurs_at");
CREATE INDEX "fundraising_follow_ups_tenant_id_campaign_id_status_due_at_idx" ON "fundraising_follow_ups"("tenant_id", "campaign_id", "status", "due_at");
CREATE INDEX "fundraising_follow_ups_tenant_id_contact_id_idx" ON "fundraising_follow_ups"("tenant_id", "contact_id");
CREATE INDEX "fundraising_history_tenant_id_campaign_id_created_at_idx" ON "fundraising_history"("tenant_id", "campaign_id", "created_at");
CREATE INDEX "fundraising_history_tenant_id_entity_type_entity_id_idx" ON "fundraising_history"("tenant_id", "entity_type", "entity_id");

ALTER TABLE "fundraising_goals" ADD CONSTRAINT "fundraising_goals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fundraising_goals" ADD CONSTRAINT "fundraising_goals_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fundraising_contacts" ADD CONSTRAINT "fundraising_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fundraising_contacts" ADD CONSTRAINT "fundraising_contacts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fundraising_contributions" ADD CONSTRAINT "fundraising_contributions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fundraising_contributions" ADD CONSTRAINT "fundraising_contributions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fundraising_contributions" ADD CONSTRAINT "fundraising_contributions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "fundraising_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fundraising_contributions" ADD CONSTRAINT "fundraising_contributions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "fundraising_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fundraising_activities" ADD CONSTRAINT "fundraising_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fundraising_activities" ADD CONSTRAINT "fundraising_activities_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fundraising_follow_ups" ADD CONSTRAINT "fundraising_follow_ups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fundraising_follow_ups" ADD CONSTRAINT "fundraising_follow_ups_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fundraising_follow_ups" ADD CONSTRAINT "fundraising_follow_ups_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "fundraising_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fundraising_history" ADD CONSTRAINT "fundraising_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fundraising_history" ADD CONSTRAINT "fundraising_history_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fundraising_history" ADD CONSTRAINT "fundraising_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
