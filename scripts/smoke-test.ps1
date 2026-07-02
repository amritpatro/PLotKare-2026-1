param(
  [string]$BaseUrl = "https://plotkare.in",
  [switch]$AllowLocal
)

$ErrorActionPreference = "Stop"

$argsList = @("scripts/production-smoke-test.mjs", $BaseUrl)
if ($AllowLocal) {
  $argsList += "--allow-local"
}

node @argsList
exit $LASTEXITCODE
