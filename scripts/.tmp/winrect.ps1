Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Rect {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int nIndex);
}
"@
$ratio = 1088.0 / 754.0
$wins = Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
foreach ($w in $wins) {
  $r = New-Object Win32Rect+RECT
  [void][Win32Rect]::GetWindowRect($w.MainWindowHandle, [ref]$r)
  $ww = $r.Right - $r.Left; $wh = $r.Bottom - $r.Top
  $c = New-Object Win32Rect+RECT
  [void][Win32Rect]::GetClientRect($w.MainWindowHandle, [ref]$c)
  $cw = $c.Right - $c.Left; $ch = $c.Bottom - $c.Top
  $sw = [Win32Rect]::GetSystemMetrics(0); $sh = [Win32Rect]::GetSystemMetrics(1)
  $ar = [math]::Round($cw / $ch, 4)
  $err = [math]::Round((1 - [math]::Abs($ar / $ratio)), 4)
  "{0} | window {1}x{2} | client {3}x{4} | clientAR {5} (stage {6}) | err {7} | screen {8}x{9}" -f $w.MainWindowTitle, $ww, $wh, $cw, $ch, $ar, [math]::Round($ratio,4), $err, $sw, $sh
}
