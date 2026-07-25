import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { BoothContextType } from "../../layouts/BoothLayout";
import {
  Image as ImageIcon,
  Video,
  ArrowRight,
  Loader2,
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
  const { templates, activeEvent, fetchInitialData } = useApp() as any;

  const {
    compiledPhotoRecord,
    setCompiledPhotoRecord,
    sessionGifUrl,
    sessionVideoUrl,
    sessionVideoUrls,
    selectedFrameId,
    capturedFrames,
    frameFilters,
    mirror,
    zoom,
  } = context;

  // State Tab Tampilan Output
  const [activeTab, setActiveTab] = useState<"template" | "gif" | "bts">(
    "template",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Handler saat user klik tombol Selesai (Tampilkan foto di galeri publik)
  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Update photo record menjadi publik agar tampil di galeri
      if (compiledPhotoRecord?.id) {
        const { error } = await supabase
          .from("photos")
          .update({ is_public: true })
          .eq("id", compiledPhotoRecord.id);

        if (error) throw error;

        // Sync local context state
        if (setCompiledPhotoRecord) {
          setCompiledPhotoRecord((prev: any) =>
            prev ? { ...prev, isPublic: true } : null
          );
        }

        // Refresh data galeri publik
        await fetchInitialData(true);
      }

      navigate("/booth/success");
    } catch (err) {
      console.error("Gagal menyimpan otomatis ke galeri:", err);
      // Tetap alihkan user agar pengalaman kiosk tidak terhenti
      navigate("/booth/success");
    } finally {
      setIsSubmitting(false);
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

      {/* GRID LAYOUT UTAMA */}
      <div className="w-full h-full flex flex-col lg:flex-row gap-5 lg:gap-6 relative z-10 overflow-y-auto lg:overflow-hidden min-h-0">
        {/* KOLOM KIRI: PREVIEW UTAMA */}
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
                className="shadow-2xl relative bg-neutral-900 overflow-hidden flex items-center justify-center"
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
                className="shadow-2xl relative overflow-hidden"
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

        {/* KOLOM KANAN: SIDEBAR ACTIONS */}
        <div className="w-full lg:w-[340px] xl:w-[360px] shrink-0 bg-neutral-950/80 backdrop-blur-md border border-white/10 rounded-2xl lg:rounded-[24px] p-5 flex flex-col gap-5 shadow-2xl justify-between">
          <div className="flex flex-col gap-5 text-left">
            {/* TIPE TAMPILAN SELECTOR */}
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
          </div>

          {/* ACTION BUTTON (SELESAI) */}
          <div className="pt-2 mt-auto">
            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#bcff00] hover:bg-white disabled:bg-neutral-800 disabled:text-white/40 text-black text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(188,255,0,0.2)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <span>Selesai</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
