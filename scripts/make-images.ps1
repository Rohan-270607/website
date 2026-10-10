# Regenerates public/og.png (1200x630 link-preview card) and
# public/apple-touch-icon.png (180x180 home-screen icon) from the logo.
# Uses Windows' built-in System.Drawing, so it needs no npm packages.
# Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/make-images.ps1 -OutDir public -Title "Rohan" -Subtitle "Computer Science student"
# Re-run it if you change the logo, the brand colours, or the words on the preview card.
param([string]$OutDir = 'public', [string]$Title = 'Portfolio', [string]$Subtitle = '')
Add-Type -AssemblyName System.Drawing

function C([string]$hex, [int]$a = 255) {
  $h = $hex.TrimStart('#')
  [System.Drawing.Color]::FromArgb($a, [Convert]::ToInt32($h.Substring(0,2),16), [Convert]::ToInt32($h.Substring(2,2),16), [Convert]::ToInt32($h.Substring(4,2),16))
}

# Fills a polygon given as a flat list of x,y numbers (32-unit grid).
function Fill-Poly($g, [string]$hex, [double[]]$xy) {
  $pts = for ($i = 0; $i -lt $xy.Length; $i += 2) { New-Object System.Drawing.PointF ([float]$xy[$i]), ([float]$xy[$i + 1]) }
  $g.FillPolygon((New-Object System.Drawing.SolidBrush (C $hex)), [System.Drawing.PointF[]]$pts)
}

# The logo, on its 32-unit grid (same geometry as src/components/logoShape.ts):
# a gold sun behind a mountain with an orange lit side and a teal shaded side,
# on a rose base line.
function Draw-Logo($g, [float]$cx, [float]$cy, [float]$size) {
  $state = $g.Save()
  $k = $size / 32.0
  $g.TranslateTransform($cx, $cy)
  $g.ScaleTransform($k, $k)
  $g.TranslateTransform(-16, -17.4)   # centre the artwork (it spans y 5.8 to 29)

  $g.FillEllipse((New-Object System.Drawing.SolidBrush (C '#ffd166')), [float]20.3, [float]5.8, [float]6.4, [float]6.4)
  Fill-Poly $g '#19c3b1' @(2, 27, 12, 9, 19.5, 21, 22, 17, 30, 27)
  Fill-Poly $g '#ff7a2f' @(2, 27, 12, 9, 16.5, 16.5, 9, 27)
  $g.FillRectangle((New-Object System.Drawing.SolidBrush (C '#ef476f')), [float]2, [float]27, [float]28, [float]2)
  $g.Restore($state)
}

# Supersampling: draw the logo 4x larger on a transparent layer, then scale it
# down with high-quality resampling, so the edges come out smooth.
function Render-Logo($g, [float]$cx, [float]$cy, [float]$size) {
  $big = [int]($size * 4)
  $layer = New-Object System.Drawing.Bitmap $big, $big
  $lg = [System.Drawing.Graphics]::FromImage($layer)
  $lg.SmoothingMode = 'AntiAlias'
  $lg.Clear([System.Drawing.Color]::Transparent)
  Draw-Logo $lg ($big / 2) ($big / 2) $big
  $lg.Dispose()
  $g.DrawImage($layer, [float]($cx - $size / 2), [float]($cy - $size / 2), [float]$size, [float]$size)
  $layer.Dispose()
}

# Soft round glow, like the page background (colour fading to transparent).
function Draw-Glow($g, [float]$cx, [float]$cy, [float]$r, [string]$hex, [int]$alpha) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse($cx - $r, $cy - $r, 2 * $r, 2 * $r)
  $brush = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
  $brush.CenterColor = C $hex $alpha
  $brush.SurroundColors = @((C $hex 0))
  $g.FillPath($brush, $path)
}

function New-Canvas([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.Clear((C '#0c0c0d'))
  return @($bmp, $g)
}

# ---------- Social preview card: 1200 x 630 ----------
$bmp, $g = New-Canvas 1200 630
Draw-Glow $g 170 120 420 '#19c3b1' 46
Draw-Glow $g 1080 560 460 '#ff7a2f' 40
Draw-Glow $g 640 640 300 '#ef476f' 26

# Four-colour stripe along the top edge, as on the site.
$stripe = @('#ff7a2f', '#19c3b1', '#ffd166', '#ef476f')
for ($i = 0; $i -lt 4; $i++) { $g.FillRectangle((New-Object System.Drawing.SolidBrush (C $stripe[$i])), $i * 300, 0, 300, 10) }

Render-Logo $g 300 330 300

$white = New-Object System.Drawing.SolidBrush (C '#f3f2ee')
$muted = New-Object System.Drawing.SolidBrush (C '#a3a3ab')
$titleFont = New-Object System.Drawing.Font('Segoe UI', 92, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subFont = New-Object System.Drawing.Font('Segoe UI', 34, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString($Title, $titleFont, $white, 540, 210)
# Short stripe under the word, like the site's section headings.
for ($i = 0; $i -lt 4; $i++) { $g.FillRectangle((New-Object System.Drawing.SolidBrush (C $stripe[$i])), 552 + $i * 34, 336, 34, 9) }
$dot = [char]0x00B7  # middle dot, written as a code so file encoding can't mangle it
# The line under the title: your subtitle if given, otherwise the site's sections.
$line = if ($Subtitle) { $Subtitle } else { "Projects  $dot  About  $dot  Say hello" }
$g.DrawString($line, $subFont, $muted, 548, 372)

$bmp.Save((Join-Path $OutDir 'og.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# ---------- Home-screen icon: 180 x 180 (iOS rounds the corners itself) ----------
$bmp, $g = New-Canvas 180 180
Draw-Glow $g 50 40 140 '#19c3b1' 40
Render-Logo $g 90 90 150
$bmp.Save((Join-Path $OutDir 'apple-touch-icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

Get-ChildItem $OutDir -Filter *.png | Select-Object Name, Length
