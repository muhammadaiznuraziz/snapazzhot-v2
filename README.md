# snapazzhot

Premium web-based photo booth kiosk software and event management system. Dirancang untuk throughput tinggi, integrasi perangkat keras cetak instan, otomatisasi media (GIF/Video Behind-The-Scenes), dan distribusi kilat berbasis QR Code.

---

## Core Value & Arsitektur

Aplikasi ini beroperasi pada model **Local Edge Kiosk dengan Sinkronisasi Cloud asynchronous**. Dibangun untuk meminimalkan latensi saat event berlangsung, memastikan kegagalan internet lokal tidak menghentikan sesi foto atau proses cetak.

- **High-Speed Auto-Print:** Pipeline otomatisasi pengiriman berkas ke printer sublimasi termal lokal (Direct CUPS/Spooler API).
- **Dual-Stream Media Capture:** Menangkap foto utama (High-res) sekaligus merekam buffer video pendek sebelum/setelah jepretan untuk _Behind The Scenes_ (BTS).
- **Instant Micro-Distribution:** Generator QR Code on-the-fly yang terikat ke pengenal sesi unik untuk _download_ media tanpa antrean.
- **Asynchronous Live Sync:** Sinkronisasi galeri lokal ke server cloud berjalan di background agar galeri web publik selalu terbarui.

---

## Tech Stack & Prasyarat

### Perangkat Lunak

- **Frontend / Aplikasi Kiosk:** React / Next.js (berjalan pada port `3000`)
- **State Management & Sinkronisasi:** Websockets / Server-Sent Events (SSE) untuk status `LIVE SYNC`
- **Kamera API:** WebRTC / MediaDevices API (dukungan eksternal DSLR via EOS Utility virtual webcam / Cam Link)

### Perangkat Keras (Rekomendasi Produksi)

- Kiosk PC / Mac Mini dengan port USB 3.0+ melimpah.
- Printer Foto Sublimasi (e.g., DNP DS620, Citizen CY-02).
- Kamera DSLR/Mirrorless dengan dukungan clean HDMI out + Capture Card.

---

## Memulai Pengembangan

### 1. Kloning Repositori

```bash
git clone [https://github.com/username/snapazzhot.git](https://github.com/username/snapazzhot.git)
cd snapazzhot

```

npm install

# atau

yarn install

NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_ENABLE_LIVE_SYNC=true
PRINTER_SPOOLER_NAME=DNP_DS620_Local
STORAGE_PROVIDER=local_fallback_to_s3

├── public/ # Aset statis dan template layout cetak
├── src/
│ ├── components/ # Modul kamera, frame overlay, dan komponen QR
│ ├── pages/ # Alur aplikasi (Kiosk Landing, Sesi Foto, Galeri)
│ ├── services/ # Driver printer lokal, enkoder GIF, & sync engine
│ └── styles/ # Desain antarmuka (UI blueprint bertema biru)

📊 Alur Kerja Aplikasi (User Flow)
Landing State: Pengunjung menekan Mulai Sesi Foto.

Capture State: Kamera aktif -> Countdown -> Pengambilan gambar (bersamaan dengan buffer video BTS).

Processing State: Sistem menggabungkan frame overlay, merangkai looping GIF, dan mendaftarkan sesi.

Output State: Printer mulai mencetak secara fisik, layar kiosk menampilkan QR Code untuk unduhan digital instant oleh tamu.
