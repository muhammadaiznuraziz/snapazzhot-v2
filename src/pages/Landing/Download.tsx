import React, { useState, useEffect } from "react";
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
  CheckCircle2,
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
              rawPhotos: Array.isArray(rawMeta.rawPhotos)
                ? rawMeta.rawPhotos
                : [],
            },
          });
        } else {
          setPhoto(null);
        }
      } catch (err) {
        console.error("Failed to load session:", err);
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
      console.error("Download failure:", err);
    }
  };

  const handleDownloadAllZip = async () => {
    if (!photo) return;
    setIsDownloading(true);
    setZipProgress({ percent: 10, status: "Preparing files..." });

    try {
      const zip = new JSZip();
      let step = 10;

      // 1. Photostrip
      if (photo.url) {
        const res = await fetch(photo.url);
        const blob = await res.blob();
        zip.file(`Photostrip_${photo.id}.png`, blob);
        step += 25;
        setZipProgress({ percent: step, status: "Packaging Photo Strip..." });
      }

      // 2. GIF
      if (photo.meta?.gifUrl) {
        const res = await fetch(photo.meta.gifUrl);
        const blob = await res.blob();
        zip.file(`Animation_${photo.id}.gif`, blob);
        step += 20;
        setZipProgress({ percent: step, status: "Packaging GIF..." });
      }

      // 3. BTS Video
      if (photo.meta?.videoUrl) {
        const res = await fetch(photo.meta.videoUrl);
        const blob = await res.blob();
        zip.file(`BTS_Video_${photo.id}.mp4`, blob);
        step += 25;
        setZipProgress({ percent: step, status: "Packaging Video..." });
      }

      // 4. Raw Photos
      if (photo.meta?.rawPhotos && photo.meta.rawPhotos.length > 0) {
        const rawFolder = zip.folder("raw_photos");
        for (let i = 0; i < photo.meta.rawPhotos.length; i++) {
          const imgUrl = photo.meta.rawPhotos[i];
          const res = await fetch(imgUrl);
          const blob = await res.blob();
          rawFolder?.file(`Photo_${i + 1}.png`, blob);
        }
      }

      setZipProgress({ percent: 90, status: "Compressing Zip Archive..." });
      const zipBlob = await zip.generateAsync({ type: "blob" });

      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `SnapAzzHot_${photo.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

      setZipProgress({ percent: 100, status: "Complete!" });
      setTimeout(() => setIsDownloading(false), 1200);
    } catch (err) {
      console.error("ZIP Generation Error:", err);
      setIsDownloading(false);
    }
  };

  // Build Env Guardrail
  if (!isEnvValid) {
    return (
      <div className="min-h-screen bg-slate-950 text-red-400 p-6 flex flex-col items-center justify-center text-center">
        <div className="bg-red-950/30 border border-red-900/50 backdrop-blur-xl p-8 rounded-3xl max-w-md w-full shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-white">
            Build Environment Missing
          </h2>
          <p className="text-sm text-slate-300 mb-4">
            Required Supabase environment variables are missing from the build
            configuration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 sm:p-8 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[400px] h-[200px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-2xl mx-auto z-10 space-y-10">
        {/* Header & Search Section */}
        <header className="text-center space-y-6 pt-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-inner"
          >
            <span className="font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 text-sm">
              SNAPAZZHOT
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
              Download Your Memories{" "}
              <Sparkles className="w-6 h-6 text-amber-400 fill-amber-400" />
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              All of your photobooth memories are ready. Download your photos,
              GIF, and BTS video.
            </p>
          </motion.div>

          {/* Download Code Search Form */}
          <motion.form
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 max-w-md mx-auto pt-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter Session / Download Code"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3.5 pl-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-lg backdrop-blur-md"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2 shrink-0"
            >
              Search
            </button>
          </motion.form>
        </header>

        {/* Content Section */}
        {loading ? (
          /* Skeleton Loader */
          <div className="space-y-8 animate-pulse">
            <div className="w-full h-96 bg-slate-900/60 border border-slate-800/80 rounded-[24px]" />
            <div className="w-full h-48 bg-slate-900/60 border border-slate-800/80 rounded-[24px]" />
          </div>
        ) : photo ? (
          /* Valid Session View */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            {/* 1. Large Photo Strip Preview */}
            {photo.url && (
              <section className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-4 sm:p-6 rounded-[24px] shadow-2xl">
                <div className="relative max-w-sm mx-auto overflow-hidden rounded-2xl group shadow-2xl bg-black/40">
                  <img
                    src={photo.url}
                    alt="Photostrip Preview"
                    className="w-full h-auto object-contain rounded-2xl transform transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
              </section>
            )}

            {/* 2. GIF Preview */}
            {photo.meta?.gifUrl && (
              <section className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-4 sm:p-6 rounded-[24px] shadow-2xl space-y-4">
                <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-400" /> Animated GIF
                </h3>
                <div className="relative max-w-sm mx-auto overflow-hidden rounded-2xl bg-black/40 shadow-xl">
                  <img
                    src={photo.meta.gifUrl}
                    alt="Animated GIF Preview"
                    className="w-full h-auto object-contain rounded-2xl"
                  />
                </div>
              </section>
            )}

            {/* 3. Behind The Scene Video Preview */}
            {photo.meta?.videoUrl && (
              <section className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-4 sm:p-6 rounded-[24px] shadow-2xl space-y-4">
                <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-2">
                  <Video className="w-4 h-4 text-emerald-400" /> Behind The
                  Scenes
                </h3>
                <div className="relative max-w-md mx-auto overflow-hidden rounded-2xl bg-black/60 shadow-xl border border-slate-800">
                  <video
                    src={photo.meta.videoUrl}
                    controls
                    playsInline
                    className="w-full h-auto rounded-2xl"
                  />
                </div>
              </section>
            )}

            {/* 4. Photo Gallery Grid */}
            {photo.meta?.rawPhotos && photo.meta.rawPhotos.length > 0 && (
              <section className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-4 sm:p-6 rounded-[24px] shadow-2xl space-y-4">
                <h3 className="text-xs uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" /> Photo
                  Gallery
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photo.meta.rawPhotos.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square overflow-hidden rounded-xl bg-slate-950 border border-slate-800 group shadow-md"
                    >
                      <img
                        src={img}
                        alt={`Raw capture ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. Download Section */}
            <section className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl p-6 rounded-[24px] shadow-2xl space-y-4">
              {/* Progress Bar overlay if zipping */}
              <AnimatePresence>
                {isDownloading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2 overflow-hidden"
                  >
                    <div className="flex justify-between text-xs font-medium text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        {zipProgress.status}
                      </span>
                      <span className="text-indigo-400">
                        {zipProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${zipProgress.percent}%` }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Primary Action Button */}
              <button
                onClick={handleDownloadAllZip}
                disabled={isDownloading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-base rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>Download Everything (.zip)</span>
              </button>

              {/* Secondary Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                {photo.url && (
                  <button
                    onClick={() =>
                      triggerSingleDownload(
                        photo.url,
                        `Photostrip_${photo.id}.png`,
                      )
                    }
                    className="py-3 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    Download Photos
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
                    className="py-3 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Film className="w-4 h-4 text-purple-400" />
                    Download GIF
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
                    className="py-3 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Video className="w-4 h-4 text-emerald-400" />
                    Download Video
                  </button>
                )}
              </div>
            </section>
          </motion.div>
        ) : (
          /* Centered Error State Card */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/50 border border-slate-800/80 backdrop-blur-xl p-8 sm:p-12 rounded-[24px] text-center max-w-md mx-auto space-y-4 shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Memories Not Found</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              The session code you provided is invalid, expired, or unavailable.
              Please check the code and search again.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
