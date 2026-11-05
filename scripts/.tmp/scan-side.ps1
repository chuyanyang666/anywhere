$p = (Resolve-Path 'scripts/.tmp/ref-1088.png').Path
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::new($p)
Write-Output "size $($img.Width)x$($img.Height)"
$rows = @{}
for ($y = 0; $y -lt $img.Height; $y++) {
  $cnt = 0
  for ($x = 0; $x -lt 75; $x++) {
    $c = $img.GetPixel($x, $y)
    if ($c.R -gt 110 -and $c.B -gt 190 -and $c.G -lt 110) { $cnt++ }
  }
  if ($cnt -ge 2) { $rows[$y] = $cnt }
}
$ys = $rows.Keys | Sort-Object
$blocks = New-Object System.Collections.ArrayList
$start = $null; $prev = $null
foreach ($y in $ys) {
  if ($null -eq $start) { $start = $y }
  elseif ($y - $prev -gt 2) { [void]$blocks.Add(@($start, $prev)); $start = $y }
  $prev = $y
}
if ($null -ne $start) { [void]$blocks.Add(@($start, $prev)) }
foreach ($b in $blocks) { Write-Output "purple band y $($b[0]) - $($b[1]) h=$($b[1]-$b[0]+1)" }
$img.Dispose()