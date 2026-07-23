import React, { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Image as ImageIcon,
  Film,
  Video,
  Search,
  AlertCircle,
  Sparkles,
  Loader2,
  Eye,
  X,
  Camera,
  Clock,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

// --- SAFE ENVIRONMENT READ ---
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const rawUrl = url ? url.trim() : undefined;
const rawKey = key ? key.trim() : undefined;
const isEnvValid = Boolean(
  rawUrl && rawKey && typeof rawUrl === "string" && rawUrl.startsWith("http"),
);

interface PhotoMeta {
  gifUrl?: string;
  videoUrl?: string;
  rawPhotos?: string[];
  btsDuration?: number; // Durasi BTS dalam detik (Setting)
  [key: string]: any;
}

interface PhotoRecord {
  id: string;
  url: string;
  type: string;
  eventId: string;
  timestamp: string;
  username: string;
  templateName: string;
  likeCount: number;
  meta: PhotoMeta;
}

export default function DownloadPage({ id: propId }: { id?: string }) {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const initialId = params.id || propId || "";

  const [searchCode, setSearchCode] = useState(initialId);
  const [activeId, setActiveId] = useState(initialId);

  const [photo, setPhoto] = useState<PhotoRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(initialId));
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState({ percent: 0, status: "" });

  // State Lightbox Modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Ref untuk mengontrol durasi BTS Video secara presisi
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isEnvValid || !activeId) {
      setLoading(false);
      return;
    }

    async function fetchSession() {
      try {
        setLoading(true);
        const { data: dbPhoto, error: photoErr } = await supabase
          .from("photos")
          .select(
            "id, url, type, event_id, timestamp, username, template_name, like_count, meta",
          )
          .eq("id", activeId)
          .maybeSingle();

        if (photoErr) throw photoErr;

        if (dbPhoto) {
          let rawMeta = dbPhoto.meta;
          if (typeof rawMeta === "string") {
            try {
              rawMeta = JSON.parse(rawMeta);
            } catch (e) {
              rawMeta = {};
            }
          }
          rawMeta = rawMeta || {};

          // DEDUPLIKASI PHOTO GALLERY: Hilangkan duplikat URL dan hilangkan URL Photostrip utama jika masuk ke raw
          const rawPhotosList: string[] = Array.isArray(rawMeta.rawPhotos)
            ? rawMeta.rawPhotos
            : Array.isArray(rawMeta.raw_photos)
            ? rawMeta.raw_photos
            : [];

          // Gunakan Set untuk hilangkan URL persis sama, lalu hilangkan yang sama dengan Photostrip utama
          const uniquePhotos = Array.from(new Set(rawPhotosList)).filter(
            (imgUrl) => imgUrl && imgUrl !== dbPhoto.url
          );

          setPhoto({
            id: dbPhoto.id,
            url: dbPhoto.url || "",
            type: dbPhoto.type || "photo",
            eventId: dbPhoto.event_id || "",
            timestamp: dbPhoto.timestamp,
            username: dbPhoto.username || "Guest",
            templateName: dbPhoto.template_name || "Photo Strip",
            likeCount: dbPhoto.like_count ?? 0,
            meta: {
              ...rawMeta,
              gifUrl: rawMeta.gifUrl || rawMeta.gif_url || "",
              videoUrl: rawMeta.videoUrl || rawMeta.video_url || "",
              rawPhotos: uniquePhotos,
              btsDuration: Number(rawMeta.btsDuration || rawMeta.bts_duration || 0),
            },
          });
        } else {
          setPhoto(null);
        }
      } catch (err) {
        console.error("Gagal mengambil sesi foto:", err);
        setPhoto(null);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [activeId]);

  // BTS Duration Enforcer Guardrail
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || !photo?.meta?.btsDuration) return;

    const maxDuration = photo.meta.btsDuration; // Durasi dalam detik dari setting
    if (maxDuration > 0 && videoRef.current.currentTime >= maxDuration) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0; // Reset kembali ke awal jika melebihi setting
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      setActiveId(searchCode.trim());
      navigate(`/download/${searchCode.trim()}`, { replace: true });
    }
  };

  const triggerSingleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    } catch (err) {
      console.error("Gagal mengunduh file:", err);
    }
  };

  const handleDownloadAllZip = async () => {
    if (!photo) return;
    setIsDownloading(true);
    setZipProgress({ percent: 10, status: "Mempersiapkan antrean file..." });

    try {
      const zip = new JSZip();
      let step = 15;

      // 1. Photo Strip
      if (photo.url) {
        const res = await fetch(photo.url);
        const blob = await res.blob();
        zip.file(`Photostrip_${photo.id}.png`, blob);
        step += 25;
        setZipProgress({ percent: step, status: "Mengompres Photostrip..." });
      }

      // 2. Animated GIF
      if (photo.meta?.gifUrl) {
        const res = await fetch(photo.meta.gifUrl);
        const blob = await res.blob();
        zip.file(`Animation_${photo.id}.gif`, blob);
        step += 20;
        setZipProgress({ percent: step, status: "Mengompres Animated GIF..." });
      }

      // 3. BTS Video
      if (photo.meta?.videoUrl) {
        const res = await fetch(photo.meta.videoUrl);
        const blob = await res.blob();
        zip.file(`BTS_Video_${photo.id}.mp4`, blob);
        step += 20;
        setZipProgress({ percent: step, status: "Mengompres BTS Video..." });
      }

      // 4. Unique Raw Photos
      if (photo.meta?.rawPhotos && photo.meta.rawPhotos.length > 0) {
        const rawFolder = zip.folder("raw_photos");
        for (let i = 0; i < photo.meta.rawPhotos.length; i++) {
          const imgUrl = photo.meta.rawPhotos[i];
          const res = await fetch(imgUrl);
          const blob = await res.blob();
          rawFolder?.file(`Photo_${i + 1}.png`, blob);
        }
      }

      setZipProgress({ percent: 90, status: "Membuat arsip .zip..." });
      const zipBlob = await zip.generateAsync({ type: "blob" });

      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `SnapAzzHot_${photo.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

      setZipProgress({ percent: 100, status: "Pengunduhan Selesai!" });
      setTimeout(() => setIsDownloading(false), 1500);
    } catch (err) {
      console.error("Gagal membuat berkas ZIP:", err);
      setIsDownloading(false);
    }
  };

  // Environment Guardrail View
  if (!isEnvValid) {
    return (
      <div className="min-h-screen bg-[#004ce5] text-white p-4 sm:p-6 flex flex-col items-center justify-center text-center font-sans">
        <div className="bg-white/10 border border-white/20 backdrop-blur-xl p-6 sm:p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-[#bcff00] mx-auto" />
          <h2 className="text-lg sm:text-xl font-black">
            Environment Variable Missing
          </h2>
          <p className="text-xs sm:text-sm text-white/80">
            Variabel konfigurasi Supabase belum terinjeksi saat proses build.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#004ce5] text-white font-sans selection:bg-[#bcff00] selection:text-black relative overflow-x-hidden">
      {/* Blueprint Grid Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15] z-0"
        style={{
          backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-14 relative z-10 space-y-8 sm:space-y-12">
        {/* Header & Search */}
        <header className="text-center space-y-4 sm:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-lg"
          >
            <span className="text-lg sm:text-2xl font-extrabold tracking-tight italic text-[#bcff00] uppercase font-mono">
              #SNAPAZZHOT
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-1.5 sm:space-y-3"
          >
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-none text-white lowercase">
              Download Your Memories{" "}
              <Sparkles className="inline-block w-6 h-6 sm:w-8 sm:h-8 text-[#bcff00] fill-[#bcff00]" />
            </h1>
            <p className="text-white/80 text-xs sm:text-base md:text-lg max-w-md sm:max-w-xl mx-auto font-medium leading-relaxed">
              All of your photobooth memories are ready. Download your photos,
              GIF, and BTS video.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 max-w-md mx-auto pt-1 sm:pt-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Masukkan Kode Unduh / Sesi"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="w-full bg-black/30 border border-white/30 rounded-2xl sm:rounded-full px-4 py-3 pl-11 sm:pl-12 text-xs sm:text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#bcff00] focus:border-transparent transition-all shadow-inner backdrop-blur-md"
              />
              <Search className="w-4 h-4 text-white/60 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="bg-black hover:bg-neutral-900 active:scale-95 text-white font-bold text-xs sm:text-sm px-6 py-3 sm:py-3.5 rounded-2xl sm:rounded-full transition cursor-pointer flex items-center justify-center gap-2 shadow-xl shrink-0 h-11"
            >
              Search
            </button>
          </motion.form>
        </header>

        {/* Content Body */}
        {loading ? (
          <div className="space-y-6 sm:space-y-8 animate-pulse">
            <div className="w-full h-80 sm:h-[480px] bg-white/5 border border-white/10" />
            <div className="w-full h-48 sm:h-[220px] bg-white/5 border border-white/10" />
          </div>
        ) : photo ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 sm:space-y-10"
          >
            {/* 1. Large Photo Strip Preview */}
            {photo.url && (
              <section className="bg-white/10 border border-white/20 backdrop-blur-xl p-4 sm:p-8 shadow-2xl flex flex-col items-center">
                <div className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-sm overflow-hidden shadow-2xl border border-white/30 bg-neutral-900 group">
                  <img
                    src={photo.url}
                    alt="Photostrip Preview"
                    className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <button
                    onClick={() => setSelectedImage(photo.url)}
                    aria-label="Lihat Foto Fullscreen"
                    className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 p-2.5 sm:p-3 bg-white text-blue-600 rounded-full hover:scale-110 transition active:scale-95 shadow-lg"
                  >
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </section>
            )}

            {/* 2. Animated GIF */}
            {photo.meta?.gifUrl && (
              <section className="bg-white/10 border border-white/20 backdrop-blur-xl p-4 sm:p-8 shadow-2xl space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 text-[#bcff00] font-bold text-xs sm:text-sm tracking-wider uppercase font-mono">
                  <Film className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Animated GIF</span>
                </div>
                <div className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-sm mx-auto overflow-hidden border border-white/20 shadow-xl bg-black">
                  <img
                    src={photo.meta.gifUrl}
                    alt="Animated GIF Preview"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </section>
            )}

            {/* 3. Behind The Scene Video with Strict Duration Setting */}
            {photo.meta?.videoUrl && (
              <section className="bg-white/10 border border-white/20 backdrop-blur-xl p-4 sm:p-8 shadow-2xl space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#bcff00] font-bold text-xs sm:text-sm tracking-wider uppercase font-mono">
                    <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Behind The Scenes Video</span>
                  </div>
                  {Boolean(photo.meta.btsDuration) && (
                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-[#bcff00] font-mono bg-black/40 px-2.5 py-1 rounded-full border border-white/10">
                      <Clock className="w-3 h-3" />
                      {photo.meta.btsDuration}s Max
                    </span>
                  )}
                </div>
                <div className="relative w-full max-w-md mx-auto overflow-hidden border border-white/20 shadow-xl bg-black">
                  <video
                    ref={videoRef}
                    src={photo.meta.videoUrl}
                    onTimeUpdate={handleVideoTimeUpdate}
                    controls
                    playsInline
                    className="w-full h-auto"
                  />
                </div>
              </section>
            )}

            {/* 4. Deduplicated Photo Gallery Grid */}
            {photo.meta?.rawPhotos && photo.meta.rawPhotos.length > 0 && (
              <section className="bg-white/10 border border-white/20 backdrop-blur-xl p-4 sm:p-8 shadow-2xl space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#bcff00] font-bold text-xs sm:text-sm tracking-wider uppercase font-mono">
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Photo Gallery</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-white/70 font-mono">
                    {photo.meta.rawPhotos.length} Items
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
                  {photo.meta.rawPhotos.map((imgUrl, idx) => (
                    <motion.div
                      key={`${imgUrl}-${idx}`}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => setSelectedImage(imgUrl)}
                      className="group relative aspect-[3/4] bg-neutral-900 overflow-hidden border border-white/20 cursor-pointer shadow-lg"
                    >
                      <img
                        src={imgUrl}
                        alt={`Capture ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="p-2 bg-white text-blue-600 rounded-full shadow-md">
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. Download Action Center */}
            <section className="bg-white/10 border border-white/20 backdrop-blur-xl p-4 sm:p-8 shadow-2xl space-y-3 sm:space-y-5">
              <AnimatePresence>
                {isDownloading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-black/40 border border-white/20 p-3 sm:p-4 space-y-2 overflow-hidden"
                  >
                    <div className="flex justify-between text-[11px] sm:text-xs font-semibold">
                      <span className="flex items-center gap-2 truncate">
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-[#bcff00] shrink-0" />
                        <span className="truncate">{zipProgress.status}</span>
                      </span>
                      <span className="text-[#bcff00] font-mono shrink-0 ml-2">
                        {zipProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1.5 sm:h-2 overflow-hidden">
                      <div
                        className="bg-[#bcff00] h-full transition-all duration-300 rounded-full"
                        style={{ width: `${zipProgress.percent}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleDownloadAllZip}
                disabled={isDownloading}
                className="w-full py-3.5 sm:py-4 px-4 bg-black hover:bg-neutral-900 disabled:bg-neutral-800 text-white font-black text-sm sm:text-base md:text-lg rounded-2xl sm:rounded-full transition cursor-pointer flex items-center justify-center gap-2 sm:gap-3 shadow-2xl active:scale-[0.99] min-h-[50px]"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-[#bcff00]" />
                ) : (
                  <Download className="w-5 h-5 sm:w-6 sm:h-6 text-[#bcff00]" />
                )}
                <span>Download Everything (.zip)</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-1">
                {photo.url && (
                  <button
                    onClick={() =>
                      triggerSingleDownload(
                        photo.url,
                        `Photostrip_${photo.id}.png`,
                      )
                    }
                    className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl sm:rounded-full text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 min-h-[44px]"
                  >
                    <ImageIcon className="w-4 h-4 text-[#bcff00]" />
                    <span>Download Photos</span>
                  </button>
                )}

                {photo.meta?.gifUrl && (
                  <button
                    onClick={() =>
                      triggerSingleDownload(
                        photo.meta.gifUrl!,
                        `Animation_${photo.id}.gif`,
                      )
                    }
                    className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl sm:rounded-full text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 min-h-[44px]"
                  >
                    <Film className="w-4 h-4 text-[#bcff00]" />
                    <span>Download GIF</span>
                  </button>
                )}

                {photo.meta?.videoUrl && (
                  <button
                    onClick={() =>
                      triggerSingleDownload(
                        photo.meta.videoUrl!,
                        `BTS_Video_${photo.id}.mp4`,
                      )
                    }
                    className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl sm:rounded-full text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 min-h-[44px]"
                  >
                    <Video className="w-4 h-4 text-[#bcff00]" />
                    <span>Download Video</span>
                  </button>
                )}
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 border border-white/20 backdrop-blur-xl p-6 sm:p-10 text-center max-w-md mx-auto space-y-4 shadow-2xl"
          >
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500/20 border border-red-500/40 text-red-400 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Memories Not Found
              </h2>
              <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
                Sesi foto tidak ditemukan atau kode unduh telah kadaluarsa.
                Silakan periksa kembali kode Anda.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Lightbox / Fullscreen Image Viewer Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex items-center justify-center cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl sm:max-w-3xl max-h-[85vh] bg-white/10 border border-white/20 backdrop-blur-2xl overflow-hidden p-2 sm:p-3 shadow-2xl flex flex-col items-center"
            >
              <button
                onClick={() => setSelectedImage(null)}
                aria-label="Tutup Preview"
                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black transition z-10"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <img
                src={selectedImage}
                alt="Enlarged view"
                className="max-h-[80vh] w-auto max-w-full object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}