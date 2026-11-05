Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('c:\Users\EDY\Desktop\150ppi\any\ui-audit\043-settings-top-1440-dark-violet.png')
$bmp = New-Object System.Drawing.Bitmap(320, 150)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, 320, 150)), (New-Object System.Drawing.Rectangle(830, 220, 320, 150)), [System.Drawing.GraphicsUnit]::Pixel)
$bmp.Save('c:\Users\EDY\Desktop\150ppi\any\ui-audit\crop-settings-sliders.png')
$src.Dispose()
$g.Dispose()
$bmp.Dispose()
