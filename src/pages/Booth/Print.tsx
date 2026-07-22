import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { BoothContextType } from "../../layouts/BoothLayout";
import {
  Image as ImageIcon,
  Video,
  ArrowRight,
  Loader2,
  Globe,
  Film,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../../contexts/AppContext";
import { renderMedia } from "../../utils/render";
import { supabase } from "../../lib/supabaseClient";

// Import helper filter dari layout context
import { getCanvasFilterString } from "../../layouts/BoothLayout";

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
        .catch((err) => console.warn("Video playback interrupted:", err));
    }

    const renderLoop = () => {
      if (!active) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = getCanvasFilterString(filterId);

      // JIKA ADA VIDEO: Selalu render video (bahkan saat ended, video element menahan frame terakhirnya)
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

export default function BoothPrint() {
  const context = useOutletContext<BoothContextType>();
  const navigate = useNavigate();
  const { templates, activeEvent } = useApp() as any;

  const {
    compiledPhotoRecord,
    sessionGifUrl,
    sessionVideoUrl,
    sessionVideoUrls,
    selectedFrameId,
    capturedFrames,
    frameFilters,
    mirror,
    zoom,
  } = context;

  // State Fitur Utama Halaman Print
  const [activeTab, setActiveTab] = useState<"template" | "gif" | "bts">(
    "template",
  );
  const [isPublic, setIsPublic] = useState(true);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    if (!previewContainerRef.current) return;
    const updateDimensions = () => {
      const rect = previewContainerRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!compiledPhotoRecord && capturedFrames.length === 0) {
      navigate("/booth");
    }
  }, [compiledPhotoRecord, capturedFrames, navigate]);

  // Handle Toggle Sinkronisasi Database untuk Galeri Publik
  const handlePrivacyToggle = async (checked: boolean) => {
    if (!compiledPhotoRecord?.id) return;
    setIsPublic(checked);
    setUpdatingPrivacy(true);
    try {
      await supabase
        .from("event_photos")
        .update({ is_public: checked })
        .eq("id", compiledPhotoRecord.id);
    } catch (error) {
      console.error("Gagal memperbarui status privasi galeri:", error);
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  if (!compiledPhotoRecord) {
    return (
      <div className="w-full h-[100dvh] flex items-center justify-center bg-[#004ce5] text-white font-['Outfit']">
        <Loader2 className="w-8 h-8 animate-spin text-[#bcff00]" />
      </div>
    );
  }

  const template =
    templates?.find(
      (t: any) => t.id === selectedFrameId || t.id === activeEvent?.templateId,
    ) || templates?.[0];
  const elements = template ? [...(template.elements || [])] : [];
  const photoPositions = elements
    .filter((el: any) => el.type === "photo" && !el.hidden)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const canvasWidth = template?.canvasWidth || 1200;
  const canvasHeight = template?.canvasHeight || 800;

  // Perhitungan rasio kontainer agar pratinjau presisi dan tidak overflow
  const scale = Math.min(
    (dimensions.width - 32) / canvasWidth,
    (dimensions.height - 32) / canvasHeight,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-[100dvh] bg-[#004ce5] text-white flex p-4 lg:p-6 overflow-hidden font-['Outfit'] select-none relative box-border"
    >
      {/* BACKGROUND MATRIX GRID */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />

      {/* GRID LAYOUT UTAMA (2-KOLOM DESKTOP / 1-KOLOM MOBILE) */}
      <div className="w-full h-full flex flex-col lg:flex-row gap-5 lg:gap-6 relative z-10 overflow-y-auto lg:overflow-hidden min-h-0">
        {/* KOLOM KIRI: PREVIEW UTAMA (70-75% DESKTOP) */}
        <div
          ref={previewContainerRef}
          className="flex-1 min-h-[380px] lg:min-h-0 flex items-center justify-center p-4 relative overflow-hidden shadow-2xl"
        >
          <AnimatePresence mode="wait">
            {activeTab === "template" && (
              <motion.div
                key="template"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: `${canvasWidth * scale}px`,
                  height: `${canvasHeight * scale}px`,
                }}
                className="shadow-2xl relative bg-neutral-900  overflow-hidden flex items-center justify-center"
              >
                <img
                  src={compiledPhotoRecord.url}
                  alt="Compiled Print Layout"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </motion.div>
            )}

            {activeTab === "gif" && sessionGifUrl && (
              <motion.div
                key="gif"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full max-w-full max-h-full aspect-video relative bg-neutral-900 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/10"
              >
                <img
                  src={sessionGifUrl}
                  alt="Looping Sesi GIF"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}

            {activeTab === "bts" && sessionVideoUrl && (
              <motion.div
                key="bts"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: `${canvasWidth * scale}px`,
                  height: `${canvasHeight * scale}px`,
                  backgroundColor: template?.themeColor || "#ffffff",
                  backgroundImage: template?.backgroundImage
                    ? `url(${template.backgroundImage})`
                    : undefined,
                  backgroundSize: "cover",
                }}
                className="shadow-2xl relative  overflow-hidden"
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
                    const imageUrl = capturedFrames[photoIdx] || "";
                    const videoUrl = sessionVideoUrls[photoIdx] || "";
                    const filterId = frameFilters[photoIdx] || "normal";

                    return (
                      <BtsSlot
                        key={el.id}
                        videoUrl={videoUrl}
                        imageUrl={imageUrl}
                        style={style}
                        borderRadius={el.borderRadius || 0}
                        mirror={mirror}
                        zoom={zoom}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* KOLOM KANAN: SIDEBAR ACTIONS (25-30% DESKTOP, ~340px - 360px) */}
        <div className="w-full lg:w-[340px] xl:w-[360px] shrink-0 bg-neutral-950/80 backdrop-blur-md border border-white/10 rounded-2xl lg:rounded-[24px] p-5 flex flex-col gap-5 shadow-2xl justify-between">
          <div className="flex flex-col gap-5 text-left">
            {/* SECTION 1: OUTPUT TYPE SELECTOR */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-[#bcff00] tracking-widest">
                TIPE TAMPILAN
              </span>
              <div className="flex flex-col gap-2 bg-neutral-900/80 p-1.5 border border-white/5 rounded-xl">
                <button
                  onClick={() => setActiveTab("template")}
                  className={`w-full px-4 py-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-3 cursor-pointer ${
                    activeTab === "template"
                      ? "bg-[#bcff00] text-black shadow-md"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span>Photostrip Layout</span>
                </button>

                {sessionGifUrl && (
                  <button
                    onClick={() => setActiveTab("gif")}
                    className={`w-full px-4 py-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-3 cursor-pointer ${
                      activeTab === "gif"
                        ? "bg-[#bcff00] text-black shadow-md"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Film className="w-4 h-4 shrink-0" />
                    <span>Looping GIF</span>
                  </button>
                )}

                {sessionVideoUrl && (
                  <button
                    onClick={() => setActiveTab("bts")}
                    className={`w-full px-4 py-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-3 cursor-pointer ${
                      activeTab === "bts"
                        ? "bg-[#bcff00] text-black shadow-md"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Video className="w-4 h-4 text-red-500 animate-pulse shrink-0" />
                    <span>Behind The Scenes</span>
                  </button>
                )}
              </div>
            </div>

            {/* SECTION 2: PUBLIC GALLERY CARD */}
            <div className="p-4 bg-neutral-900/80 border border-white/5 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#bcff00]/10 border border-[#bcff00]/20 rounded-lg shrink-0 mt-0.5">
                  <Globe className="w-4 h-4 text-[#bcff00]" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-white">
                    Galeri Publik
                  </h4>
                  <p className="text-[9px] text-white/50 leading-snug mt-0.5">
                    Tampilkan foto Anda di galeri komunitas publik.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isPublic}
                  disabled={updatingPrivacy}
                  onChange={(e) => handlePrivacyToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-800 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-neutral-400 peer-checked:after:bg-black after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#bcff00]"></div>
              </label>
            </div>
          </div>

          {/* SECTION 3: ACTION BUTTON (SELESAI - POSISI PALING BAWAH) */}
          <div className="pt-2 mt-auto">
            <button
              onClick={() => navigate("/booth/success")}
              className="w-full py-3.5 bg-[#bcff00] hover:bg-white text-black text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(188,255,0,0.2)]"
            >
              <span>Selesai</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
