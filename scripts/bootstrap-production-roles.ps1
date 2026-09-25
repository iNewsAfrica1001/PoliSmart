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
  param([Parameter(Mandatory)][AllowEmptyString()][string]$Value)
  $withoutLineBreaks = $Value.Replace("`r", "").Replace("`n", "")
  $normalized = $withoutLineBreaks.Trim()
  $whitespaceRemoved = $normalized -cne $Value
  $outerQuotesRemoved = $false
  if ($normalized.Length -ge 2) {
    $first = $normalized[0]
    $last = $normalized[$normalized.Length - 1]
    if (($first -eq '"' -and $last -eq '"') -or
        ($first -eq "'" -and $last -eq "'")) {
      $normalized = $normalized.Substring(1, $normalized.Length - 2).Trim()
      $outerQuotesRemoved = $true
    }
  }
  return @{
    Value = $normalized
    InputWasBlank = !$normalized
    OuterQuotesRemoved = $outerQuotesRemoved
    WhitespaceRemoved = $whitespaceRemoved
  }
}

function New-ConnectionInputError {
  param(
    [Parameter(Mandatory)][hashtable]$InputState,
    [Parameter(Mandatory)][string]$DetectedScheme,
    [Parameter(Mandatory)][bool]$ContainsAtSeparator,
    [Parameter(Mandatory)][bool]$ContainsDatabasePath,
    [Parameter(Mandatory)][string]$Reason
  )
  return "$Reason Input was blank: $(if ($InputState.InputWasBlank) { 'YES' } else { 'NO' }); " +
    "Outer quotes removed: $(if ($InputState.OuterQuotesRemoved) { 'YES' } else { 'NO' }); " +
    "Leading/trailing whitespace or CR/LF removed: $(if ($InputState.WhitespaceRemoved) { 'YES' } else { 'NO' }); " +
    "Detected scheme: $DetectedScheme; " +
    "Contains @ separator: $(if ($ContainsAtSeparator) { 'YES' } else { 'NO' }); " +
    "Contains database path: $(if ($ContainsDatabasePath) { 'YES' } else { 'NO' })."
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
  param([Parameter(Mandatory)][AllowEmptyString()][string]$ConnectionString)
  $inputState = Normalize-ConnectionInput $ConnectionString
  $normalized = $inputState.Value
  $detectedScheme = "none"
  $schemeLength = 0
  if ($normalized.StartsWith("postgresql://", [StringComparison]::OrdinalIgnoreCase)) {
    $detectedScheme = "postgresql"
    $schemeLength = "postgresql://".Length
  } elseif ($normalized.StartsWith("postgres://", [StringComparison]::OrdinalIgnoreCase)) {
    $detectedScheme = "postgres"
    $schemeLength = "postgres://".Length
  }
  $containsAtSeparator = $normalized.Contains("@")
  $containsDatabasePath = if ($schemeLength -gt 0) {
    $normalized.IndexOf("/", $schemeLength) -ge 0
  } else {
    $false
  }
  if ($inputState.InputWasBlank -or $detectedScheme -eq "none") {
    $kind = if ($inputState.InputWasBlank) {
      "The protected connection value is blank."
    } elseif ($normalized -match '^(?i)psql(?:\.exe)?\s') {
      "The protected connection value is a psql command; paste only its PostgreSQL connection URL."
    } elseif ($normalized -match '^[A-Za-z_][A-Za-z0-9_]*\s*=') {
      "The protected connection value is a shell assignment; paste only its PostgreSQL connection URL."
    } else {
      "The protected connection value must begin with postgres:// or postgresql://."
    }
    throw (New-ConnectionInputError $inputState $detectedScheme $containsAtSeparator $containsDatabasePath $kind)
  }
  if ($normalized -match '%(?![0-9A-Fa-f]{2})') {
    throw "The protected connection value contains malformed percent encoding."
  }
  $remainder = $normalized.Substring($schemeLength)
  $queryStart = $remainder.IndexOf("?")
  $connectionPath = if ($queryStart -ge 0) { $remainder.Substring(0, $queryStart) } else { $remainder }
  $queryText = if ($queryStart -ge 0) { $remainder.Substring($queryStart + 1) } else { "" }
  $databaseSeparator = $connectionPath.IndexOf("/")
  if ($databaseSeparator -lt 1 -or $databaseSeparator -eq $connectionPath.Length - 1) {
    throw (New-ConnectionInputError $inputState $detectedScheme $containsAtSeparator $false "The protected connection value must include a host and database path.")
  }
  $authority = $connectionPath.Substring(0, $databaseSeparator)
  $database = $connectionPath.Substring($databaseSeparator + 1)
  $atSeparator = $authority.LastIndexOf("@")
  if ($atSeparator -lt 1 -or $atSeparator -eq $authority.Length - 1) {
    throw (New-ConnectionInputError $inputState $detectedScheme $false $true "The protected connection value must include user information and a host.")
  }
  $userInfo = $authority.Substring(0, $atSeparator).Split(":", 2)
  if ($userInfo.Count -ne 2 -or !$userInfo[0] -or !$userInfo[1]) {
    throw "The protected connection value must include a user and password."
  }
  $hostAndPort = $authority.Substring($atSeparator + 1)
  $hostMatch = [regex]::Match($hostAndPort, '^(?<host>\[[^\]]+\]|[^:]+)(?::(?<port>[0-9]+))?$')
  if (!$hostMatch.Success -or !$hostMatch.Groups["host"].Value) {
    throw (New-ConnectionInputError $inputState $detectedScheme $true $true "The protected connection value must include a valid host and optional numeric port.")
  }
  $databaseHost = $hostMatch.Groups["host"].Value.Trim([char[]]"[]")
  $port = if ($hostMatch.Groups["port"].Success) { $hostMatch.Groups["port"].Value } else { "5432" }
  $query = Get-ConnectionQueryParameters $queryText
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
    Host = $databaseHost
    Port = $port
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
