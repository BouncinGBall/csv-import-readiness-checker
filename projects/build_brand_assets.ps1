$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assets = Join-Path $PSScriptRoot '..\assets'
New-Item -ItemType Directory -Path $assets -Force | Out-Null
$output = Join-Path $assets 'laditsya-avatar.png'
$bitmap = New-Object System.Drawing.Bitmap 1024, 1024
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(23, 79, 58))

$acid = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(217, 247, 93)), 108
$acid.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$acid.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$acid.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$paper = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 253, 247))

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddLines([System.Drawing.Point[]]@(
  (New-Object System.Drawing.Point 232, 748),
  (New-Object System.Drawing.Point 460, 284),
  (New-Object System.Drawing.Point 564, 284),
  (New-Object System.Drawing.Point 792, 748)
))
$graphics.DrawPath($acid, $path)
$graphics.FillEllipse($paper, 476, 248, 72, 72)
$bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)

$path.Dispose(); $acid.Dispose(); $paper.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
Write-Output $output
