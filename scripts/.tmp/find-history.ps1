$roots = @("$env:APPDATA", "$env:LOCALAPPDATA")
$found = @()
foreach ($r in $roots) {
  $found += Get-ChildItem -Path $r -Recurse -Filter "styles.css" -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 100000 }
}
$found | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize
