$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path $envFile)) { Write-Error "Env file not found: $envFile"; exit 1 }
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $parts = $_ -split '=', 2
  if ($parts.Length -eq 2) {
    $envName = $parts[0].Trim()
    $envVal = $parts[1].Trim()
    Set-Item -Path "Env:$envName" -Value $envVal
  }
}
$scriptPath = Join-Path $PSScriptRoot 'check-restore-state.mjs'
node $scriptPath
