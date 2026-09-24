[CmdletBinding()]
param(
  [string]$PsqlPath = "psql",
  [switch]$ValidateConnectionOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertFrom-ProtectedValue {
  param([Parameter(Mandatory)][Security.SecureString]$Value)
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function ConvertTo-PostgresStringLiteral {
  param([Parameter(Mandatory)][string]$Value)
  if ($Value.Contains([char]0)) { throw "Role passwords cannot contain a null character." }
  return "'" + $Value.Replace("'", "''") + "'"
}

function Expand-RolePasswordTemplate {
  param(
    [Parameter(Mandatory)][string]$Template,
    [Parameter(Mandatory)][string]$RuntimePassword,
    [Parameter(Mandatory)][string]$MigratorPassword
  )
  $runtimePlaceholder = "__POLISMART_RUNTIME_PASSWORD_SQL_LITERAL__"
  $migratorPlaceholder = "__POLISMART_MIGRATOR_PASSWORD_SQL_LITERAL__"
  $runtimeCount = [regex]::Matches(
    $Template,
    [regex]::Escape($runtimePlaceholder),
    [Text.RegularExpressions.RegexOptions]::CultureInvariant
  ).Count
  $migratorCount = [regex]::Matches(
    $Template,
    [regex]::Escape($migratorPlaceholder),
    [Text.RegularExpressions.RegexOptions]::CultureInvariant
  ).Count
  if ($runtimeCount -ne 1 -or $migratorCount -ne 1) {
    throw "The authoritative SQL template does not contain exactly one placeholder per role."
  }
  return $Template.Replace(
    $runtimePlaceholder,
    (ConvertTo-PostgresStringLiteral $RuntimePassword)
  ).Replace(
    $migratorPlaceholder,
    (ConvertTo-PostgresStringLiteral $MigratorPassword)
  )
}

function ConvertFrom-UriComponent {
  param([Parameter(Mandatory)][string]$Value)
  if ($Value -match '%(?![0-9A-Fa-f]{2})') {
    throw "The protected connection value contains malformed percent encoding."
  }
  return [Uri]::UnescapeDataString($Value.Replace("+", " "))
}

function Normalize-ConnectionInput {
  param([Parameter(Mandatory)][string]$Value)
  $normalized = $Value.Trim()
  if ($normalized.Length -ge 2) {
    $first = $normalized[0]
    $last = $normalized[$normalized.Length - 1]
    if (($first -eq '"' -and $last -eq '"') -or
        ($first -eq "'" -and $last -eq "'")) {
      $normalized = $normalized.Substring(1, $normalized.Length - 2).Trim()
    }
  }
  if (!$normalized) {
    throw "The protected connection value must be a PostgreSQL connection URL."
  }
  return $normalized
}

function Get-ConnectionQueryParameters {
  param([AllowEmptyString()][string]$Query)
  $parameters = New-Object 'System.Collections.Generic.Dictionary[string,string]' (
    [StringComparer]::OrdinalIgnoreCase
  )
  foreach ($pair in $Query.TrimStart("?").Split("&", [StringSplitOptions]::RemoveEmptyEntries)) {
    $parts = $pair.Split("=", 2)
    $name = ConvertFrom-UriComponent $parts[0]
    $value = if ($parts.Count -eq 2) { ConvertFrom-UriComponent $parts[1] } else { "" }
    if ($parameters.ContainsKey($name)) {
      throw "The protected connection value contains a duplicate query parameter."
    }
    $parameters.Add($name, $value)
  }
  return $parameters
}

function Get-ConnectionParts {
  param([Parameter(Mandatory)][string]$ConnectionString)
  $normalized = Normalize-ConnectionInput $ConnectionString
  if ($normalized -match '%(?![0-9A-Fa-f]{2})') {
    throw "The protected connection value contains malformed percent encoding."
  }
  $uri = $null
  if (![Uri]::TryCreate($normalized, [UriKind]::Absolute, [ref]$uri) -or
      $uri.Scheme -notin @("postgres", "postgresql") -or !$uri.Host) {
    throw "The protected connection value must be a PostgreSQL connection URL."
  }
  $userInfo = $uri.UserInfo.Split(":", 2)
  if ($userInfo.Count -ne 2 -or !$userInfo[0] -or !$userInfo[1]) {
    throw "The protected connection value must include a user and password."
  }
  $database = $uri.AbsolutePath.TrimStart("/")
  if (!$database) { throw "The protected connection value must identify a database." }
  $query = Get-ConnectionQueryParameters $uri.Query
  $sslMode = if ($query.ContainsKey("sslmode")) {
    $query["sslmode"].ToLowerInvariant()
  } else {
    "require"
  }
  if ($sslMode -notin @("require", "verify-ca", "verify-full")) {
    throw "The protected connection value must use a secure SSL mode."
  }
  $channelBinding = if ($query.ContainsKey("channel_binding")) {
    $query["channel_binding"].ToLowerInvariant()
  } else {
    "require"
  }
  if ($channelBinding -ne "require") {
    throw "The protected connection value must require channel binding."
  }
  return @{
    Host = $uri.Host
    Port = if ($uri.IsDefaultPort) { "5432" } else { [string]$uri.Port }
    Database = ConvertFrom-UriComponent $database
    User = ConvertFrom-UriComponent $userInfo[0]
    Password = ConvertFrom-UriComponent $userInfo[1]
    SslMode = $sslMode
    ChannelBinding = $channelBinding
  }
}

function Protect-DiagnosticText {
  param([AllowEmptyString()][string]$Text, [string[]]$SensitiveValues)
  $safeText = $Text
  foreach ($sensitiveValue in $SensitiveValues) {
    if ($sensitiveValue) { $safeText = $safeText.Replace($sensitiveValue, "[REDACTED]") }
  }
  return $safeText
}

$ownerSecure = $null
$runtimeSecure = $null
$migratorSecure = $null
$ownerConnection = $null
$runtimePassword = $null
$migratorPassword = $null
$connection = $null
$sql = $null
$process = $null
$startInfo = $null

try {
  $ownerSecure = Read-Host "Enter the protected owner PostgreSQL connection URL" -AsSecureString
  $ownerConnection = ConvertFrom-ProtectedValue $ownerSecure
  $connection = Get-ConnectionParts $ownerConnection

  if ($ValidateConnectionOnly) {
    Write-Output "Protected PostgreSQL connection input accepted for host and database validation. No database connection was attempted."
    return
  }

  $runtimeSecure = Read-Host "Enter password for polismart_runtime" -AsSecureString
  $migratorSecure = Read-Host "Enter password for polismart_migrator" -AsSecureString
  $runtimePassword = ConvertFrom-ProtectedValue $runtimeSecure
  $migratorPassword = ConvertFrom-ProtectedValue $migratorSecure

  if (!$runtimePassword -or !$migratorPassword) { throw "Both role passwords are required." }
  if ($runtimePassword -ceq $migratorPassword) {
    throw "Runtime and migrator passwords must be distinct."
  }

  $templatePath = Join-Path $PSScriptRoot "bootstrap-production-roles.sql"
  $sql = [IO.File]::ReadAllText($templatePath)
  $sql = Expand-RolePasswordTemplate $sql $runtimePassword $migratorPassword

  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $PsqlPath
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.Arguments = "-X --no-psqlrc --quiet"
  $startInfo.EnvironmentVariables["PGHOST"] = $connection.Host
  $startInfo.EnvironmentVariables["PGPORT"] = $connection.Port
  $startInfo.EnvironmentVariables["PGDATABASE"] = $connection.Database
  $startInfo.EnvironmentVariables["PGUSER"] = $connection.User
  $startInfo.EnvironmentVariables["PGPASSWORD"] = $connection.Password
  $startInfo.EnvironmentVariables["PGSSLMODE"] = $connection.SslMode
  $startInfo.EnvironmentVariables["PGCHANNELBINDING"] = $connection.ChannelBinding

  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  if (!$process.Start()) { throw "Unable to start psql." }
  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()
  $process.StandardInput.Write($sql)
  $process.StandardInput.Close()
  $process.WaitForExit()
  $stdout = $stdoutTask.GetAwaiter().GetResult()
  $stderr = $stderrTask.GetAwaiter().GetResult()

  if ($process.ExitCode -ne 0) {
    $diagnostic = Protect-DiagnosticText "$stderr`n$stdout" @(
      $ownerConnection,
      $connection.Password,
      $runtimePassword,
      $migratorPassword,
      (ConvertTo-PostgresStringLiteral $runtimePassword),
      (ConvertTo-PostgresStringLiteral $migratorPassword)
    )
    throw "Role bootstrap failed and the transaction was not committed. $($diagnostic.Trim())"
  }
  Write-Output "Role bootstrap transaction committed successfully."
}
finally {
  if ($process) { $process.Dispose() }
  if ($startInfo) {
    $startInfo.EnvironmentVariables["PGPASSWORD"] = ""
    $startInfo.EnvironmentVariables.Clear()
  }
  if ($ownerSecure) { $ownerSecure.Dispose() }
  if ($runtimeSecure) { $runtimeSecure.Dispose() }
  if ($migratorSecure) { $migratorSecure.Dispose() }
  $sql = $null
  if ($connection) { $connection.Password = $null }
  $connection = $null
  $ownerConnection = $null
  $runtimePassword = $null
  $migratorPassword = $null
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
