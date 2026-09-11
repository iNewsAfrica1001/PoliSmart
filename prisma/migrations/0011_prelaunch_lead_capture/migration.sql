CREATE TABLE "prelaunch_leads" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "request_type" VARCHAR(20) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "organization" VARCHAR(160) NOT NULL,
  "country" VARCHAR(100) NOT NULL,
  "role" VARCHAR(120) NOT NULL,
  "interest" VARCHAR(80),
  "organization_type" VARCHAR(80),
  "timing" VARCHAR(40),
  "note" VARCHAR(500),
  "status" VARCHAR(20) NOT NULL DEFAULT 'NEW',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prelaunch_leads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prelaunch_leads_request_type_check" CHECK ("request_type" IN ('EARLY_ACCESS', 'DEMO')),
  CONSTRAINT "prelaunch_leads_status_check" CHECK ("status" IN ('NEW', 'CONTACTED', 'CLOSED'))
);

CREATE INDEX "prelaunch_leads_request_type_status_created_at_idx"
  ON "prelaunch_leads"("request_type", "status", "created_at");

GRANT SELECT, INSERT ON TABLE "prelaunch_leads" TO "polismart_runtime";
