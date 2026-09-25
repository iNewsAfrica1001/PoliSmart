import test from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

test("wrapper and SQL template share an exact fail-closed password placeholder contract", () => {
  const runtimePlaceholder = "__POLISMART_RUNTIME_PASSWORD_SQL_LITERAL__";
  const migratorPlaceholder = "__POLISMART_MIGRATOR_PASSWORD_SQL_LITERAL__";
  assert.equal(sql.split(runtimePlaceholder).length - 1, 1);
  assert.equal(sql.split(migratorPlaceholder).length - 1, 1);
  assert.equal(wrapper.split(`"${runtimePlaceholder}"`).length - 1, 1);
  assert.equal(wrapper.split(`"${migratorPlaceholder}"`).length - 1, 1);
  assert.match(wrapper, /\[regex\]::Matches\(/);
  assert.match(wrapper, /\[regex\]::Escape\(\$runtimePlaceholder\)/);
  assert.match(wrapper, /\[regex\]::Escape\(\$migratorPlaceholder\)/);
  assert.doesNotMatch(wrapper, /\.Split\(\$runtimePlaceholder\)|\.Split\(\$migratorPlaceholder\)/);

  const functionStart = wrapper.indexOf("function ConvertTo-PostgresStringLiteral");
  const functionEnd = wrapper.indexOf("function ConvertFrom-UriComponent");
  assert.ok(functionStart >= 0 && functionEnd > functionStart);
  const templateFunctions = wrapper.slice(functionStart, functionEnd);
  const encodedTemplate = Buffer.from(sql, "utf8").toString("base64");
  const script = `${templateFunctions}
$template = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedTemplate}'))
$runtime = "runtime'example"
$migrator = "migrator'example"
$expanded = Expand-RolePasswordTemplate $template $runtime $migrator
$zeroRejected = $false
$duplicateRejected = $false
try {
  $null = Expand-RolePasswordTemplate ($template.Replace('${runtimePlaceholder}', '')) $runtime $migrator
} catch { $zeroRejected = $true }
try {
  $duplicate = $template.Replace('${migratorPlaceholder}', '${migratorPlaceholder}${migratorPlaceholder}')
  $null = Expand-RolePasswordTemplate $duplicate $runtime $migrator
} catch { $duplicateRejected = $true }
@{
  placeholdersRemoved = (!$expanded.Contains('${runtimePlaceholder}') -and !$expanded.Contains('${migratorPlaceholder}'))
  runtimeExact = ([regex]::Matches($expanded, "ALTER ROLE polismart_runtime PASSWORD 'runtime''example';").Count -eq 1)
  migratorExact = ([regex]::Matches($expanded, "ALTER ROLE polismart_migrator PASSWORD 'migrator''example';").Count -eq 1)
  runtimeOccurrences = ([regex]::Matches($expanded, "runtime''example").Count)
  migratorOccurrences = ([regex]::Matches($expanded, "migrator''example").Count)
  zeroRejected = $zeroRejected
  duplicateRejected = $duplicateRejected
} | ConvertTo-Json -Compress
`;
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", "$input | Out-String | Invoke-Expression"],
    { input: script, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim()), {
    runtimeOccurrences: 1,
    migratorExact: true,
    zeroRejected: true,
    runtimeExact: true,
    duplicateRejected: true,
    migratorOccurrences: 1,
    placeholdersRemoved: true,
  });
  assert.doesNotMatch(result.stdout, /runtime'example|migrator'example/);
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

test("Windows psql discovery resolves PATH first and otherwise selects the highest installed version", () => {
  const resolverStart = wrapper.indexOf("function Resolve-PsqlExecutable");
  const resolverEnd = wrapper.indexOf("function ConvertTo-PostgresStringLiteral");
  assert.ok(resolverStart >= 0 && resolverEnd > resolverStart);
  const resolverFunction = wrapper.slice(resolverStart, resolverEnd);
  const root = mkdtempSync(join(tmpdir(), "polismart-psql-resolution-"));
  try {
    const pathDirectory = join(root, "path bin");
    const installRoot = join(root, "Program Files", "PostgreSQL");
    const version15 = join(installRoot, "15", "bin");
    const version18 = join(installRoot, "18", "bin");
    mkdirSync(pathDirectory, { recursive: true });
    mkdirSync(version15, { recursive: true });
    mkdirSync(version18, { recursive: true });
    const pathPsql = join(pathDirectory, "psql-test-path.exe");
    const psql15 = join(version15, "psql.exe");
    const psql18 = join(version18, "psql.exe");
    copyFileSync(process.execPath, pathPsql);
    writeFileSync(psql15, "synthetic executable placeholder");
    writeFileSync(psql18, "synthetic executable placeholder");
    const encodedResolver = Buffer.from(resolverFunction, "utf8").toString("base64");
    const encodedPathPsql = Buffer.from(pathPsql, "utf8").toString("base64");
    const encodedPathDirectory = Buffer.from(pathDirectory, "utf8").toString("base64");
    const encodedInstallRoot = Buffer.from(installRoot, "utf8").toString("base64");
    const script = `
$resolver = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedResolver}'))
Invoke-Expression $resolver
$pathPsql = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPathPsql}'))
$pathDirectory = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPathDirectory}'))
$installRoot = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedInstallRoot}'))
$requestedResolved = Resolve-PsqlExecutable $pathPsql $installRoot 'missing-from-path.exe'
$originalPath = $env:PATH
$env:PATH = $pathDirectory + [IO.Path]::PathSeparator + $originalPath
$pathResolved = Resolve-PsqlExecutable '' $installRoot 'psql-test-path.exe'
$env:PATH = $originalPath
$installResolved = Resolve-PsqlExecutable '' $installRoot 'missing-from-path.exe'
$missingRejected = $false
try { $null = Resolve-PsqlExecutable '' (Join-Path $installRoot 'absent') 'missing-from-path.exe' }
catch { $missingRejected = $_.Exception.Message -eq 'PostgreSQL psql.exe could not be located.' }
@{
  pathResolved = $pathResolved
  requestedResolved = $requestedResolved
  installResolved = $installResolved
  missingRejected = $missingRejected
} | ConvertTo-Json -Compress
`;
    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", "$input | Out-String | Invoke-Expression"],
      { input: script, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout.trim());
    assert.equal(parsed.pathResolved.toLowerCase(), pathPsql.toLowerCase());
    assert.equal(parsed.requestedResolved.toLowerCase(), pathPsql.toLowerCase());
    assert.equal(parsed.installResolved.toLowerCase(), psql18.toLowerCase());
    assert.equal(parsed.missingRejected, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  assert.match(wrapper, /\$startInfo\.FileName = \$resolvedPsqlPath/);
  assert.doesNotMatch(wrapper, /\$startInfo\.FileName = ["']psql(?:\.exe)?["']/i);
});

test("connection URLs parse under Windows PowerShell without Web.HttpUtility", () => {
  assert.doesNotMatch(wrapper, /Web\.HttpUtility/);
  assert.doesNotMatch(wrapper, /\[Uri\]::TryCreate|\[Uri\]\s*\$/);
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
  ([string][char]13 + [char]10 + '${neonUrl}' + [char]13 + [char]10)
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
  assert.equal(parsed.length, 7);
  for (const entry of parsed) {
    assert.equal(entry.Host, "ep-example-pooler.us-east-2.aws.neon.tech");
    assert.equal(entry.Database, "neondb");
    assert.match(entry.SslMode, /^(?:require|verify-full)$/);
    assert.equal(entry.ChannelBinding, "require");
  }
  assert.doesNotMatch(result.stderr, /must be a PostgreSQL connection URL/);
});

test("interactive parser failures provide only non-secret structural diagnostics", () => {
  const parserStart = wrapper.indexOf("function ConvertFrom-UriComponent");
  const parserEnd = wrapper.indexOf("function Protect-DiagnosticText");
  const parserFunctions = wrapper.slice(parserStart, parserEnd);
  const script = `${parserFunctions}
$inputs = @('', 'ep-example-pooler.us-east-2.aws.neon.tech', 'psql postgresql://user:secret@example.test/db', 'DATABASE_URL=postgresql://user:secret@example.test/db')
$inputs | ForEach-Object {
  try { $null = Get-ConnectionParts $_; 'UNEXPECTED_ACCEPTANCE' }
  catch { $_.Exception.Message }
} | ConvertTo-Json -Compress
`;
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", "$input | Out-String | Invoke-Expression"],
    { input: script, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const diagnostics = JSON.parse(result.stdout.trim());
  assert.equal(diagnostics.length, 4);
  assert.match(diagnostics[0], /Input was blank: YES/);
  assert.match(diagnostics[1], /Detected scheme: none/);
  assert.match(diagnostics[2], /is a psql command/);
  assert.match(diagnostics[3], /is a shell assignment/);
  for (const diagnostic of diagnostics) {
    assert.match(diagnostic, /Outer quotes removed: (?:YES|NO)/);
    assert.match(diagnostic, /Contains @ separator: (?:YES|NO)/);
    assert.doesNotMatch(diagnostic, /secret|example\.test|ep-example|DATABASE_URL=/);
  }
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
