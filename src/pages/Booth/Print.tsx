import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { BoothContextType } from "../../layouts/BoothLayout";
import {
  Printer,
  Mail,
  QrCode,
  Download,
  Image as ImageIcon,
  Video,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Check,
  Loader2,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../../contexts/AppContext";
import { renderMedia } from "../../utils/render";
import { supabase } from "../../lib/supabaseClient";

interface BtsSlotProps {
  key?: React.Key;
  videoUrl: string;
  imageUrl: string;
  style: React.CSSProperties;
  borderRadius?: number;
  mirror: boolean;
  zoom: number;
}

const BtsSlot = ({
  videoUrl,
  imageUrl,
  style,
  borderRadius = 0,
  mirror,
  zoom,
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
        .catch((err) => console.warn("Failed to play slot video", err));
    }

    let imgElement: HTMLImageElement | null = null;
    if (imageUrl) {
      imgElement = new Image();
      imgElement.src = imageUrl;
    }

    let isFrozenState = false;

    const renderLoop = () => {
      if (!active) return;

      let shouldFreeze = false;
      if (!videoElement) {
        shouldFreeze = true;
      } else {
        shouldFreeze =
          videoElement.ended ||
          (videoElement.duration &&
            videoElement.currentTime >= videoElement.duration - 0.1) ||
          false;
      }

      if (shouldFreeze !== isFrozenState) {
        isFrozenState = shouldFreeze;
        setIsFrozen(shouldFreeze);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

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
          mirror: false,
          zoom: zoom,
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
          mirror: false,
          zoom: zoom,
        });
      }

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
  }, [videoUrl, imageUrl, mirror, zoom]);

  return (
    <div
      className="absolute overflow-hidden"
      style={{ ...style, borderRadius: `${borderRadius}px` }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        style={{ borderRadius: `${borderRadius}px` }}
      />
    </div>
  );
};

export default function BoothPrint() {
  const context = useOutletContext<BoothContextType>();
  const navigate = useNavigate();

  const {
    activeEvent,
    compiledPhotoRecord,
    sessionGifUrl,
    sessionVideoUrl,
    sessionVideoUrls,
    selectedFrameId,
    sessionBtsCaptureTimes,
    capturedFrames,
    mirror,
    zoom,
  } = context;

  const { templates, fetchInitialData } = useApp() as any;

  const [activeTab, setActiveTab] = useState<"template" | "gif" | "bts">(
    "template",
  );
  const [email, setEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [printCopies, setPrintCopies] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  const [isPublic, setIsPublic] = useState(false);
  const [username, setUsername] = useState("Guest");
  const [savingPublic, setSavingPublic] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [gifRatio, setGifRatio] = useState<number>(16 / 9);

  const handleGifLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setGifRatio(img.naturalWidth / img.naturalHeight);
    }
  };

  useEffect(() => {
    if (!previewContainerRef.current) return;
    const updateDimensions = () => {
      if (!previewContainerRef.current) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(() => {
      updateDimensions();
    });
    observer.observe(previewContainerRef.current);

    window.addEventListener("resize", updateDimensions);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  const handleTogglePublic = async (checked: boolean) => {
    setIsPublic(checked);
    if (!compiledPhotoRecord) return;
    setSavingPublic(true);
    try {
      const { error } = await supabase
        .from("photos")
        .update({
          is_public: checked,
          username: checked ? username : "Guest",
        })
        .eq("id", compiledPhotoRecord.id);

      if (error) throw error;
      await fetchInitialData();
    } catch (e) {
      console.warn("Failed to update privacy settings", e);
    } finally {
      setSavingPublic(false);
    }
  };

  useEffect(() => {
    if (!compiledPhotoRecord || !isPublic) return;

    const delayDebounce = setTimeout(async () => {
      setSavingPublic(true);
      try {
        const { error } = await supabase
          .from("photos")
          .update({
            username: username || "Guest",
          })
          .eq("id", compiledPhotoRecord.id);

        if (error) throw error;
        await fetchInitialData();
      } catch (e) {
        console.warn("Failed to update username", e);
      } finally {
        setSavingPublic(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [username, isPublic, compiledPhotoRecord]);

  useEffect(() => {
    if (capturedFrames.length === 0 && !compiledPhotoRecord) {
      navigate("/booth");
    }
  }, [capturedFrames, compiledPhotoRecord, navigate]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compiledPhotoRecord || !email) return;

    setEmailSending(true);
    setEmailSent(false);

    try {
      const downloadUrl = new URL(
        compiledPhotoRecord.url,
        window.location.origin,
      ).toString();

      const { error } = await supabase
        .from("email_logs")
        .insert({
          id: `eml-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          email: email,
          photo_id: compiledPhotoRecord.id,
          download_url: downloadUrl,
          status: "pending",
        });

      if (error) throw error;

      setEmailSent(true);
      setEmail("");
      setTimeout(() => setEmailSent(false), 4000);
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim email: Database error.");
    } finally {
      setEmailSending(false);
    }
  };

  const handleTriggerPrint = async () => {
    if (!compiledPhotoRecord) return;
    setPrinting(true);
    setPrintSuccess(false);

    try {
      const { error } = await supabase
        .from("print_job_logs")
        .insert({
          id: `prt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          photo_id: compiledPhotoRecord.id,
          size: activeEvent?.layoutType === "strip" ? "2x6" : "4x6",
          copies: printCopies,
          status: "pending",
          printer_name: "Default Kiosk Printer",
        });

      if (error) throw error;

      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert("Layanan print offline atau error database.");
    } finally {
      setPrinting(false);
    }
  };

  const handleFinish = () => {
    navigate("/booth/success");
  };

  const template = templates?.find(
    (t: any) =>
      t.id === selectedFrameId ||
      t.id === activeEvent?.templateId ||
      t.id === activeEvent?.frameId ||
      t.id === `tpl-${selectedFrameId}` ||
      t.id === `tpl-${activeEvent?.templateId}` ||
      t.id === `tpl-${activeEvent?.frameId}`,
  );

  const elements = template ? [...(template.elements || [])] : [];
  const isCustom =
    activeEvent?.frameId === "custom" &&
    activeEvent?.layoutPositions &&
    activeEvent.layoutPositions.length > 0;
  const photoPositions = isCustom
    ? activeEvent.layoutPositions
    : elements.filter((el: any) => el.type === "photo" && !el.hidden);

  let canvasWidth = 1200;
  let canvasHeight = 800;

  if (template) {
    canvasWidth = template.canvasWidth || 1200;
    canvasHeight = template.canvasHeight || 800;
  } else {
    const isStrip = activeEvent?.layoutType === "strip";
    const isSingle = activeEvent?.layoutType === "single";
    if (isStrip) {
      canvasWidth = 600;
      canvasHeight = 1800;
    } else if (isSingle) {
      canvasWidth = 1200;
      canvasHeight = 900;
    }
  }

  const containerWidth = dimensions.width;
  const containerHeight = dimensions.height;
  const safeWidth = Math.max(100, containerWidth - 32);
  const safeHeight = Math.max(100, containerHeight - 32);

  const templateScaleFit = Math.min(
    safeWidth / canvasWidth,
    safeHeight / canvasHeight,
  );
  const templateScale = templateScaleFit * 0.75;

  let gifWidth = 0;
  let gifHeight = 0;
  const containerRatio = safeWidth / safeHeight;
  if (gifRatio > containerRatio) {
    gifWidth = safeWidth * 0.92;
    gifHeight = gifWidth / gifRatio;
  } else {
    gifHeight = safeHeight * 0.92;
    gifWidth = gifHeight * gifRatio;
  }

  let btsWidth = 0;
  let btsHeight = 0;
  const btsRatio = canvasWidth / canvasHeight;
  if (btsRatio > containerRatio) {
    btsWidth = safeWidth * 0.95;
    btsHeight = btsWidth / btsRatio;
  } else {
    btsHeight = safeHeight * 0.95;
    btsWidth = btsHeight * btsRatio;
  }

  const renderBtsElement = (el: any, canvasWidth: number) => {
    const style: React.CSSProperties = {
      position: "absolute",
      left: `${el.x}%`,
      top: `${el.y}%`,
      width: `${el.width}%`,
      height: `${el.height}%`,
      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
      opacity: el.opacity !== undefined ? el.opacity / 100 : undefined,
      zIndex: el.zIndex || 10,
    };

    if (el.type === "photo") {
      const photoIdx = photoPositions.findIndex(
        (item: any) => item.id === el.id,
      );
      const imageUrl = capturedFrames[photoIdx] || "";
      const videoUrl = sessionVideoUrls[photoIdx] || "";

      return (
        <BtsSlot
          key={el.id}
          videoUrl={videoUrl}
          imageUrl={imageUrl}
          style={style}
          borderRadius={el.borderRadius || 0}
          mirror={mirror}
          zoom={zoom}
        />
      );
    }

    if (el.type === "text" || el.type === "meta") {
      let text = el.textValue || el.name;
      if (el.type === "meta") {
        if (el.name.toLowerCase().includes("tanggal")) {
          text = new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
        } else if (el.name.toLowerCase().includes("jam")) {
          text = new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          });
        } else if (el.name.toLowerCase().includes("event")) {
          text = activeEvent?.name || "";
        }
      }

      return (
        <div
          key={el.id}
          style={{
            ...style,
            color: el.fontColor || "#000000",
            fontSize: `${((el.fontSize || 24) / canvasWidth) * 100}cqw`,
            fontWeight: "bold",
            whiteSpace: "nowrap",
          }}
          className="flex items-center justify-start overflow-hidden font-sans"
        >
          {text}
        </div>
      );
    }

    if (el.type === "logo" || el.type === "decor") {
      if (el.textValue && el.textValue.startsWith("data:image")) {
        return (
          <img
            key={el.id}
            src={el.textValue}
            alt={el.name}
            style={style}
            className="object-contain"
          />
        );
      }
      return (
        <div
          key={el.id}
          style={{
            ...style,
            border: "1px solid rgba(0,0,0,0.08)",
            backgroundColor: "rgba(0,0,0,0.02)",
          }}
          className="flex items-center justify-center text-[8px] font-['Outfit'] font-bold uppercase tracking-wider text-center"
        >
          {el.name}
        </div>
      );
    }

    if (el.type === "qr") {
      return (
        <div
          key={el.id}
          style={{
            ...style,
            backgroundColor: "#ffffff",
            padding: "4px",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
          className="flex flex-col items-center justify-center overflow-hidden"
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
              new URL(
                compiledPhotoRecord.url,
                window.location.origin,
              ).toString(),
            )}`}
            alt="QR code"
            className="w-full h-full object-contain"
          />
        </div>
      );
    }

    return null;
  };

  const renderBtsFramed = (btsWidth: number, btsHeight: number) => {
    if (!sessionVideoUrl) return null;

    let canvasWidth = 1200;
    let canvasHeight = 800;

    if (template) {
      canvasWidth = template.canvasWidth || 1200;
      canvasHeight = template.canvasHeight || 800;
    } else {
      const isStrip = activeEvent?.layoutType === "strip";
      const isSingle = activeEvent?.layoutType === "single";
      if (isStrip) {
        canvasWidth = 600;
        canvasHeight = 1800;
      } else if (isSingle) {
        canvasWidth = 1200;
        canvasHeight = 900;
      }
    }

    const sortedElements = elements.sort(
      (a, b) => (a.zIndex || 0) - (b.zIndex || 0),
    );
    const bgImage = template?.backgroundImage || activeEvent?.backgroundImage;
    const bgColor = activeEvent?.themeColor || "#ffffff";

    return (
      <div
        className="relative rounded overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center select-none"
        style={{
          width: `${btsWidth}px`,
          height: `${btsHeight}px`,
          backgroundColor: bgColor,
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          containerType: "inline-size",
        }}
      >
        {sortedElements.map((el) => {
          if (el.hidden || el.renderOnTop) return null;
          return renderBtsElement(el, canvasWidth);
        })}

        {isCustom &&
          photoPositions?.map((pos: any, idx: number) => {
            const imageUrl = capturedFrames[idx] || "";
            const videoUrl = sessionVideoUrls[idx] || "";
            return (
              <BtsSlot
                key={`custom-photo-${idx}`}
                videoUrl={videoUrl}
                imageUrl={imageUrl}
                style={{
                  position: "absolute",
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  width: `${pos.width}%`,
                  height: `${pos.height}%`,
                }}
                borderRadius={pos.borderRadius || 0}
                mirror={mirror}
                zoom={zoom}
              />
            );
          })}

        {template?.framePng && (
          <img
            src={template.framePng}
            alt="Frame Overlay"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none z-30"
          />
        )}

        {sortedElements.map((el) => {
          if (el.hidden || !el.renderOnTop) return null;
          return renderBtsElement(el, canvasWidth);
        })}
      </div>
    );
  };

  if (!compiledPhotoRecord) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="w-full h-[100dvh] bg-[#004ce5] text-white flex flex-col lg:flex-row p-4 sm:p-6 md:p-8 gap-4 md:gap-6 overflow-hidden font-['Outfit'] box-border relative select-none"
    >
      {/* Background Matrix Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />

      {/* LEFT COLUMN: VISUAL MEDIA PREVIEW CANVAS */}
      <div className="flex-1 flex flex-col bg-neutral-900 border border-white/15 rounded-[20px] p-4 sm:p-6 shadow-2xl min-h-0 overflow-hidden h-full relative z-10">
        {/* Toggleable view tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6 shrink-0">
          <button
            onClick={() => setActiveTab("template")}
            className={`px-4 py-2.5 font-['Outfit'] text-[9px] uppercase tracking-widest font-black rounded-xl border transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
              activeTab === "template"
                ? "bg-[#bcff00] border-transparent text-black"
                : "bg-black/40 border-white/5 text-white/60 hover:text-white hover:border-white/15"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Template Frame Layout
          </button>

          {sessionGifUrl && (
            <button
              onClick={() => setActiveTab("gif")}
              className={`px-4 py-2.5 font-['Outfit'] text-[9px] uppercase tracking-widest font-black rounded-xl border transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                activeTab === "gif"
                  ? "bg-[#bcff00] border-transparent text-black"
                  : "bg-black/40 border-white/5 text-white/60 hover:text-white hover:border-white/15"
              }`}
            >
              <Video className="w-4 h-4" />
              Looping GIF
            </button>
          )}

          {sessionVideoUrl && (
            <button
              onClick={() => setActiveTab("bts")}
              className={`px-4 py-2.5 font-['Outfit'] text-[9px] uppercase tracking-widest font-black rounded-xl border transition cursor-pointer flex items-center gap-1.5 shadow-sm ${
                activeTab === "bts"
                  ? "bg-[#bcff00] border-transparent text-black"
                  : "bg-black/40 border-white/5 text-white/60 hover:text-white hover:border-white/15"
              }`}
            >
              <Video className="w-4 h-4 text-red-500 animate-pulse" />
              Behind The Scenes
            </button>
          )}
        </div>

        {/* Dynamic Display Canvas */}
        <div
          ref={previewContainerRef}
          className="flex-1 flex items-center justify-center relative bg-black/40 rounded-xl border border-white/10 p-4 min-h-0 overflow-hidden shadow-inner"
        >
          <AnimatePresence mode="wait">
            {activeTab === "template" && (
              <motion.div
                key="template"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="relative flex flex-col items-center justify-center"
                style={{
                  width: `${canvasWidth * templateScale}px`,
                  height: `${canvasHeight * templateScale}px`,
                }}
              >
                <div className="w-full h-full bg-black rounded overflow-hidden shadow-2xl border border-white/10 relative flex items-center justify-center">
                  <img
                    src={compiledPhotoRecord.url}
                    alt="Compiled Print Layout"
                    className="w-full h-full object-contain select-none"
                  />
                </div>
              </motion.div>
            )}

            {activeTab === "gif" && sessionGifUrl && (
              <motion.div
                key="gif"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="relative flex flex-col items-center justify-center"
                style={{
                  width: `${gifWidth}px`,
                  height: `${gifHeight}px`,
                }}
              >
                <div className="w-full h-full bg-black rounded overflow-hidden shadow-2xl relative border border-white/10 flex items-center justify-center">
                  <img
                    src={sessionGifUrl}
                    onLoad={handleGifLoad}
                    alt="Compiled GIF Animation"
                    className="w-full h-full object-contain select-none"
                  />
                </div>
              </motion.div>
            )}

            {activeTab === "bts" && sessionVideoUrl && (
              <motion.div
                key="bts"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="relative flex flex-col items-center justify-center"
                style={{
                  width: `${btsWidth}px`,
                  height: `${btsHeight}px`,
                }}
              >
                {renderBtsFramed(btsWidth, btsHeight)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4.5 bg-white/5 border border-white/10 rounded-[15px] space-y-3 mt-4 shrink-0">
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            <Globe className="w-4 h-4 text-white/40" />
            Pengaturan Galeri Publik
          </span>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => handleTogglePublic(e.target.checked)}
              className="mt-0.5 rounded border-white/20 text-[#bcff00] focus:ring-[#bcff00] cursor-pointer bg-black/40"
            />
            <div className="space-y-1 select-none">
              <p className="text-[9px] text-white/50 leading-relaxed font-sans font-medium">
                Jika dicentang, foto Anda akan otomatis dibagikan dan tampil di
                galeri komunitas halaman utama.
              </p>
            </div>
          </label>

          {isPublic && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2 pt-2 border-t border-white/10 overflow-hidden"
            >
              <label className="block text-[9px] font-mono font-bold text-white/40 uppercase tracking-wider">
                Nama Pengguna (Opsional):
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Guest / Andi & Budi..."
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-[#bcff00] text-white placeholder-white/30"
              />
            </motion.div>
          )}

          {savingPublic && (
            <div className="text-[8px] font-mono text-[#bcff00] flex items-center gap-1 pt-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Menyimpan preferensi...
            </div>
          )}
        </div>

        {/* button */}
        <motion.button
          onClick={handleFinish}
          whileHover={{
            y: -1,
            scale: 1.02,
            boxShadow: "0 8px 20px rgba(188,255,0,0.3)",
          }}
          whileTap={{ scale: 0.98 }}
          className="absolute top-4 right-4 z-20 px-3 py-2 bg-[#bcff00] hover:bg-white text-black font-['Outfit'] font-black uppercase tracking-wider text-[9px] rounded-lg shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          SELESAI
          <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
        </motion.button>
      </div>
    </motion.div>
  );
}
