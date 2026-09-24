\set ON_ERROR_STOP on

-- Repository-reviewed Production role bootstrap.
-- Run only through the separately authorized protected-owner procedure documented in
-- DATABASE_OPERATIONS.md. Hidden prompts keep credentials out of this file and
-- command history. Do not run psql with query-echo or tracing options.
BEGIN;

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

\prompt -s 'Enter password for polismart_runtime: ' runtime_password
\prompt -s 'Enter password for polismart_migrator: ' migrator_password

ALTER ROLE polismart_runtime PASSWORD :'runtime_password';
ALTER ROLE polismart_migrator PASSWORD :'migrator_password';

\unset runtime_password
\unset migrator_password

COMMIT;
