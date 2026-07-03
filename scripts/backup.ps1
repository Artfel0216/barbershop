param(
  [string]$OutDir = "."
)

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$filename = "barbershop_backup_$timestamp.sql"
$outpath = Join-Path -LiteralPath $OutDir -ChildPath $filename

# Read DB URL from .env
$envPath = Join-Path -LiteralPath $PSScriptRoot -ChildPath "..\.env"
if (!(Test-Path -LiteralPath $envPath)) {
  Write-Error ".env not found at $envPath"
  exit 1
}

$envContent = Get-Content -LiteralPath $envPath -Raw
$match = [regex]::Match($envContent, 'DATABASE_URL="(.+)"')
if (!$match.Success) {
  $match = [regex]::Match($envContent, "DATABASE_URL=(.+)")
}
if (!$match.Success) {
  Write-Error "DATABASE_URL not found in .env"
  exit 1
}

$dbUrl = $match.Groups[1].Value.Trim()
Write-Host "Backing up to $outpath ..."

# pg_dump via the URL
& pg_dump --no-owner --no-acl --clean --if-exists "$dbUrl" -f "$outpath"

if ($LASTEXITCODE -eq 0) {
  Write-Host "Backup created: $outpath"
} else {
  Write-Error "Backup failed (exit code $LASTEXITCODE)"
}
