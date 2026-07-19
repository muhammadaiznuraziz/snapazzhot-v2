import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  Download,
  Camera,
  ImageIcon,
  Film,
  Clock,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Loader2,
  FileDown,
  Maximize2,
  RotateCw,
  RefreshCw,
  Instagram,
  Facebook,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Video as VideoIcon, // Mengubah nama alias agar tidak konflik dengan tag <video>
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import JSZip from "jszip";

interface PhotoRecord {
  id: string;
  url: string;
  type: string;
  eventId: string;
  timestamp: string;
  username: string;
  templateName: string;
  likeCount: number;
  meta?: {
    gifUrl?: string;
    videoUrl?: string;
    noFrameUrl?: string;
    rawPhotos?: string[];
    filterApplied?: string;
    cameraType?: string;
    frameStyle?: string;
  };
}

const LOCALIZATION = {
  EN: {
    ready: "Memories Ready ",
    subtitle: "Download photos and videos before expiration.",
    expiresIn: "Expires In",
    expired: "Expired",
    preview: "Preview",
    downloadYourFiles: "Download Files",
    sessionInfo: "Session Info",
    sessionId: "Session ID",
    date: "Date",
    time: "Time",
    event: "Event",
    preparingPhotos: "Preparing...",
    compressingFiles: "Compressing...",
    secondsRemaining: "s remaining",
    downloadStarted: "Downloading",
    success: "Success!",
    generatingZip: "Generating ZIP...",
    copied: "Copied!",
    copyLink: "Copy Link",
    share: "Share Session",
    fullScreen: "Fullscreen",
    originalPhotos: "Original Poses",
    originalPhotosSubtitle: "Click to preview or download individual pose",
    framePhotoPng: "Print Frame (PNG)",
    originalPhotosZip: "All Poses (ZIP)",
    animatedGifRow: "Loop Animation (GIF)",
    btsRow: "Behind The Scenes (MP4)",
  },
  ID: {
    ready: "Kenangan Siap Diunduh",
    subtitle: "Ambil file foto dan video Anda sebelum masa simpan habis.",
    expiresIn: "Kedaluwarsa Dalam",
    expired: "Kedaluwarsa",
    preview: "Pratinjau",
    downloadYourFiles: "Unduh File",
    sessionInfo: "Info Sesi",
    sessionId: "ID Sesi",
    date: "Tanggal",
    time: "Waktu",
    event: "Acara",
    preparingPhotos: "Menyiapkan...",
    compressingFiles: "Mengompresi...",
    secondsRemaining: "detik tersisa",
    downloadStarted: "Mengunduh",
    success: "Berhasil!",
    generatingZip: "Membuat ZIP...",
    copied: "Disalin!",
    copyLink: "Salin Link",
    share: "Bagikan Sesi",
    fullScreen: "Layar Penuh",
    originalPhotos: "Foto Pose Asli",
    originalPhotosSubtitle: "Klik foto untuk pratinjau & download pose satuan",
    framePhotoPng: "Foto Bingkai (PNG)",
    originalPhotosZip: "Semua Pose Asli (ZIP)",
    animatedGifRow: "GIF Animasi (GIF)",
    btsRow: "Video Cetak (MP4)",
  },
};

const DEFAULT_PHOTO: PhotoRecord = {
  id: "SAH-260718-2022",
  url: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop",
  type: "photo",
  eventId: "evt-wedding",
  timestamp: "2026-07-18T02:00:00.000Z",
  username: "kiara.wedding.eth",
  templateName: "Classic Wedding Strip",
  likeCount: 1190,
  meta: {
    gifUrl:
      "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3VkbndhNTVvZXhsdXh1M3lyNXFtdXo2dzYwcXZuNmV6ZmoxNWhmdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKoWXm3okO1kgdW/giphy.gif",
    videoUrl:
      "https://assets.mixkit.co/videos/preview/mixkit-group-of-friends-posing-for-a-photo-40348-large.mp4",
    noFrameUrl:
      "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop",
    rawPhotos: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519225495810-7512c696505a?q=80&w=600&auto=format&fit=crop",
    ],
    filterApplied: "Warm Glow",
    cameraType: "Sony Alpha 7R V",
    frameStyle: "Classic Glass Strip",
  },
};

export default function DownloadPortal() {
  const { id } = useParams<{ id: string }>();
  const [lang, setLang] = useState<"EN" | "ID">("ID");
  const t = LOCALIZATION[lang];

  const [photo, setPhoto] = useState<PhotoRecord | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePreviewTab, setActivePreviewTab] = useState<
    "photo" | "gif" | "video"
  >("photo");
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null,
  );
  const [copiedLink, setCopiedLink] = useState(false);

  const [zoomScale, setZoomScale] = useState(1);
  const [rotateAngle, setRotateAngle] = useState(0);
  const [zipProgress, setZipProgress] = useState({
    percent: 0,
    status: "",
    timeLeft: "",
  });

  useEffect(() => {
    async function fetchSession() {
      const targetId = id || "SAH-260718-2022";
      try {
        setLoading(true);
        const { data: dbPhoto, error: photoErr } = await supabase
          .from("photos")
          .select("*")
          .eq("id", targetId)
          .single();
        
        if (photoErr) throw photoErr;

        if (dbPhoto) {
          const photoRecord: PhotoRecord = {
            id: dbPhoto.id,
            url: dbPhoto.url,
            type: dbPhoto.type,
            eventId: dbPhoto.event_id,
            timestamp: dbPhoto.timestamp,
            username: dbPhoto.username,
            templateName: dbPhoto.template_name,
            likeCount: dbPhoto.like_count,
            meta: dbPhoto.meta || {},
          };

          if (!photoRecord.meta) photoRecord.meta = {};
          if (!photoRecord.meta.rawPhotos)
            photoRecord.meta.rawPhotos = DEFAULT_PHOTO.meta?.rawPhotos;
          if (!photoRecord.meta.gifUrl)
            photoRecord.meta.gifUrl = DEFAULT_PHOTO.meta?.gifUrl;
          if (!photoRecord.meta.videoUrl)
            photoRecord.meta.videoUrl = DEFAULT_PHOTO.meta?.videoUrl;

          setPhoto(photoRecord);

          let eventName = "SNAPAZZHOT";
          if (dbPhoto.event_id) {
            const { data: dbEvent } = await supabase
              .from("events")
              .select("name")
              .eq("id", dbPhoto.event_id)
              .single();
            if (dbEvent) {
              eventName = dbEvent.name;
            }
          }

          setEvent({
            name: eventName,
            location: "HEART",
          });
        } else {
          setPhoto({ ...DEFAULT_PHOTO, id: targetId });
          setEvent({
            name: "SNAPAZZHOT",
            location: "HEART",
          });
        }
      } catch (err) {
        console.error("fetchSession failed, using default fallback:", err);
        setPhoto({ ...DEFAULT_PHOTO, id: targetId });
        setEvent({
          name: "SNAPAZZHOT",
          location: "HEART",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [id]);

  useEffect(() => {
    if (!photo) return;
    const createdTime = new Date(photo.timestamp).getTime();
    const expirationPeriodMs = 30 * 24 * 60 * 60 * 1000;
    const expireTime = createdTime + expirationPeriodMs;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = expireTime - now;
      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        clearInterval(timer);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
        setIsExpired(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [photo]);

  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        return;
      }
    } catch (e) {
      console.warn("Blob block active. Fallback redirect.");
    }
    window.open(url, "_blank");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadAllZip = async () => {
    if (!photo) return;
    setIsProgressModalOpen(true);
    setZipProgress({
      percent: 5,
      status: t.preparingPhotos,
      timeLeft: `5 ${t.secondsRemaining}`,
    });
    try {
      const zip = new JSZip();
      await new Promise((r) => setTimeout(r, 600));
      setZipProgress({
        percent: 50,
        status: t.compressingFiles,
        timeLeft: `2 ${t.secondsRemaining}`,
      });

      const response = await fetch(photo.url);
      const blob = response.ok ? await response.blob() : new Blob();
      zip.file("photostrip.png", blob);

      setZipProgress({ percent: 90, status: "Finalizing...", timeLeft: "1s" });
      const content = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(content);
      downloadFile(zipUrl, `SnapAzzHot_${photo.id}.zip`);

      setZipProgress({
        percent: 100,
        status: t.downloadStarted,
        timeLeft: "0s",
      });
      setTimeout(() => setIsProgressModalOpen(false), 1000);
    } catch (e) {
      setIsProgressModalOpen(false);
    }
  };

  const formattedDate = useMemo(() => {
    if (!photo) return "";
    return new Date(photo.timestamp).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [photo]);

  const formattedTime = useMemo(() => {
    if (!photo) return "";
    return (
      new Date(photo.timestamp).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    );
  }, [photo]);

  if (loading || !photo) {
    return (
      <div className="min-h-screen bg-[#004ce5] text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-white/20 border-t-[#bcff00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#004ce5] text-white flex flex-col font-sans select-none overflow-x-hidden antialiased relative pb-24 lg:pb-6">
      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.12] z-0"
        style={{
          backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* HEADER HERO AREA */}
      <header className="max-w-6xl w-full mx-auto px-4 pt-4 pb-2 relative z-10 space-y-3">
        {/* Tombol Bahasa: Di atas judul pada mobile, pojok kanan pada desktop */}
        <div className="flex justify-center sm:justify-end">
          <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10 text-[10px] font-mono font-bold">
            <button
              onClick={() => setLang("ID")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${lang === "ID" ? "bg-[#bcff00] text-black" : "text-white/60"}`}
            >
              ID
            </button>
            <button
              onClick={() => setLang("EN")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${lang === "EN" ? "bg-[#bcff00] text-black" : "text-white/60"}`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Konten Judul Bersih Tanpa Tabrakan */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black italic tracking-tight text-white uppercase leading-none">
            {t.ready}
          </h1>
          <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto">
            {t.subtitle}
          </p>
          <div className="pt-1">
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#bcff00]/10 border border-[#bcff00]/30 rounded-full text-[10px] font-mono font-bold text-[#bcff00]">
              <Clock className="w-3 h-3 animate-pulse" />
              <span>
                {timeLeft
                  ? `${t.expiresIn}: ${timeLeft.days}D • ${timeLeft.hours}H • ${timeLeft.minutes}M`
                  : t.expired}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN TWO COLUMN LAYOUT */}
      <main className="max-w-6xl w-full mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start relative z-10 flex-1">
        {/* LEFT STAGE COLUMN */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-xl flex flex-col">
            {/* STAGE HEADER CONTROLS */}
            <div className="flex flex-row items-center justify-between border-b border-white/10 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#bcff00] animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/60">
                  {t.preview} STAGE
                </span>
              </div>
              <div className="flex bg-black/30 p-0.5 rounded-full border border-white/10">
                <button
                  onClick={() => setActivePreviewTab("photo")}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${activePreviewTab === "photo" ? "bg-[#bcff00] text-black shadow" : "text-white/60 hover:text-[#bcff00]"}`}
                >
                  <ImageIcon className="w-3 h-3" /> <span>Frame</span>
                </button>
                {photo?.meta?.gifUrl && (
                  <button
                    onClick={() => setActivePreviewTab("gif")}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${activePreviewTab === "gif" ? "bg-[#bcff00] text-black shadow" : "text-white/60 hover:text-[#bcff00]"}`}
                  >
                    <Film className="w-3 h-3" /> <span>GIF</span>
                  </button>
                )}
                {photo?.meta?.videoUrl && (
                  <button
                    onClick={() => setActivePreviewTab("video")}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${activePreviewTab === "video" ? "bg-[#bcff00] text-black shadow" : "text-white/60 hover:text-[#bcff00]"}`}
                  >
                    <VideoIcon className="w-3 h-3" /> <span>Video</span>
                  </button>
                )}
              </div>
            </div>

            {/* DYNAMIC VIEWPORT WINDOW */}
            <div className="bg-black/20 border border-white/5 rounded-xl p-3 flex items-center justify-center relative overflow-hidden group aspect-[4/3] w-full shadow-inner">
              {activePreviewTab === "photo" && (
                <div className="relative flex items-center justify-center h-full w-full">
                  <img
                    src={photo.url}
                    alt="Photostrip output"
                    className="max-h-full max-w-full object-contain rounded shadow-lg"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center pointer-events-none">
                    <button
                      onClick={() => setIsImageModalOpen(true)}
                      className="opacity-0 group-hover:opacity-100 transition-all pointer-events-auto px-4 py-2 bg-black border border-white/10 rounded-full text-[#bcff00] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />{" "}
                      <span>{t.fullScreen}</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setIsImageModalOpen(true)}
                    className="absolute bottom-2 right-2 bg-black/75 p-2 rounded-full shadow border border-white/10 md:hidden cursor-pointer"
                  >
                    <Maximize className="w-3.5 h-3.5 text-[#bcff00]" />
                  </button>
                </div>
              )}

              {activePreviewTab === "gif" && photo.meta?.gifUrl && (
                <div className="h-full w-full flex items-center justify-center">
                  <img
                    src={photo.meta.gifUrl}
                    alt="Loop GIF"
                    className="max-h-full max-w-full object-contain rounded shadow-lg"
                    loading="lazy"
                  />
                </div>
              )}

              {activePreviewTab === "video" && photo.meta?.videoUrl && (
                <div className="h-full w-full flex items-center justify-center bg-black/40 rounded">
                  <video
                    src={photo.meta.videoUrl}
                    poster={photo.url}
                    controls
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* SESSION INFO */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-xl text-left">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 border-b border-white/10 pb-2 mb-3">
              {t.sessionInfo}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[9px] font-mono text-white/40 block font-bold uppercase tracking-wider">
                  {t.event}
                </span>
                <p className="text-xs font-bold text-white truncate">
                  {event?.name || "Premium Event"}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-mono text-white/40 block font-bold uppercase tracking-wider">
                  {t.date}
                </span>
                <p className="text-xs font-bold text-white">{formattedDate}</p>
              </div>
              <div>
                <span className="text-[9px] font-mono text-white/40 block font-bold uppercase tracking-wider">
                  {t.time}
                </span>
                <p className="text-xs font-bold text-white">{formattedTime}</p>
              </div>
              <div>
                <span className="text-[9px] font-mono text-white/40 block font-bold uppercase tracking-wider">
                  {t.sessionId}
                </span>
                <p className="text-xs font-mono font-bold text-[#bcff00] truncate select-all">
                  {photo.id}
                </p>
              </div>
            </div>
          </div>

          {/* ORIGINAL RAW POSES CONTAINER */}
          {photo?.meta?.rawPhotos && photo.meta.rawPhotos.length > 0 && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-xl text-left space-y-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {t.originalPhotos}
                </h3>
                <p className="text-[10px] text-white/60 font-medium">
                  {t.originalPhotosSubtitle}
                </p>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
                {photo.meta.rawPhotos.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className="w-24 h-24 sm:w-28 sm:h-28 relative bg-white/5 border border-white/10 hover:border-[#bcff00] rounded-xl overflow-hidden shadow cursor-zoom-in shrink-0 p-1"
                  >
                    <img
                      src={item}
                      alt={`Pose ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                      loading="lazy"
                    />
                    <div className="absolute bottom-1.5 left-1.5 bg-black/75 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-[#bcff00]">
                      POSE #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT MEDIA DOWNLOAD PANEL */}
        <div className="lg:col-span-5 space-y-4 text-left">
          <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-xl space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider uppercase mb-0.5">
                {t.downloadYourFiles}
              </h2>
              <p className="text-[10px] text-white/60 font-medium">
                High-definition captures optimized from DSLR photolab kiosk
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
              {/* Item: Print Frame */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between hover:bg-white/10 transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-[#bcff00] shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h5 className="text-xs font-bold text-white truncate leading-tight">
                      {t.framePhotoPng}
                    </h5>
                    <span className="text-[8px] font-mono text-[#bcff00]/80 font-bold block">
                      PNG • HQ PRINT
                    </span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    downloadFile(photo.url, `Frame_${photo.id}.png`)
                  }
                  className="w-7 h-7 bg-white text-black hover:bg-[#bcff00] rounded-lg flex items-center justify-center transition shrink-0 cursor-pointer shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Item: All Poses ZIP */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between hover:bg-white/10 transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-[#bcff00] shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h5 className="text-xs font-bold text-white truncate leading-tight">
                      {t.originalPhotosZip}
                    </h5>
                    <span className="text-[8px] font-mono text-[#bcff00]/80 font-bold block">
                      ZIP • RAW CAPTURE
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleDownloadAllZip}
                  className="w-7 h-7 bg-white text-black hover:bg-[#bcff00] rounded-lg flex items-center justify-center transition shrink-0 cursor-pointer shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Item: GIF Loop */}
              {photo?.meta?.gifUrl && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between hover:bg-white/10 transition">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-[#bcff00] shrink-0">
                      <Film className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <h5 className="text-xs font-bold text-white truncate leading-tight">
                        {t.animatedGifRow}
                      </h5>
                      <span className="text-[8px] font-mono text-[#bcff00]/80 font-bold block">
                        GIF • ANIMATION
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      downloadFile(
                        photo.meta!.gifUrl!,
                        `Animation_${photo.id}.gif`,
                      )
                    }
                    className="w-7 h-7 bg-white text-black hover:bg-[#bcff00] rounded-lg flex items-center justify-center transition shrink-0 cursor-pointer shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Item: BTS Video */}
              {photo?.meta?.videoUrl && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between hover:bg-white/10 transition">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-[#bcff00] shrink-0">
                      <VideoIcon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <h5 className="text-xs font-bold text-white truncate leading-tight">
                        {t.btsRow}
                      </h5>
                      <span className="text-[8px] font-mono text-[#bcff00]/80 font-bold block">
                        MP4 • HD CAPTURE
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      downloadFile(
                        photo.meta!.videoUrl!,
                        `Video_${photo.id}.mp4`,
                      )
                    }
                    className="w-7 h-7 bg-white text-black hover:bg-[#bcff00] rounded-lg flex items-center justify-center transition shrink-0 cursor-pointer shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* MASTER ZIP CTA */}
            <button
              onClick={handleDownloadAllZip}
              className="w-full py-3 bg-[#bcff00] hover:bg-white text-black rounded-xl font-mono text-xs font-black uppercase tracking-wider shadow transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-black" />
              <span>Download Everything (ZIP)</span>
            </button>
          </div>

          {/* SOCIAL SHARES & QR ACCESS */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-xl grid grid-cols-2 gap-4 items-center">
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/60 block">
                {t.share} SESSION
              </span>
              <button
                onClick={handleCopyLink}
                className="w-full py-2 bg-black hover:bg-neutral-950 border border-white/10 text-white rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer transition"
              >
                <span>{copiedLink ? t.copied : t.copyLink}</span>
              </button>
              <div className="flex gap-1.5 justify-start">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[#bcff00] transition"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                </a>
                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[#bcff00] transition"
                >
                  <Instagram className="w-3.5 h-3.5" />
                </button>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[#bcff00] transition"
                >
                  <Facebook className="w-3.5 h-3.5 fill-current" />
                </a>
              </div>
            </div>

            <div className="flex flex-col items-center border-l border-white/10 pl-4 space-y-1.5">
              <div className="w-20 h-20 bg-white rounded-xl p-1.5 shadow flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.href)}`}
                  alt="Mobile QR"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[9px] font-medium text-white/60 text-center leading-tight">
                Scan instant mobile download
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* FIXED MOBILE BAR WIDGET */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-black/85 backdrop-blur-md border-t border-white/10 z-40 shadow-xl flex items-center justify-between">
        <div className="text-left max-w-[50%]">
          <span className="text-[8px] font-mono font-bold uppercase text-[#bcff00] block tracking-wider truncate">
            {photo.id}
          </span>
          <span className="text-xs font-bold text-white block truncate leading-tight">
            {event?.name || "Premium Output"}
          </span>
        </div>
        <button
          onClick={handleDownloadAllZip}
          className="px-4 py-2.5 bg-[#bcff00] text-black rounded-lg text-xs font-black uppercase tracking-wider shadow cursor-pointer transition"
        >
          Download ZIP
        </button>
      </div>

      {/* LIGHTBOX STAGES */}
      <AnimatePresence>
        {isImageModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col justify-between p-4"
          >
            <div className="flex items-center justify-between z-50">
              <span className="text-white/60 font-mono text-[10px] uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-full font-bold">
                {t.preview} • {photo.templateName}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setZoomScale((p) => Math.min(p + 0.3, 3))}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomScale((p) => Math.max(p - 0.3, 1))}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotateAngle((p) => (p + 90) % 360)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setZoomScale(1);
                    setRotateAngle(0);
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsImageModalOpen(false)}
                  className="px-3 py-1.5 bg-[#bcff00] text-black font-mono text-[10px] uppercase font-black rounded-full cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
              <div
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotateAngle}deg)`,
                }}
                className="max-h-[75vh] max-w-[85vw] flex items-center justify-center transition-transform duration-150 select-none"
              >
                <img
                  src={photo.url}
                  alt="Stage display"
                  className="max-h-[70vh] max-w-[80vw] object-contain rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </motion.div>
        )}

        {selectedPhotoIndex !== null && photo?.meta?.rawPhotos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col justify-between p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-white/60 font-mono text-[10px] uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-full font-bold">
                POSE {selectedPhotoIndex + 1} of {photo.meta.rawPhotos.length}
              </span>
              <button
                onClick={() => setSelectedPhotoIndex(null)}
                className="px-3 py-1.5 bg-[#bcff00] text-black font-mono text-[10px] uppercase font-black rounded-full cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="flex-1 flex items-center justify-between relative">
              <button
                disabled={selectedPhotoIndex === 0}
                onClick={() =>
                  setSelectedPhotoIndex((p) =>
                    p !== null && p > 0 ? p - 1 : p,
                  )
                }
                className="p-2 bg-white/5 border border-white/10 rounded-full text-white disabled:opacity-25 absolute left-2 cursor-pointer z-10"
              >
                <ChevronLeft className="w-5 h-5 text-[#bcff00]" />
              </button>
              <div className="w-full h-full flex items-center justify-center p-4">
                <img
                  src={photo.meta.rawPhotos[selectedPhotoIndex]}
                  alt="Portrait capture"
                  className="max-h-[65vh] max-w-[75vw] object-contain rounded-xl shadow-2xl"
                />
              </div>
              <button
                disabled={
                  selectedPhotoIndex === photo.meta.rawPhotos.length - 1
                }
                onClick={() =>
                  setSelectedPhotoIndex((p) =>
                    p !== null && p < photo.meta.rawPhotos.length - 1
                      ? p + 1
                      : p,
                  )
                }
                className="p-2 bg-white/5 border border-white/10 rounded-full text-white disabled:opacity-25 absolute right-2 cursor-pointer z-10"
              >
                <ChevronRight className="w-5 h-5 text-[#bcff00]" />
              </button>
            </div>
            <div className="p-2 flex flex-col items-center justify-center gap-1">
              <button
                onClick={() =>
                  downloadFile(
                    photo.meta!.rawPhotos![selectedPhotoIndex!],
                    `Pose_${selectedPhotoIndex! + 1}.jpg`,
                  )
                }
                className="px-5 py-2.5 bg-[#bcff00] text-black font-mono text-[10px] uppercase font-black rounded-xl flex items-center gap-1 shadow cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />{" "}
                <span>Download Pose #{selectedPhotoIndex + 1}</span>
              </button>
            </div>
          </motion.div>
        )}

        {isProgressModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm bg-black/90 border border-white/15 p-6 rounded-2xl text-center space-y-4 shadow-2xl">
              <h4 className="text-sm font-black text-white tracking-wider uppercase">
                {zipProgress.percent === 100 ? t.success : t.generatingZip}
              </h4>
              <div className="relative pt-1 text-left">
                <div className="flex items-center justify-between text-[10px] font-mono mb-1 font-bold">
                  <span className="text-[#bcff00] flex items-center gap-1">
                    {zipProgress.percent < 100 && (
                      <Loader2 className="w-3 h-3 animate-spin text-[#bcff00]" />
                    )}
                    {zipProgress.status}
                  </span>
                  <span className="text-white">{zipProgress.percent}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#bcff00] to-emerald-400 transition-all duration-200"
                    style={{ width: `${zipProgress.percent}%` }}
                  />
                </div>
              </div>
              {zipProgress.percent === 100 && (
                <div className="flex items-center justify-center gap-1 text-[#bcff00] text-[10px] font-mono font-bold uppercase tracking-wider pt-1">
                  <CheckCircle2 className="w-4 h-4 text-black fill-[#bcff00]" />{" "}
                  <span>{t.downloadStarted}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
