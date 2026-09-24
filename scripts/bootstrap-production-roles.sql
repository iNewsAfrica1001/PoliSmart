\set ON_ERROR_STOP on

-- Repository-reviewed Production role bootstrap template.
-- Run only through scripts/bootstrap-production-roles.ps1 under the separately
-- authorized protected-owner procedure documented in DATABASE_OPERATIONS.md.
-- The wrapper replaces the two password placeholders in memory and streams this
-- template to psql over standard input. Do not run this template directly.
BEGIN;

SET LOCAL standard_conforming_strings = on;

DO $bootstrap_precheck$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname IN ('polismart_runtime', 'polismart_migrator')
  ) THEN
    RAISE EXCEPTION
      'Role bootstrap refused: polismart_runtime and polismart_migrator must both be absent';
  END IF;
END
$bootstrap_precheck$;

CREATE ROLE polismart_runtime
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

CREATE ROLE polismart_migrator
  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT CONNECT ON DATABASE neondb TO polismart_runtime;
REVOKE CREATE ON DATABASE neondb FROM polismart_runtime;
GRANT USAGE ON SCHEMA public TO polismart_runtime;
REVOKE CREATE ON SCHEMA public FROM polismart_runtime;

GRANT CONNECT, CREATE ON DATABASE neondb TO polismart_migrator;
GRANT USAGE, CREATE ON SCHEMA public TO polismart_migrator;

ALTER ROLE polismart_runtime PASSWORD __POLISMART_RUNTIME_PASSWORD_SQL_LITERAL__;
ALTER ROLE polismart_migrator PASSWORD __POLISMART_MIGRATOR_PASSWORD_SQL_LITERAL__;

COMMIT;
