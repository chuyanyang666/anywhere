Add-Type -AssemblyName System.Drawing
function Bounds($path, $x0, $y0, $x1, $y1, $label) {
  $img = [System.Drawing.Bitmap]::new((Resolve-Path $path).Path)
  $minX=$x1; $maxX=$x0; $minY=$y1; $maxY=$y0; $n=0
  for ($y=$y0; $y -lt $y1; $y++) {
    for ($x=$x0; $x -lt $x1; $x++) {
      $c = $img.GetPixel($x,$y)
      $sum = [int]$c.R + [int]$c.G + [int]$c.B
      if ($sum -gt 150 -and $c.B -gt 40) {
        if ($x -lt $minX) { $minX=$x }; if ($x -gt $maxX) { $maxX=$x }
        if ($y -lt $minY) { $minY=$y }; if ($y -gt $maxY) { $maxY=$y }
        $n++
      }
    }
  }
  Write-Output ("{0}: bbox x {1}-{2} (w {3}) y {4}-{5} (h {6}) px={7} size={8}x{9}" -f $label,$minX,$maxX,($maxX-$minX+1),$minY,$maxY,($maxY-$minY+1),$n,$img.Width,$img.Height)
  $img.Dispose()
}
Bounds 'C:\Users\EDY\.trae-cn\attachments\0af5c702-af1f-4af3-a91c-90dd41eee4e8_29fd531f-462a-44ca-9447-1565e86aca18_image.png' 640 80 860 330 'fig8-current'
Bounds 'C:\Users\EDY\.trae-cn\attachments\ab8d5bbe-7986-4676-8695-92c8dc21b214_e6c7098f-d3f5-4f98-bdac-e536ebfc57aa_image.png' 1550 280 2030 700 'fig9-target'
