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
import { getCanvasFilterString } from "../../layouts/BoothLayout";
import { renderMedia } from "../../utils/render";

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
  videoUrls?: string[];
  rawPhotos?: string[];
  btsDuration?: number;
  frameFilters?: string[];
  mirror?: boolean;
  zoom?: number;
  template?: any;
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

// --- BTS SLOT COMPONENT (EQUAL TO BOOTH PRINT) ---
interface BtsSlotProps {
  videoUrl: string;
  imageUrl: string;
  style: React.CSSProperties;
  borderRadius?: number;
  mirror: boolean;
  zoom: number;
  filterId: string;
}

const BtsSlot = ({
  videoUrl,
  imageUrl,
  style,
  borderRadius = 0,
  mirror,
  zoom,
  filterId,
}: BtsSlotProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      canvas.width = canvas.clientWidth || 400;
      canvas.height = canvas.clientHeight || 400;
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    let active = true;
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let videoElement: HTMLVideoElement | null = null;
    if (videoUrl) {
      videoElement = document.createElement("video");
      videoElement.src = videoUrl;
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.loop = false;
      videoElement
        .play()
        .catch((err) => console.warn("BTS Video playback interrupted:", err));
    }

    const renderLoop = () => {
      if (!active) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = getCanvasFilterString(filterId);

      if (videoElement && videoElement.readyState >= 2) {
        renderMedia({
          ctx,
          source: videoElement,
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
          objectFit: "cover",
          mirror,
          zoom,
        });
      }

      ctx.filter = "none";
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      active = false;
      cancelAnimationFrame(animationFrameId);
      if (videoElement) {
        videoElement.pause();
        videoElement.src = "";
        videoElement.load();
      }
    };
  }, [videoUrl, mirror, zoom, filterId]);

  return (
    <div
      className="absolute overflow-hidden"
      style={{ ...style, borderRadius: `${borderRadius}px` }}
    >
      <canvas ref={canvasRef} className="w-full h-full object-cover" />
    </div>
  );
};

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

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

          const rawPhotosList: string[] = Array.isArray(rawMeta.rawPhotos)
            ? rawMeta.rawPhotos
            : Array.isArray(rawMeta.raw_photos)
              ? rawMeta.raw_photos
              : [];

          const uniquePhotos = Array.from(new Set(rawPhotosList)).filter(
            (imgUrl) => imgUrl && imgUrl !== dbPhoto.url,
          );

          const rawMetaTemplate = rawMeta.template;
          const photoSlotCount = rawMetaTemplate?.elements
            ? rawMetaTemplate.elements.filter((el: any) => el.type === "photo")
                .length
            : uniquePhotos.length;
          const limitedPhotos = uniquePhotos.slice(
            0,
            Math.min(photoSlotCount, uniquePhotos.length),
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
              videoUrls: rawMeta.videoUrls || rawMeta.video_urls || [],
              rawPhotos: limitedPhotos,
              btsDuration: Number(
                rawMeta.btsDuration || rawMeta.bts_duration || 0,
              ),
              frameFilters: rawMeta.frameFilters || [],
              mirror: Boolean(rawMeta.mirror),
              zoom: Number(rawMeta.zoom || 1),
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

      if (photo.url) {
        const res = await fetch(photo.url);
        const blob = await res.blob();
        zip.file(`Photostrip_${photo.id}.png`, blob);
        step += 25;
        setZipProgress({ percent: step, status: "Mengompres Photostrip..." });
      }

      if (photo.meta?.gifUrl) {
        const res = await fetch(photo.meta.gifUrl);
        const blob = await res.blob();
        zip.file(`Animation_${photo.id}.gif`, blob);
        step += 20;
        setZipProgress({ percent: step, status: "Mengompres Animated GIF..." });
      }

      if (photo.meta?.videoUrl) {
        const res = await fetch(photo.meta.videoUrl);
        const blob = await res.blob();
        zip.file(`BTS_Video_${photo.id}.mp4`, blob);
        step += 20;
        setZipProgress({ percent: step, status: "Mengompres BTS Video..." });
      }

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

  if (!isEnvValid) {
    return (
      <div className="min-h-screen bg-[#0038FF] text-white p-4 sm:p-6 flex flex-col items-center justify-center text-center font-sans">
        <div className="glass-panel p-6 sm:p-8 rounded-[32px] max-w-md w-full shadow-2xl space-y-4 border border-white/25">
          <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-[#CCFF00] mx-auto" />
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

  const template = photo?.meta?.template;
  const elements = template ? [...(template.elements || [])] : [];
  const photoPositions = elements
    .filter((el: any) => el.type === "photo" && !el.hidden)
    .sort((a: any, b: any) => a.y - b.y || a.x - b.x);

  const canvasWidth = template?.canvasWidth || 1200;
  const canvasHeight = template?.canvasHeight || 800;

  return (
    <div className="min-h-screen bg-[#0038FF] text-white font-sans selection:bg-[#CCFF00] selection:text-black relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,255,0,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(0,46,214,0.8),transparent_70%)] pointer-events-none z-0" />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] z-0"
        style={{
          backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 relative z-10 space-y-10 sm:space-y-14">
        {/* Header */}
        <header className="text-center space-y-5 sm:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-pill text-xs font-bold tracking-widest uppercase text-[#CCFF00] shadow-lg"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>PORTAL DOWNLOAD</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2 sm:space-y-3"
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight text-white uppercase">
              DOWNLOAD YOUR <span className="text-[#CCFF00]">MEMORIES</span>
            </h1>
            <p className="text-white/80 text-xs sm:text-base md:text-lg max-w-xl mx-auto font-medium leading-relaxed">
              All of your photobooth memories are ready. Download your photos, GIF, and BTS video instantly.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-md mx-auto pt-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter Session Code / ID..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="w-full bg-black/30 border border-white/30 rounded-full px-5 py-3.5 pl-12 text-xs sm:text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#CCFF00] focus:border-transparent transition-all shadow-inner backdrop-blur-md"
              />
              <Search className="w-4 h-4 text-white/60 absolute left-4.5 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="bg-[#CCFF00] hover:bg-white active:scale-95 text-black font-extrabold text-xs sm:text-sm px-8 py-3.5 rounded-full transition cursor-pointer flex items-center justify-center gap-2 shadow-xl shrink-0"
            >
              Search
            </button>
          </motion.form>
        </header>

        {/* Main Body */}
        {loading ? (
          <div className="space-y-8 animate-pulse">
            <div className="w-full h-80 sm:h-[480px] glass-panel rounded-[32px]" />
            <div className="w-full h-48 sm:h-[220px] glass-panel rounded-[32px]" />
          </div>
        ) : photo ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 sm:space-y-12"
          >
            {/* 1. Photostrip Preview */}
            {photo.url && (
              <section className="glass-panel border border-white/25 p-6 sm:p-10 shadow-2xl rounded-[32px] flex flex-col items-center">
                <div className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-sm overflow-hidden shadow-2xl border border-white/30 bg-neutral-950 rounded-[24px] group">
                  <img
                    src={photo.url}
                    alt="Photostrip Preview"
                    className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <button
                    onClick={() => setSelectedImage(photo.url)}
                    aria-label="View Fullscreen"
                    className="absolute bottom-4 right-4 p-3.5 bg-[#CCFF00] text-black rounded-full hover:scale-110 transition active:scale-95 shadow-xl font-bold cursor-pointer"
                  >
                    <Eye className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </section>
            )}

            {/* 2. Animated GIF */}
            {photo.meta?.gifUrl && (
              <section className="glass-panel border border-white/25 p-6 sm:p-10 shadow-2xl rounded-[32px] space-y-4">
                <div className="flex items-center gap-2 text-[#CCFF00] font-extrabold text-xs sm:text-sm tracking-wider uppercase font-mono">
                  <Film className="w-5 h-5" />
                  <span>Animated GIF</span>
                </div>
                <div className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-sm mx-auto overflow-hidden border border-white/20 shadow-2xl bg-black rounded-[24px]">
                  <img
                    src={photo.meta.gifUrl}
                    alt="Animated GIF Preview"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </section>
            )}

            {/* 3. Behind The Scene */}
            {(photo.meta?.videoUrl ||
              (photo.meta?.videoUrls && photo.meta.videoUrls.length > 0)) && (
              <section className="glass-panel border border-white/25 p-6 sm:p-10 shadow-2xl rounded-[32px] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#CCFF00] font-extrabold text-xs sm:text-sm tracking-wider uppercase font-mono">
                    <Video className="w-5 h-5 text-red-400 animate-pulse" />
                    <span>Behind The Scenes Layout</span>
                  </div>
                  {Boolean(photo.meta.btsDuration) && (
                    <span className="flex items-center gap-1.5 text-xs text-[#CCFF00] font-mono bg-black/40 px-3 py-1.5 rounded-full border border-white/20">
                      <Clock className="w-3.5 h-3.5" />
                      {photo.meta.btsDuration}s Max
                    </span>
                  )}
                </div>

                {template ? (
                  <div
                    className="w-full max-w-[360px] sm:max-w-[420px] mx-auto aspect-[3/4] relative shadow-2xl overflow-hidden rounded-[24px] border border-white/25"
                    style={{
                      backgroundColor: template?.themeColor || "#ffffff",
                      backgroundImage: template?.backgroundImage
                        ? `url(${template.backgroundImage})`
                        : undefined,
                      backgroundSize: "cover",
                    }}
                  >
                    {elements.map((el: any) => {
                      const style: React.CSSProperties = {
                        position: "absolute",
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        width: `${el.width}%`,
                        height: `${el.height}%`,
                        zIndex: el.zIndex || 10,
                      };

                      if (el.type === "photo") {
                        const photoIdx = photoPositions.findIndex(
                          (item: any) => item.id === el.id,
                        );
                        const imageUrl =
                          photo.meta?.rawPhotos?.[photoIdx] || "";
                        const videoUrl =
                          photo.meta?.videoUrls?.[photoIdx] ||
                          photo.meta?.videoUrl ||
                          "";
                        const filterId =
                          photo.meta?.frameFilters?.[photoIdx] || "normal";

                        return (
                          <BtsSlot
                            key={el.id}
                            videoUrl={videoUrl}
                            imageUrl={imageUrl}
                            style={style}
                            borderRadius={el.borderRadius || 0}
                            mirror={photo.meta?.mirror || false}
                            zoom={photo.meta?.zoom || 1}
                            filterId={filterId}
                          />
                        );
                      }

                      if (el.type === "logo" || el.type === "decor") {
                        return (
                          <img
                            key={el.id}
                            src={el.textValue}
                            alt={el.name}
                            style={style}
                            className="object-contain pointer-events-none"
                          />
                        );
                      }
                      return null;
                    })}

                    {template?.framePng && (
                      <img
                        src={template.framePng}
                        alt="Overlay"
                        className="absolute inset-0 w-full h-full object-fill pointer-events-none z-30"
                      />
                    )}
                  </div>
                ) : (
                  <div className="relative w-full max-w-md mx-auto overflow-hidden border border-white/20 shadow-2xl bg-black rounded-[24px]">
                    <video
                      src={photo.meta.videoUrl}
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-auto"
                    />
                  </div>
                )}
              </section>
            )}

            {/* 4. Raw Photo Gallery */}
            {photo.meta?.rawPhotos && photo.meta.rawPhotos.length > 0 && (
              <section className="glass-panel border border-white/25 p-6 sm:p-10 shadow-2xl rounded-[32px] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#CCFF00] font-extrabold text-xs sm:text-sm tracking-wider uppercase font-mono">
                    <Camera className="w-5 h-5" />
                    <span>Photo Gallery</span>
                  </div>
                  <span className="text-xs text-white/80 font-mono font-bold">
                    {photo.meta.rawPhotos.length} Items
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photo.meta.rawPhotos.map((imgUrl, idx) => (
                    <motion.div
                      key={`${imgUrl}-${idx}`}
                      whileHover={{ scale: 1.04, y: -4 }}
                      onClick={() => setSelectedImage(imgUrl)}
                      className="group relative aspect-[3/4] bg-neutral-950 overflow-hidden border border-white/20 cursor-pointer shadow-xl rounded-[20px]"
                    >
                      <img
                        src={imgUrl}
                        alt={`Capture ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="p-3 bg-[#CCFF00] text-black rounded-full shadow-lg">
                          <Eye className="w-4 h-4 stroke-[2.5]" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. Download Action Center */}
            <section className="glass-panel border border-white/25 p-6 sm:p-10 shadow-2xl rounded-[32px] space-y-5">
              <AnimatePresence>
                {isDownloading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-black/50 border border-white/20 p-4 rounded-2xl space-y-2.5 overflow-hidden"
                  >
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-2.5 truncate">
                        <Loader2 className="w-4 h-4 animate-spin text-[#CCFF00] shrink-0" />
                        <span className="truncate">{zipProgress.status}</span>
                      </span>
                      <span className="text-[#CCFF00] font-mono shrink-0 ml-2">
                        {zipProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#CCFF00] h-full transition-all duration-300 rounded-full"
                        style={{ width: `${zipProgress.percent}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleDownloadAllZip}
                disabled={isDownloading}
                className="w-full py-4 px-6 bg-[#CCFF00] hover:bg-white disabled:bg-neutral-800 text-black font-black text-base sm:text-lg rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(204,255,0,0.3)] active:scale-[0.99] min-h-[56px]"
              >
                {isDownloading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-black" />
                ) : (
                  <Download className="w-6 h-6 text-black stroke-[2.5]" />
                )}
                <span>DOWNLOAD EVERYTHING (.ZIP)</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {photo.url && (
                  <button
                    onClick={() =>
                      triggerSingleDownload(
                        photo.url,
                        `Photostrip_${photo.id}.png`,
                      )
                    }
                    className="w-full py-3.5 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full text-xs font-extrabold uppercase tracking-wider transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer backdrop-blur-md"
                  >
                    <ImageIcon className="w-4 h-4 text-[#CCFF00]" />
                    <span>Download Photo</span>
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
                    className="w-full py-3.5 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full text-xs font-extrabold uppercase tracking-wider transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer backdrop-blur-md"
                  >
                    <Film className="w-4 h-4 text-[#CCFF00]" />
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
                    className="w-full py-3.5 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full text-xs font-extrabold uppercase tracking-wider transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer backdrop-blur-md"
                  >
                    <Video className="w-4 h-4 text-[#CCFF00]" />
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
            className="glass-panel border border-white/25 p-8 sm:p-12 text-center max-w-md mx-auto space-y-4 shadow-2xl rounded-[32px]"
          >
            <div className="w-16 h-16 bg-red-500/20 border border-red-500/40 text-red-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Memories Not Found
              </h2>
              <p className="text-white/80 text-xs sm:text-sm leading-relaxed font-medium">
                Sesi foto tidak ditemukan atau kode unduh telah kadaluarsa. Silakan periksa kembali kode Anda.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-4 flex items-center justify-center cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl sm:max-w-3xl max-h-[85vh] glass-panel border border-white/25 overflow-hidden p-4 shadow-2xl flex flex-col items-center rounded-[32px]"
            >
              <button
                onClick={() => setSelectedImage(null)}
                aria-label="Close Preview"
                className="absolute top-4 right-4 p-2.5 bg-black/70 hover:bg-black text-white rounded-full transition z-10 cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
              <img
                src={selectedImage}
                alt="Enlarged view"
                className="max-h-[80vh] w-auto max-w-full object-contain rounded-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
