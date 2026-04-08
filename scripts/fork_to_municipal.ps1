$ErrorActionPreference = "Stop"
$sourcePath = "c:\Users\Usuario\Documents\Proyectos\ISO -conjunto\9001app-firebase"
$destPath = "c:\Users\Usuario\Documents\Proyectos\ISO -conjunto\18091app-municipios"

Write-Host "Starting fork from $sourcePath to $destPath"

if (Test-Path $destPath) {
    Write-Warning "Destination already exists. Aborting to prevent overwrite."
    exit 1
}

New-Item -ItemType Directory -Force -Path $destPath | Out-Null

Write-Host "Copying files... (this may take a moment)"
# Exclude node_modules, .git, .next using robocopy for speed and exclusion handling, 
# or standard Copy-Item with exclusion logic if robocopy is risky in agent (standard PS is safer for logic)

$exclude = @("node_modules", ".git", ".next", ".vercel", "android", "dist", "build")

Get-ChildItem -Path $sourcePath | ForEach-Object {
    if ($exclude -notcontains $_.Name) {
        Write-Host "Copying $($_.Name)..."
        Copy-Item -Path $_.FullName -Destination $destPath -Recurse -Force
    } else {
        Write-Host "Skipping $($_.Name)"
    }
}

Write-Host "Fork complete. New project at $destPath"
