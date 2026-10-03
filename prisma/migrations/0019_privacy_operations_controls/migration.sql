CREATE TYPE "PrivacyRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'DELETION', 'OBJECTION', 'RESTRICTION', 'PORTABILITY');
CREATE TYPE "PrivacyCaseStatus" AS ENUM ('RECEIVED', 'IDENTITY_VERIFICATION_PENDING', 'UNDER_REVIEW', 'ACTION_PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PrivacyVerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED');
CREATE TYPE "PrivacyControlStatus" AS ENUM ('ACTIVE', 'UNDER_REVIEW', 'RELEASED', 'REVOKED');

CREATE TABLE "privacy_rights_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL, "case_reference" VARCHAR(64) NOT NULL,
  "request_type" "PrivacyRequestType" NOT NULL, "status" "PrivacyCaseStatus" NOT NULL DEFAULT 'RECEIVED',
  "received_at" TIMESTAMP(3) NOT NULL, "identity_verification_status" "PrivacyVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "assigned_operator_id" UUID, "resolution_status" VARCHAR(80), "completed_at" TIMESTAMP(3),
  "internal_notes" VARCHAR(4000), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "privacy_rights_cases_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "privacy_case_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "case_id" UUID NOT NULL, "actor_id" UUID NOT NULL,
  "action" VARCHAR(80) NOT NULL, "metadata" JSONB, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "privacy_case_events_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "privacy_suppressions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "campaign_id" UUID NOT NULL,
  "case_id" UUID NOT NULL, "subject_key_hash" VARCHAR(64) NOT NULL, "channel" VARCHAR(40) NOT NULL,
  "reason_category" VARCHAR(80) NOT NULL, "effective_at" TIMESTAMP(3) NOT NULL,
  "status" "PrivacyControlStatus" NOT NULL DEFAULT 'ACTIVE', "review_at" TIMESTAMP(3),
  "review_reference" VARCHAR(160), "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "privacy_suppressions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "privacy_legal_holds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tenant_id" UUID NOT NULL, "campaign_id" UUID NOT NULL,
  "case_id" UUID NOT NULL, "hold_reference" VARCHAR(80) NOT NULL, "authorized_issuer" VARCHAR(160) NOT NULL,
  "scope" VARCHAR(500) NOT NULL, "reason_reference" VARCHAR(160) NOT NULL, "effective_at" TIMESTAMP(3) NOT NULL,
  "status" "PrivacyControlStatus" NOT NULL DEFAULT 'ACTIVE', "review_at" TIMESTAMP(3), "released_at" TIMESTAMP(3),
  "release_authorization" VARCHAR(160), "created_by_id" UUID NOT NULL, "released_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "privacy_legal_holds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "privacy_rights_cases_tenant_id_case_reference_key" ON "privacy_rights_cases"("tenant_id", "case_reference");
CREATE INDEX "privacy_rights_cases_tenant_id_campaign_id_status_created_at_idx" ON "privacy_rights_cases"("tenant_id", "campaign_id", "status", "created_at");
CREATE INDEX "privacy_case_events_case_id_created_at_idx" ON "privacy_case_events"("case_id", "created_at");
CREATE UNIQUE INDEX "privacy_suppressions_tenant_id_campaign_id_subject_key_hash_channel_key" ON "privacy_suppressions"("tenant_id", "campaign_id", "subject_key_hash", "channel");
CREATE INDEX "privacy_suppressions_tenant_id_campaign_id_status_idx" ON "privacy_suppressions"("tenant_id", "campaign_id", "status");
CREATE UNIQUE INDEX "privacy_legal_holds_tenant_id_hold_reference_key" ON "privacy_legal_holds"("tenant_id", "hold_reference");
CREATE INDEX "privacy_legal_holds_tenant_id_campaign_id_status_idx" ON "privacy_legal_holds"("tenant_id", "campaign_id", "status");

ALTER TABLE "privacy_rights_cases" ADD CONSTRAINT "privacy_rights_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_rights_cases" ADD CONSTRAINT "privacy_rights_cases_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_rights_cases" ADD CONSTRAINT "privacy_rights_cases_assigned_operator_id_fkey" FOREIGN KEY ("assigned_operator_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_case_events" ADD CONSTRAINT "privacy_case_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "privacy_rights_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_case_events" ADD CONSTRAINT "privacy_case_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_suppressions" ADD CONSTRAINT "privacy_suppressions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_suppressions" ADD CONSTRAINT "privacy_suppressions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_suppressions" ADD CONSTRAINT "privacy_suppressions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "privacy_rights_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_suppressions" ADD CONSTRAINT "privacy_suppressions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_legal_holds" ADD CONSTRAINT "privacy_legal_holds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_legal_holds" ADD CONSTRAINT "privacy_legal_holds_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_legal_holds" ADD CONSTRAINT "privacy_legal_holds_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "privacy_rights_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_legal_holds" ADD CONSTRAINT "privacy_legal_holds_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_legal_holds" ADD CONSTRAINT "privacy_legal_holds_released_by_id_fkey" FOREIGN KEY ("released_by_id") REFERENCES "auth_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

REVOKE ALL PRIVILEGES ON TABLE "privacy_rights_cases", "privacy_case_events", "privacy_suppressions", "privacy_legal_holds" FROM "polismart_runtime";
GRANT SELECT, INSERT ON TABLE "privacy_rights_cases", "privacy_case_events", "privacy_suppressions", "privacy_legal_holds" TO "polismart_runtime";
GRANT UPDATE ("status", "identity_verification_status", "assigned_operator_id", "resolution_status", "completed_at", "internal_notes", "updated_at") ON TABLE "privacy_rights_cases" TO "polismart_runtime";
GRANT UPDATE ("status", "review_at", "review_reference", "updated_at") ON TABLE "privacy_suppressions" TO "polismart_runtime";
GRANT UPDATE ("status", "review_at", "released_at", "release_authorization", "released_by_id", "updated_at") ON TABLE "privacy_legal_holds" TO "polismart_runtime";
