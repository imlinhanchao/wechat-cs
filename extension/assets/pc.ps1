param($imagePath)

# Adapted from https://github.com/octan3/img-clipboard-dump/blob/master/dump-clipboard-png.ps1
chcp 65001

Add-Type -Assembly PresentationCore
$img = [Windows.Clipboard]::GetImage()

if ($null -eq $img) {
    $img = [Windows.Clipboard]::GetFileDropList()
    if ($null -eq $img) {
        "no image"
        Exit 1
    }
    $img
    Exit 0
}

if (-not $imagePath) {
    "no image"
    Exit 1
}

$fcb = new-object Windows.Media.Imaging.FormatConvertedBitmap($img, [Windows.Media.PixelFormats]::Rgb24, $null, 0)

$stream = [IO.File]::Open($imagePath, "OpenOrCreate")
$encoder = New-Object Windows.Media.Imaging.PngBitmapEncoder
$encoder.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($fcb)) | out-null
$encoder.Save($stream) | out-null
$stream.Dispose() | out-null

$imagePath

Exit 0