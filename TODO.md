# ~~TODO: Perbaiki Proses Generate GIF dan BTS~~ ✅ SELESAI

## Camera.tsx - GIF & BTS Recording

- [x] 1. `triggerFlashAndSnap`: Ganti capture canvas dari 1280x720 ke resolusi asli kamera
- [x] 2. `startBtsRecording`: Ganti recording canvas dari 1280x720 ke resolusi asli kamera
- [x] 3. `startRecordingLoop`: Hapus mirror dari recording (mirror=false) agar tidak double flip di kompilasi BTS
- [x] 4. `handleCompleteSession`: Ganti gifWidth/gifHeight dari 1280x720 ke resolusi asli kamera via `captureResolutionRef`

## BoothLayout.tsx - BTS Compilation

- [x] 5. Tidak ada perubahan - `drawMediaOnCanvas` akan menerapkan mirror sekali di kompilasi (karena recording sudah tidak bake-in mirror)

## Hasil Akhir

| Aspek                | Sebelum                 | Sesudah                                           |
| -------------------- | ----------------------- | ------------------------------------------------- |
| GIF width/height     | Hardcoded 1280x720      | Resolusi asli kamera (misal 1920x1080 / 1280x720) |
| Capture canvas       | Hardcoded 1280x720      | Resolusi asli video source                        |
| BTS recording canvas | Hardcoded 1280x720      | Resolusi asli video source                        |
| BTS Mirror OFF       | Video di-mirror (salah) | Normal (tidak mirror) ✅                          |
| BTS Mirror ON        | Double flip             | Mirror sekali ✅                                  |
| Orientasi            | Tidak konsisten         | Konsisten di semua media ✅                       |
