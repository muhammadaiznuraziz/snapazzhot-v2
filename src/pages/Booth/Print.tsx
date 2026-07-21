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
  const [isFrozen, setIsFrozen] = useState(false);

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

    let imgElement: HTMLImageElement | null = null;
    if (imageUrl) {
      imgElement = new Image();
      imgElement.src = imageUrl;
    }

    let isFrozenState = false;

    const renderLoop = () => {
      if (!active) return;

      let shouldFreeze = !videoElement
        ? true
        : videoElement.ended ||
          (videoElement.duration &&
            videoElement.currentTime >= videoElement.duration - 0.1) ||
          false;

      if (shouldFreeze !== isFrozenState) {
        isFrozenState = shouldFreeze;
        setIsFrozen(shouldFreeze);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // SINKRONISASI FILTER WARNA KE CANVAS BTS PREVIEW
      ctx.filter = getCanvasFilterString(filterId);

      if (
        isFrozenState &&
        imgElement &&
        imgElement.complete &&
        imgElement.naturalWidth
      ) {
        renderMedia({
          ctx,
          source: imgElement,
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
          objectFit: "cover",
          mirror,
          zoom,
        });
      } else if (videoElement) {
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

      ctx.filter = "none"; // Reset filter state
      requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => {
      active = false;
      if (videoElement) {
        videoElement.pause();
        videoElement.src = "";
        videoElement.load();
      }
    };
  }, [videoUrl, imageUrl, mirror, zoom, filterId]);

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
      <div className="w-full h-[100dvh] flex items-center justify-center bg-[#004ce5] text-white">
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

  // Perhitungan rasio kontainer agar pratinjau presisi dan tidak overflow dari layar kiosk
  const scale = Math.min(
    (dimensions.width - 40) / canvasWidth,
    (dimensions.height - 40) / canvasHeight,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-[100dvh] bg-[#004ce5] text-white flex flex-col p-4 md:p-6 overflow-hidden font-['Outfit'] select-none relative"
    >
      {/* WRAPPER UTAMA */}
      <div className="flex-1 min-h-0 bg-neutral-950 border border-white/10 rounded-[24px] flex flex-col overflow-hidden p-4 md:p-6 relative">
        {/* HEADER TABS & ACTION BUTTON */}
        <div className="flex flex-row items-center justify-between gap-4 mb-6 shrink-0 z-20">
          <div className="flex bg-neutral-900 border border-white/5 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab("template")}
              className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition flex items-center gap-2 ${activeTab === "template" ? "bg-[#bcff00] text-black" : "text-white/60 hover:text-white"}`}
            >
              <ImageIcon className="w-4 h-4" /> Template Frame Layout
            </button>

            {sessionGifUrl && (
              <button
                onClick={() => setActiveTab("gif")}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition flex items-center gap-2 ${activeTab === "gif" ? "bg-[#bcff00] text-black" : "text-white/60 hover:text-white"}`}
              >
                <Film className="w-4 h-4" /> Looping GIF
              </button>
            )}

            {sessionVideoUrl && (
              <button
                onClick={() => setActiveTab("bts")}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition flex items-center gap-2 ${activeTab === "bts" ? "bg-[#bcff00] text-black" : "text-white/60 hover:text-white"}`}
              >
                <Video className="w-4 h-4 text-red-500 animate-pulse" /> Behind
                The Scenes
              </button>
            )}
          </div>

          <button
            onClick={() => navigate("/booth/success")}
            className="px-6 py-3 bg-[#bcff00] hover:bg-white text-black text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center gap-2 shadow-lg"
          >
            SELESAI <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* CONTAINER PREVIEW INTERAKTIF */}
        <div
          ref={previewContainerRef}
          className="flex-1 flex items-center justify-center bg-black/50 border border-white/5 rounded-2xl p-4 overflow-hidden relative"
        >
          <AnimatePresence mode="wait">
            {activeTab === "template" && (
              <motion.div
                key="template"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: `${canvasWidth * scale}px`,
                  height: `${canvasHeight * scale}px`,
                }}
                className="shadow-2xl relative bg-neutral-900 rounded overflow-hidden"
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
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: `${canvasWidth * scale}px`,
                  height: `${canvasHeight * scale}px`,
                }}
                className="shadow-2xl relative bg-neutral-900 rounded overflow-hidden flex items-center justify-center"
              >
                <img
                  src={sessionGifUrl}
                  alt="Looping Sesi GIF"
                  className="w-full h-full object-contain"
                />
              </motion.div>
            )}

            {activeTab === "bts" && sessionVideoUrl && (
              <motion.div
                key="bts"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
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
                className="shadow-2xl relative rounded overflow-hidden"
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

        {/* BOTTOM PANEL: PENGATURAN GALERI PUBLIK */}
        <div className="mt-4 p-4 bg-neutral-900 border border-white/5 rounded-xl flex flex-col text-left shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#bcff00]/10 rounded-lg">
                <Globe className="w-4 h-4 text-[#bcff00]" />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-white">
                  Pengaturan Galeri Publik
                </h4>
                <p className="text-[10px] text-white/50 mt-0.5">
                  Jika dicentang, foto Anda akan otomatis dibagikan dan tampil
                  di galeri komunitas halaman utama.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
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
      </div>
    </motion.div>
  );
}
