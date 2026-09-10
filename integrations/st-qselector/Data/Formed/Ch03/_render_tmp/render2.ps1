Add-Type -AssemblyName System.Drawing
$src = "F:\statistics-questions-selector\Data\Formed\Ch03\Assests"
$out = "F:\statistics-questions-selector\Data\Formed\Ch03\_render_tmp"
$files = Get-ChildItem -Path $src -Include *.wmf,*.emf -Recurse
foreach ($f in $files) {
    try {
        $img = [System.Drawing.Image]::FromFile($f.FullName)
        $w = [double]$img.Width
        $h = [double]$img.Height
        if ($w -lt 1) { $w = 200 }
        if ($h -lt 1) { $h = 100 }
        # target max width 1400, max height 1000, keep aspect
        $maxW = 1400.0; $maxH = 1000.0
        $scale = [Math]::Min($maxW / $w, $maxH / $h)
        if ($scale -gt 6) { $scale = 6 }
        if ($scale -lt 0.05) { $scale = 0.05 }
        $nw = [int]($w * $scale); $nh = [int]($h * $scale)
        if ($nw -lt 40) { $nw = 40 }
        if ($nh -lt 20) { $nh = 20 }
        $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.Clear([System.Drawing.Color]::White)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.DrawImage($img, 0, 0, $nw, $nh)
        $g.Dispose()
        $outfile = Join-Path $out ($f.BaseName + ".png")
        $bmp.Save($outfile, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose(); $img.Dispose()
        Write-Output ("OK  " + $f.Name + "  (" + $nw + "x" + $nh + ")")
    } catch {
        Write-Output ("ERR " + $f.Name + "  :  metafile load failed")
    }
}
