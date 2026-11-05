Add-Type -AssemblyName System.Drawing
function ScanText($path, $x0, $x1, $label) {
  $img = [System.Drawing.Bitmap]::new((Resolve-Path $path).Path)
  $hits = @{}
  for ($y = 0; $y -lt $img.Height; $y++) {
    $cnt = 0
    for ($x = $x0; $x -lt $x1; $x++) {
      $c = $img.GetPixel($x, $y)
      if ($c.R -gt 120 -and $c.G -gt 100 -and $c.B -gt 130) { $cnt++ }
    }
    if ($cnt -ge 3) { $hits[$y] = $cnt }
  }
  $ys = $hits.Keys | Sort-Object
  $bands = New-Object System.Collections.ArrayList
  $start=$null; $prev=$null; $peak=0
  foreach ($y in $ys) {
    if ($null -eq $start) { $start=$y; $peak=$hits[$y] }
    elseif ($y - $prev -gt 2) { [void]$bands.Add(@($start,$prev,$peak)); $start=$y; $peak=$hits[$y] }
    if ($hits[$y] -gt $peak) { $peak = $hits[$y] }
    $prev=$y
  }
  if ($null -ne $start) { [void]$bands.Add(@($start,$prev,$peak)) }
  Write-Output "--- $label ($path) ---"
  foreach ($b in $bands) { Write-Output ("text band {0}-{1} h={2} peak={3}" -f $b[0],$b[1],($b[1]-$b[0]+1),$b[2]) }
  $img.Dispose()
}
ScanText 'scripts/.tmp/ref-1088.png' 10 75 'ref sidebar'
ScanText 'scripts/shots/01-workbench.png' 10 150 'ours sidebar (2x)'
