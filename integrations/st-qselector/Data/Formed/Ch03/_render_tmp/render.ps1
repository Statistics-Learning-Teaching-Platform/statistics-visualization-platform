Add-Type -AssemblyName System.Drawing
$src = "F:\statistics-questions-selector\Data\Formed\Ch03\Assests"
$out = "F:\statistics-questions-selector\Data\Formed\Ch03\_render_tmp"
$files = Get-ChildItem -Path $src -Include *.wmf,*.emf -Recurse
foreach ($f in $files) {
    try {
        $img = [System.Drawing.Image]::FromFile($f.FullName)
        $w = $img.Width
        $h = $img.Height
        # scale up small metafiles for legibility
        $scale = 3.0
        if ($w -lt 1 -or $h -lt 1) { $w = 200; $h = 100 }
        $nw = [int]($w * $scale)
        $nh = [int]($h * $scale)
        if ($nw -lt 60) { $nw = 60 }
        if ($nh -lt 40) { $nh = 40 }
        $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.Clear([System.Drawing.Color]::White)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $nw, $nh)
        $g.Dispose()
        $outfile = Join-Path $out ($f.BaseName + ".png")
        $bmp.Save($outfile, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
        $img.Dispose()
        Write-Output ("OK  " + $f.Name + "  ->  " + ($f.BaseName + ".png") + "  (" + $nw + "x" + $nh + ")")
    } catch {
        Write-Output ("ERR " + $f.Name + "  :  " + $_.Exception.Message)
    }
}
