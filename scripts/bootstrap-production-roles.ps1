[CmdletBinding()]
param([string]$PsqlPath = "psql")

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

function Get-ConnectionParts {
  param([Parameter(Mandatory)][string]$ConnectionString)
  $uri = [Uri]$ConnectionString
  if ($uri.Scheme -notin @("postgres", "postgresql") -or !$uri.Host) {
    throw "The protected connection value must be a PostgreSQL connection URL."
  }
  $userInfo = $uri.UserInfo.Split(":", 2)
  if ($userInfo.Count -ne 2 -or !$userInfo[0] -or !$userInfo[1]) {
    throw "The protected connection value must include a user and password."
  }
  $database = $uri.AbsolutePath.TrimStart("/")
  if (!$database) { throw "The protected connection value must identify a database." }
  $query = [Web.HttpUtility]::ParseQueryString($uri.Query)
  return @{
    Host = $uri.Host
    Port = if ($uri.IsDefaultPort) { "5432" } else { [string]$uri.Port }
    Database = [Uri]::UnescapeDataString($database)
    User = [Uri]::UnescapeDataString($userInfo[0])
    Password = [Uri]::UnescapeDataString($userInfo[1])
    SslMode = if ($query["sslmode"]) { $query["sslmode"] } else { "require" }
    ChannelBinding = if ($query["channel_binding"]) { $query["channel_binding"] } else { "require" }
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
  $runtimeSecure = Read-Host "Enter password for polismart_runtime" -AsSecureString
  $migratorSecure = Read-Host "Enter password for polismart_migrator" -AsSecureString
  $ownerConnection = ConvertFrom-ProtectedValue $ownerSecure
  $runtimePassword = ConvertFrom-ProtectedValue $runtimeSecure
  $migratorPassword = ConvertFrom-ProtectedValue $migratorSecure

  if (!$runtimePassword -or !$migratorPassword) { throw "Both role passwords are required." }
  if ($runtimePassword -ceq $migratorPassword) {
    throw "Runtime and migrator passwords must be distinct."
  }

  $connection = Get-ConnectionParts $ownerConnection
  $templatePath = Join-Path $PSScriptRoot "bootstrap-production-roles.sql"
  $sql = [IO.File]::ReadAllText($templatePath)
  $runtimePlaceholder = "__POLISMART_RUNTIME_PASSWORD_SQL_LITERAL__"
  $migratorPlaceholder = "__POLISMART_MIGRATOR_PASSWORD_SQL_LITERAL__"
  if (($sql.Split($runtimePlaceholder).Count - 1) -ne 1 -or
      ($sql.Split($migratorPlaceholder).Count - 1) -ne 1) {
    throw "The authoritative SQL template does not contain exactly one placeholder per role."
  }
  $sql = $sql.Replace($runtimePlaceholder, (ConvertTo-PostgresStringLiteral $runtimePassword))
  $sql = $sql.Replace($migratorPlaceholder, (ConvertTo-PostgresStringLiteral $migratorPassword))

  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $PsqlPath
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.ArgumentList.Add("-X")
  $startInfo.ArgumentList.Add("--no-psqlrc")
  $startInfo.ArgumentList.Add("--quiet")
  $startInfo.Environment["PGHOST"] = $connection.Host
  $startInfo.Environment["PGPORT"] = $connection.Port
  $startInfo.Environment["PGDATABASE"] = $connection.Database
  $startInfo.Environment["PGUSER"] = $connection.User
  $startInfo.Environment["PGPASSWORD"] = $connection.Password
  $startInfo.Environment["PGSSLMODE"] = $connection.SslMode
  $startInfo.Environment["PGCHANNELBINDING"] = $connection.ChannelBinding

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
    $startInfo.Environment["PGPASSWORD"] = ""
    $startInfo.Environment.Clear()
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
