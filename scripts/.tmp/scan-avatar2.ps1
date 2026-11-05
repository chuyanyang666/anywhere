Add-Type -AssemblyName System.Drawing
function Bounds($path, $x0, $y0, $x1, $y1, $label, $thr) {
  $img = [System.Drawing.Bitmap]::new((Resolve-Path $path).Path)
  $minX=$x1; $maxX=$x0; $minY=$y1; $maxY=$y0; $n=0
  for ($y=$y0; $y -lt $y1; $y++) {
    for ($x=$x0; $x -lt $x1; $x++) {
      $c = $img.GetPixel($x,$y)
      $sum = [int]$c.R + [int]$c.G + [int]$c.B
      if ($sum -gt $thr) {
        if ($x -lt $minX) { $minX=$x }; if ($x -gt $maxX) { $maxX=$x }
        if ($y -lt $minY) { $minY=$y }; if ($y -gt $maxY) { $maxY=$y }
        $n++
      }
    }
  }
  Write-Output ("{0}: bbox x {1}-{2} (w {3}) y {4}-{5} (h {6}) px={7} size={8}x{9}" -f $label,$minX,$maxX,($maxX-$minX+1),$minY,$maxY,($maxY-$minY+1),$n,$img.Width,$img.Height)
  $img.Dispose()
}
Bounds 'scripts/.tmp/ref9-1088.png' 440 50 700 260 'fig9 1088 bright' 330
Bounds 'scripts/shots/04-companion.png' 400 40 700 260 'ours bright(1x)' 330
