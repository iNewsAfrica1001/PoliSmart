-- Additive, read-only access to the shared survey reference catalogs required
-- by the Command Center aggregate query.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'polismart_runtime') THEN
    RAISE EXCEPTION 'Required role polismart_runtime is absent; complete the separately authorized role bootstrap first';
  END IF;

  GRANT SELECT ON TABLE
    "data_sources",
    "survey_countries",
    "survey_indicator_definitions"
  TO "polismart_runtime";
END
$$;
