-- Forward-only runtime privilege correction for the V1.1 pre-launch lead tables.
-- Role creation is an operator prerequisite and is intentionally not performed here.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'polismart_runtime') THEN
    RAISE EXCEPTION 'Required role polismart_runtime is absent; complete the separately authorized role bootstrap first';
  END IF;

  REVOKE ALL PRIVILEGES ON TABLE "prelaunch_leads" FROM "polismart_runtime";
  GRANT SELECT, INSERT ON TABLE "prelaunch_leads" TO "polismart_runtime";
  GRANT UPDATE ("status", "updated_at") ON TABLE "prelaunch_leads" TO "polismart_runtime";

  REVOKE ALL PRIVILEGES ON TABLE "prelaunch_lead_follow_ups" FROM "polismart_runtime";
  GRANT SELECT, INSERT ON TABLE "prelaunch_lead_follow_ups" TO "polismart_runtime";
  GRANT UPDATE ("completed_at", "completed_by_id") ON TABLE "prelaunch_lead_follow_ups" TO "polismart_runtime";
END
$$;
