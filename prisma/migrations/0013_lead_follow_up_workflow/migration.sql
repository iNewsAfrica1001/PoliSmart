CREATE TABLE "prelaunch_lead_follow_ups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "lead_id" UUID NOT NULL,
  "note" VARCHAR(2000) NOT NULL,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "created_by_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "completed_by_id" UUID,
  CONSTRAINT "prelaunch_lead_follow_ups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prelaunch_lead_follow_ups_completion_check"
    CHECK (("completed_at" IS NULL AND "completed_by_id" IS NULL) OR
           ("completed_at" IS NOT NULL AND "completed_by_id" IS NOT NULL))
);

CREATE INDEX "prelaunch_lead_follow_ups_lead_id_created_at_idx"
  ON "prelaunch_lead_follow_ups"("lead_id", "created_at");

CREATE INDEX "prelaunch_lead_follow_ups_completed_at_scheduled_at_idx"
  ON "prelaunch_lead_follow_ups"("completed_at", "scheduled_at");

CREATE INDEX "prelaunch_lead_follow_ups_created_by_id_idx"
  ON "prelaunch_lead_follow_ups"("created_by_id");

CREATE INDEX "prelaunch_lead_follow_ups_completed_by_id_idx"
  ON "prelaunch_lead_follow_ups"("completed_by_id");

ALTER TABLE "prelaunch_lead_follow_ups"
  ADD CONSTRAINT "prelaunch_lead_follow_ups_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "prelaunch_leads"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "prelaunch_lead_follow_ups"
  ADD CONSTRAINT "prelaunch_lead_follow_ups_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "auth_users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "prelaunch_lead_follow_ups"
  ADD CONSTRAINT "prelaunch_lead_follow_ups_completed_by_id_fkey"
  FOREIGN KEY ("completed_by_id") REFERENCES "auth_users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'polismart_runtime') THEN
    EXECUTE 'GRANT SELECT, INSERT ON TABLE "prelaunch_lead_follow_ups" TO "polismart_runtime"';
    EXECUTE 'GRANT UPDATE ("completed_at", "completed_by_id") ON TABLE "prelaunch_lead_follow_ups" TO "polismart_runtime"';
  END IF;
END
$$;
