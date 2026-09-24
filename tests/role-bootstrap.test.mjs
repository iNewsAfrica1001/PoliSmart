import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const sql = readFileSync("scripts/bootstrap-production-roles.sql", "utf8");
const wrapper = readFileSync("scripts/bootstrap-production-roles.ps1", "utf8");
const operations = readFileSync("DATABASE_OPERATIONS.md", "utf8");

const precheckEnd = sql.indexOf("$bootstrap_precheck$;");
const runtimeCreate = sql.indexOf("CREATE ROLE polismart_runtime");
const migratorCreate = sql.indexOf("CREATE ROLE polismart_migrator");
const runtimePasswordAssignment = sql.indexOf(
  "ALTER ROLE polismart_runtime PASSWORD __POLISMART_RUNTIME_PASSWORD_SQL_LITERAL__;",
);
const migratorPasswordAssignment = sql.indexOf(
  "ALTER ROLE polismart_migrator PASSWORD __POLISMART_MIGRATOR_PASSWORD_SQL_LITERAL__;",
);

test("atomic bootstrap checks both role names before creating either", () => {
  assert.match(sql, /\\set ON_ERROR_STOP on/);
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/);
  assert.match(
    sql,
    /rolname IN \('polismart_runtime', 'polismart_migrator'\)[\s\S]*RAISE EXCEPTION/,
  );
  assert.ok(precheckEnd >= 0);
  assert.ok(runtimeCreate > precheckEnd);
  assert.ok(migratorCreate > precheckEnd);
  assert.doesNotMatch(sql, /CREATE ROLE[\s\S]*IF NOT EXISTS/i);
  assert.doesNotMatch(sql.slice(0, runtimeCreate), /ALTER ROLE|DROP ROLE/i);
  assert.doesNotMatch(sql, /DROP ROLE/i);
});

test("existing runtime, migrator, or both fail through the same pre-create guard", () => {
  const guard = sql.slice(0, precheckEnd);
  const precheckAllows = (existingRoles) =>
    !existingRoles.some((role) => ["polismart_runtime", "polismart_migrator"].includes(role));
  assert.match(guard, /EXISTS \([\s\S]*FROM pg_roles/);
  assert.match(guard, /polismart_runtime/);
  assert.match(guard, /polismart_migrator/);
  assert.match(guard, /RAISE EXCEPTION/);
  assert.doesNotMatch(guard, /CREATE ROLE/);
  assert.equal(precheckAllows([]), true, "case A: neither role exists");
  assert.equal(precheckAllows(["polismart_runtime"]), false, "case B: runtime exists");
  assert.equal(precheckAllows(["polismart_migrator"]), false, "case C: migrator exists");
  assert.equal(
    precheckAllows(["polismart_runtime", "polismart_migrator"]),
    false,
    "case D: both roles exist",
  );
});

test("role and privilege failures remain inside the all-or-nothing transaction", () => {
  const begin = sql.indexOf("BEGIN;");
  const commit = sql.lastIndexOf("COMMIT;");
  assert.ok(begin >= 0 && commit > begin);
  for (const statement of [
    "CREATE ROLE polismart_runtime",
    "CREATE ROLE polismart_migrator",
    "GRANT CONNECT ON DATABASE neondb TO polismart_runtime",
    "GRANT CONNECT, CREATE ON DATABASE neondb TO polismart_migrator",
    "ALTER ROLE polismart_runtime PASSWORD __POLISMART_RUNTIME_PASSWORD_SQL_LITERAL__;",
    "ALTER ROLE polismart_migrator PASSWORD __POLISMART_MIGRATOR_PASSWORD_SQL_LITERAL__;",
  ]) {
    const position = sql.indexOf(statement);
    assert.ok(position > begin && position < commit, `${statement} must be transactional`);
  }
  assert.match(
    operations,
    /closing the resulting[\s\S]*failed `psql` session rolls back every bootstrap statement/,
  );
});

test("bootstrap preserves the least-privilege runtime and migrator designs", () => {
  assert.match(
    sql,
    /CREATE ROLE polismart_runtime\s+LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS/,
  );
  assert.match(
    sql,
    /CREATE ROLE polismart_migrator\s+LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS/,
  );
  assert.match(sql, /REVOKE CREATE ON SCHEMA public FROM PUBLIC/);
  assert.match(sql, /GRANT CONNECT ON DATABASE neondb TO polismart_runtime/);
  assert.match(sql, /REVOKE CREATE ON DATABASE neondb FROM polismart_runtime/);
  assert.match(sql, /GRANT USAGE ON SCHEMA public TO polismart_runtime/);
  assert.match(sql, /REVOKE CREATE ON SCHEMA public FROM polismart_runtime/);
  assert.match(sql, /GRANT CONNECT, CREATE ON DATABASE neondb TO polismart_migrator/);
  assert.match(sql, /GRANT USAGE, CREATE ON SCHEMA public TO polismart_migrator/);
  assert.doesNotMatch(sql, /GRANT[\s\S]*ON TABLE/i);
  assert.doesNotMatch(sql, /CREATE (?:TABLE|EXTENSION|SCHEMA)/i);
});

test("credentials are collected securely and never embedded", () => {
  assert.doesNotMatch(sql, /\\password\b/);
  assert.doesNotMatch(sql, /\\prompt\s+-s\b|\\prompt\s+-pw\b/);
  assert.doesNotMatch(wrapper, /\\prompt\s+-s\b|\\prompt\s+-pw\b|\\password\b/);
  assert.match(wrapper, /Read-Host "Enter password for polismart_runtime" -AsSecureString/);
  assert.match(wrapper, /Read-Host "Enter password for polismart_migrator" -AsSecureString/);
  assert.match(sql, /ALTER ROLE polismart_runtime PASSWORD __POLISMART_RUNTIME_PASSWORD_SQL_LITERAL__;/);
  assert.match(sql, /ALTER ROLE polismart_migrator PASSWORD __POLISMART_MIGRATOR_PASSWORD_SQL_LITERAL__;/);
  assert.doesNotMatch(sql, /PASSWORD\s+'[^:]/i);
  assert.doesNotMatch(sql, /generated-(?:runtime|migrator)-password/i);
  assert.ok(runtimePasswordAssignment > runtimeCreate);
  assert.ok(migratorPasswordAssignment > migratorCreate);
  assert.ok(runtimePasswordAssignment < migratorPasswordAssignment);
  assert.ok(runtimePasswordAssignment < sql.lastIndexOf("COMMIT;"));
  assert.ok(migratorPasswordAssignment < sql.lastIndexOf("COMMIT;"));
  assert.equal((sql.match(/ALTER ROLE\s+\w+\s+PASSWORD/gi) ?? []).length, 2);
  assert.match(wrapper, /\.Replace\("'", "''"\)/);
  assert.match(wrapper, /RedirectStandardInput = \$true/);
  assert.match(wrapper, /StandardInput\.Write\(\$sql\)/);
  assert.doesNotMatch(wrapper, /Arguments?[^\r\n]*(?:Password|Connection)/i);
  assert.match(wrapper, /\$runtimePassword -ceq \$migratorPassword/);
  assert.match(wrapper, /SecureStringToBSTR/);
  assert.match(wrapper, /ZeroFreeBSTR/);
  assert.match(wrapper, /\$runtimePassword = \$null/);
  assert.match(wrapper, /\$migratorPassword = \$null/);
  assert.match(wrapper, /EnvironmentVariables\["PGPASSWORD"\] = ""/);
  assert.match(wrapper, /EnvironmentVariables\.Clear\(\)/);
  assert.match(operations, /safe SQL\s+string-literal escaping/);
});

test("wrapper protects connection input and redacts subprocess failures", () => {
  assert.match(wrapper, /Read-Host "Enter the protected owner PostgreSQL connection URL" -AsSecureString/);
  assert.match(wrapper, /EnvironmentVariables\["PGPASSWORD"\] = \$connection\.Password/);
  assert.match(wrapper, /Protect-DiagnosticText/);
  assert.doesNotMatch(
    wrapper,
    /Write-(?:Host|Output)[^\r\n]*\$(?:ownerConnection|runtimePassword|migratorPassword|connection\.Password)/i,
  );
  assert.doesNotMatch(wrapper, /Out-File|Set-Content|Add-Content|New-TemporaryFile/);
});

test("connection URLs parse under Windows PowerShell without Web.HttpUtility", () => {
  assert.doesNotMatch(wrapper, /Web\.HttpUtility/);
  const parserStart = wrapper.indexOf("function ConvertFrom-UriComponent");
  const parserEnd = wrapper.indexOf("function Protect-DiagnosticText");
  assert.ok(parserStart >= 0 && parserEnd > parserStart);
  const parserFunctions = wrapper.slice(parserStart, parserEnd);
  const syntheticPassword = "p@:/%#?&='word";
  const script = `${parserFunctions}
$results = @(
  Get-ConnectionParts 'postgresql://user%40ops:p%40%3A%2F%25%23%3F%26%3D%27word@example.test:6543/tenant%2Fdb?sslmode=verify-full&channel_binding=require'
  Get-ConnectionParts 'postgres://second:synthetic@example.test/sample?sslmode=require'
)
$results | ConvertTo-Json -Compress
`;
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", "$input | Out-String | Invoke-Expression"],
    { input: script, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.notEqual(result.stdout.trim(), "", result.stderr);
  const parsed = JSON.parse(result.stdout.trim());
  assert.deepEqual(parsed[0], {
    Host: "example.test",
    Database: "tenant/db",
    SslMode: "verify-full",
    User: "user@ops",
    Port: "6543",
    ChannelBinding: "require",
    Password: syntheticPassword,
  });
  assert.deepEqual(parsed[1], {
    Host: "example.test",
    Database: "sample",
    SslMode: "require",
    User: "second",
    Port: "5432",
    ChannelBinding: "require",
    Password: "synthetic",
  });
  assert.doesNotMatch(result.stderr, /user%40ops|p%40|syntheticPassword/);
});

test("Neon connection input normalization accepts clipboard whitespace and outer quotes", () => {
  const parserStart = wrapper.indexOf("function ConvertFrom-UriComponent");
  const parserEnd = wrapper.indexOf("function Protect-DiagnosticText");
  const parserFunctions = wrapper.slice(parserStart, parserEnd);
  const neonUrl =
    "postgresql://testuser:testpassword@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  const script = `${parserFunctions}
$inputs = @(
  '${neonUrl}'
  '  ${neonUrl}  '
  '"${neonUrl}"'
  "'${neonUrl}'"
  'postgres://testuser:testpassword@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  'postgresql://test%40user:p%40ss%3Aword@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require'
)
$inputs | ForEach-Object {
  $parsed = Get-ConnectionParts $_
  [pscustomobject]@{
    Host = $parsed.Host
    Database = $parsed.Database
    SslMode = $parsed.SslMode
    ChannelBinding = $parsed.ChannelBinding
  }
} | ConvertTo-Json -Compress
`;
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", "$input | Out-String | Invoke-Expression"],
    { input: script, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout.trim());
  assert.equal(parsed.length, 6);
  for (const entry of parsed) {
    assert.equal(entry.Host, "ep-example-pooler.us-east-2.aws.neon.tech");
    assert.equal(entry.Database, "neondb");
    assert.match(entry.SslMode, /^(?:require|verify-full)$/);
    assert.equal(entry.ChannelBinding, "require");
  }
  assert.doesNotMatch(result.stderr, /must be a PostgreSQL connection URL/);
});

test("wrapper exposes a no-network protected connection validation mode", () => {
  assert.match(wrapper, /\[switch\]\$ValidateConnectionOnly/);
  assert.match(wrapper, /if \(\$ValidateConnectionOnly\) \{/);
  assert.match(wrapper, /No database connection was attempted/);
  const validation = wrapper.indexOf("if ($ValidateConnectionOnly)");
  const processStart = wrapper.indexOf("$process = [Diagnostics.Process]::new()");
  assert.ok(validation >= 0 && processStart > validation);
});

test("connection URL parser fails closed on malformed encoding and insecure parameters", () => {
  const parserStart = wrapper.indexOf("function ConvertFrom-UriComponent");
  const parserEnd = wrapper.indexOf("function Protect-DiagnosticText");
  const parserFunctions = wrapper.slice(parserStart, parserEnd);
  const script = `${parserFunctions}
function Test-Rejected([string]$Url) {
  try { $null = Get-ConnectionParts $Url; return $false }
  catch { return $true }
}
$result = @{
  malformed = @(
    Test-Rejected 'postgresql://user%ZZ:synthetic@example.test/db'
    Test-Rejected 'postgresql://user:synthetic%G1@example.test/db'
    Test-Rejected 'postgresql://user:synthetic@example.test/db%1G'
    Test-Rejected 'postgresql://user:synthetic@example.test/db?%25=valid&%=bad'
    Test-Rejected 'postgresql://user:synthetic@example.test/db?name=%A'
    Test-Rejected 'postgresql://user:synthetic@example.test/db?name=%2'
  )
  duplicates = @(
    Test-Rejected 'postgresql://user:synthetic@example.test/db?application_name=one&application_name=two'
    Test-Rejected 'postgresql://user:synthetic@example.test/db?sslmode=require&sslmode=disable'
    Test-Rejected 'postgresql://user:synthetic@example.test/db?channel_binding=require&channel_binding=disable'
    Test-Rejected 'postgresql://user:synthetic@example.test/db?sslmode=require&SSLMODE=disable'
    Test-Rejected 'postgresql://user:synthetic@example.test/db?channel_binding=require&CHANNEL_BINDING=disable'
  )
  insecureSsl = @(
    Test-Rejected 'postgresql://user:synthetic@example.test/db?sslmode=disable'
    Test-Rejected 'postgresql://user:synthetic@example.test/db?sslmode=allow'
    Test-Rejected 'postgresql://user:synthetic@example.test/db?sslmode=prefer'
  )
  weakChannelBinding = @(
    Test-Rejected 'postgresql://user:synthetic@example.test/db?channel_binding=disable'
    Test-Rejected 'postgresql://user:synthetic@example.test/db?channel_binding=prefer'
    Test-Rejected 'postgresql://user:synthetic@example.test/db?channel_binding='
  )
  secureSsl = @(
    (Get-ConnectionParts 'postgresql://user:synthetic@example.test/db?sslmode=require').SslMode
    (Get-ConnectionParts 'postgresql://user:synthetic@example.test/db?sslmode=verify-ca').SslMode
    (Get-ConnectionParts 'postgresql://user:synthetic@example.test/db?sslmode=verify-full').SslMode
  )
  defaults = Get-ConnectionParts 'postgresql://user:synthetic@example.test/db'
}
$result | ConvertTo-Json -Compress
`;
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", "$input | Out-String | Invoke-Expression"],
    { input: script, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout.trim());
  assert.deepEqual(parsed.malformed, [true, true, true, true, true, true]);
  assert.deepEqual(parsed.duplicates, [true, true, true, true, true]);
  assert.deepEqual(parsed.insecureSsl, [true, true, true]);
  assert.deepEqual(parsed.weakChannelBinding, [true, true, true]);
  assert.deepEqual(parsed.secureSsl, ["require", "verify-ca", "verify-full"]);
  assert.equal(parsed.defaults.SslMode, "require");
  assert.equal(parsed.defaults.ChannelBinding, "require");
});

test("password and grant failures roll back both newly created roles", () => {
  const executeTransaction = (failurePoint) => {
    const state = { roles: new Set() };
    const snapshot = new Set(state.roles);
    try {
      for (const step of [
        "create-runtime",
        "create-migrator",
        "grant",
        "runtime-password",
        "migrator-password",
      ]) {
        if (step === "create-runtime") state.roles.add("polismart_runtime");
        if (step === "create-migrator") state.roles.add("polismart_migrator");
        if (step === failurePoint) throw new Error(`simulated ${step} failure`);
      }
      return state;
    } catch {
      state.roles = snapshot;
      return state;
    }
  };

  for (const failurePoint of ["runtime-password", "migrator-password", "grant"]) {
    assert.deepEqual(
      [...executeTransaction(failurePoint).roles],
      [],
      `${failurePoint} must leave neither newly created role`,
    );
  }
});
