ALTER TABLE "prelaunch_leads"
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "prelaunch_leads"
  DROP CONSTRAINT "prelaunch_leads_status_check";

ALTER TABLE "prelaunch_leads"
  ADD CONSTRAINT "prelaunch_leads_status_check"
  CHECK ("status" IN ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED'));

GRANT UPDATE ON TABLE "prelaunch_leads" TO "polismart_runtime";
