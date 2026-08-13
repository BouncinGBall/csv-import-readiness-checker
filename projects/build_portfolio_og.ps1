$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$output = Join-Path $PSScriptRoot 'portfolio-og.png'
$bitmap = New-Object System.Drawing.Bitmap 1200, 630
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$green = [System.Drawing.Color]::FromArgb(127, 45, 25)
$acid = [System.Drawing.Color]::FromArgb(255, 178, 76)
$paper = [System.Drawing.Color]::FromArgb(255, 248, 236)
$ink = [System.Drawing.Color]::FromArgb(45, 28, 20)
$muted = [System.Drawing.Color]::FromArgb(244, 215, 189)
$graphics.Clear($green)

$font = 'Segoe UI'
$brand = New-Object System.Drawing.Font $font, 22, ([System.Drawing.FontStyle]::Bold)
$hero = New-Object System.Drawing.Font $font, 52, ([System.Drawing.FontStyle]::Bold)
$lead = New-Object System.Drawing.Font $font, 24, ([System.Drawing.FontStyle]::Regular)
$card = New-Object System.Drawing.Font $font, 19, ([System.Drawing.FontStyle]::Bold)

$acidBrush = New-Object System.Drawing.SolidBrush $acid
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$paperBrush = New-Object System.Drawing.SolidBrush $paper
$inkBrush = New-Object System.Drawing.SolidBrush $ink
$mutedBrush = New-Object System.Drawing.SolidBrush $muted

$graphics.DrawString('FOX BOX  ·  САЙТЫ, AI И АВТОМАТИЗАЦИЯ', $brand, $acidBrush, 70, 54)
$graphics.DrawString('Покажите одну рутину —', $hero, $whiteBrush, 64, 135)
$graphics.DrawString('найдём, где AI даст пользу', $hero, $whiteBrush, 64, 201)
$graphics.DrawString('Без необходимости разбираться в моделях и сервисах', $lead, $mutedBrush, 70, 288)

$cards = @(
  @{ X = 70; Text = 'Карта возможности  ·  0 ₽' },
  @{ X = 416; Text = 'Пилот  ·  от 19 000 ₽' },
  @{ X = 762; Text = 'Внедрение  ·  от 49 000 ₽' }
)

foreach ($item in $cards) {
  $graphics.FillRectangle($paperBrush, $item.X, 380, 320, 86)
  $graphics.DrawString($item.Text, $card, $inkBrush, $item.X + 22, 408)
}

$graphics.FillRectangle($acidBrush, 70, 518, 1012, 62)
$graphics.DrawString('Один процесс  ·  метрика до старта  ·  человек в контуре', $card, $inkBrush, 100, 536)

$bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose(); $bitmap.Dispose()
$brand.Dispose(); $hero.Dispose(); $lead.Dispose(); $card.Dispose()
$acidBrush.Dispose(); $whiteBrush.Dispose(); $paperBrush.Dispose(); $inkBrush.Dispose(); $mutedBrush.Dispose()

Write-Output $output
