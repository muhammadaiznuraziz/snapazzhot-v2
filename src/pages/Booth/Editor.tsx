import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { BoothContextType } from "../../layouts/BoothLayout";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Check,
  Layers,
  Move,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";

const AVAILABLE_FILTERS = [
  { id: "normal", name: "Normal", class: "" },
  { id: "grayscale", name: "B&W Mono", class: "grayscale" },
  { id: "sepia", name: "Sepia Tone", class: "sepia" },
  {
    id: "vintage",
    name: "Vintage Warm",
    class: "contrast-[1.1] saturate-[0.8] sepia-[0.2]",
  },
  {
    id: "cool",
    name: "Cool Cyan",
    class: "saturate-[0.9] hue-rotate-[10deg] contrast-[1.05]",
  },
  { id: "vivid", name: "Vivid Glow", class: "saturate-[1.3] contrast-[1.1]" },
];

interface PositionTransform {
  x: number;
  y: number;
}

export default function BoothEditor() {
  const context = useOutletContext<BoothContextType>();
  const navigate = useNavigate();
  const { templates, activeEvent } = useApp() as any;

  const {
    capturedFrames,
    frameFilters,
    setFrameFilters,
    selectedFrameId,
    handleCompileLayout,
  } = context;

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [compiling, setCompiling] = useState(false);
  const [imageRatios, setImageRatios] = useState<Record<number, number>>({});
  const [isMobile, setIsMobile] = useState(false);

  // PosisiOffset per slot foto
  const [photoPositions, setPhotoPositions] = useState<
    Record<number, PositionTransform>
  >({});

  // Ref untuk mengelola Dragging
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const initialPhotoPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (capturedFrames.length === 0 && !compiling) {
      navigate("/booth");
    }
  }, [capturedFrames, compiling, navigate]);

  useEffect(() => {
    capturedFrames.forEach((src, idx) => {
      const img = new Image();
      img.onload = () => {
        setImageRatios((prev) => ({ ...prev, [idx]: img.width / img.height }));
      };
      img.src = src;
    });
  }, [capturedFrames]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const template =
    templates?.find(
      (t: any) =>
        t.id === selectedFrameId ||
        t.id === activeEvent?.templateId ||
        t.id === activeEvent?.frameId ||
        t.id === `tpl-${selectedFrameId}` ||
        t.id === `tpl-${activeEvent?.templateId}` ||
        t.id === `tpl-${activeEvent?.frameId}`,
    ) || templates?.[0];

  const canvasWidth = template?.canvasWidth || 1200;
  const canvasHeight = template?.canvasHeight || 800;
  const elements = template ? [...(template.elements || [])] : [];

  const rawPhotoElements = elements.filter(
    (el: any) => el.type === "photo" && !el.hidden,
  );
  const rows: any[][] = [];
  const sortedByY = [...rawPhotoElements].sort((a, b) => a.y - b.y);

  for (const el of sortedByY) {
    let foundRow = false;
    for (const r of rows) {
      const avgY = r.reduce((sum, item) => sum + item.y, 0) / r.length;
      if (Math.abs(avgY - el.y) < 10) {
        r.push(el);
        foundRow = true;
        break;
      }
    }
    if (!foundRow) {
      rows.push([el]);
    }
  }

  for (const r of rows) {
    r.sort((a, b) => a.x - b.x);
  }

  const photoElementsSorted = rows.flat();

  const mainRowRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });

  useEffect(() => {
    if (!mainRowRef.current) return;
    const updateDimensions = () => {
      if (!mainRowRef.current) return;
      const rect = mainRowRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(() => {
      updateDimensions();
    });
    observer.observe(mainRowRef.current);

    window.addEventListener("resize", updateDimensions);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [capturedFrames]);

  const safeWidth = dimensions.width || 800;
  const safeHeight = dimensions.height || 600;

  const mobileHeight = Math.max(260, safeHeight * 0.42);
  const scale = isMobile
    ? Math.min(mobileHeight / canvasHeight, (safeWidth - 32) / canvasWidth)
    : Math.min(
        (safeHeight - 32) / canvasHeight,
        (safeWidth - 380 - 24) / canvasWidth,
      );

  const previewScale = Math.min(scale, 1.0);
  const previewWidth = canvasWidth * previewScale;
  const previewHeight = canvasHeight * previewScale;

  const applyFilterToCurrent = (filterId: string) => {
    setFrameFilters((prev) => ({
      ...prev,
      [currentFrameIndex]: filterId,
    }));
  };

  const resetCurrentPosition = () => {
    setPhotoPositions((prev) => ({
      ...prev,
      [currentFrameIndex]: { x: 0, y: 0 },
    }));
  };

  // HANDLER DRAG UNTUK GESER POSISI FOTO
  const handleMouseDown = (
    e: React.MouseEvent | React.TouchEvent,
    idx: number,
  ) => {
    setCurrentFrameIndex(idx);
    isDraggingRef.current = true;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    dragStartPosRef.current = { x: clientX, y: clientY };
    initialPhotoPosRef.current = photoPositions[idx] || { x: 0, y: 0 };

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;

      const currentX =
        "touches" in moveEvent
          ? moveEvent.touches[0].clientX
          : moveEvent.clientX;
      const currentY =
        "touches" in moveEvent
          ? moveEvent.touches[0].clientY
          : moveEvent.clientY;

      const deltaX = (currentX - dragStartPosRef.current.x) / previewScale;
      const deltaY = (currentY - dragStartPosRef.current.y) / previewScale;

      setPhotoPositions((prev) => ({
        ...prev,
        [idx]: {
          x: initialPhotoPosRef.current.x + deltaX,
          y: initialPhotoPosRef.current.y + deltaY,
        },
      }));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleMouseMove);
    window.addEventListener("touchend", handleMouseUp);
  };

  const handleDone = async () => {
    if (compiling) return;
    setCompiling(true);
    try {
      const ok = await handleCompileLayout();
      if (ok) {
        navigate("/booth/print");
        return;
      }
      console.error(
        "handleCompileLayout() returned false. Aborting navigation.",
      );
      alert(
        "Gagal membuat layout final. Pastikan foto sudah berhasil diambil dan event aktif.",
      );
    } catch (err) {
      console.error(err);
      alert(
        "Kesalahan saat merender layout final. Lihat console untuk detail.",
      );
    } finally {
      setCompiling(false);
    }
  };

  if (compiling) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0038FF] flex flex-col items-center justify-center space-y-6 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,255,0,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(0,46,214,0.8),transparent_70%)] pointer-events-none" />
        <div className="relative z-10">
          <div className="w-16 h-16 border-4 border-[#CCFF00] border-t-transparent rounded-full animate-spin shadow-[0_0_25px_rgba(204,255,0,0.4)]" />
          <Sparkles className="w-6 h-6 text-[#CCFF00] absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="text-center space-y-2 max-w-md relative z-10">
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
            RENDERING FINAL LAYOUT...
          </h2>
          <p className="text-xs text-white/80 leading-relaxed font-bold tracking-wide uppercase">
            Sedang merender tata letak template beserta posisi dan filter retro
            pilihan Anda...
          </p>
        </div>
      </div>
    );
  }

  const currentFilter = frameFilters[currentFrameIndex] || "normal";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-[100dvh] flex flex-col bg-[#0038FF] text-white overflow-hidden select-none box-border relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,255,0,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(0,46,214,0.8),transparent_70%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />

      <div
        ref={mainRowRef}
        className="flex-1 min-h-0 flex flex-col md:flex-row items-stretch p-4 md:p-6 lg:p-8 gap-6 overflow-hidden relative z-10"
      >
        {/* PREVIEW CANVAS CONTAINER */}
        <div
          style={
            !isMobile
              ? { width: `${previewWidth + 32}px`, height: "100%" }
              : { width: "100%", height: `${previewHeight + 32}px` }
          }
          className="shrink-0 flex items-center justify-center select-none transition-all duration-300"
        >
          <div
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              transform: `scale(${previewScale})`,
              transformOrigin: "center center",
              position: "absolute",
              backgroundColor:
                activeEvent?.themeColor || template?.themeColor || "#ffffff",
              backgroundImage:
                template?.backgroundImage || activeEvent?.backgroundImage
                  ? `url(${template?.backgroundImage || activeEvent?.backgroundImage})`
                  : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            className="shadow-[0_25px_50px_rgba(0,0,0,0.35)] border border-white/20 relative overflow-hidden"
          >
            {elements.map((el: any) => {
              const style: React.CSSProperties = {
                position: "absolute",
                left: `${el.x}%`,
                top: `${el.y}%`,
                width: `${el.width}%`,
                height: `${el.height}%`,
                transform: el.rotation
                  ? `rotate(${el.rotation}deg)`
                  : undefined,
                opacity:
                  el.opacity !== undefined ? el.opacity / 100 : undefined,
                zIndex: el.zIndex || 10,
              };

              if (el.type === "photo") {
                const photoIdx = photoElementsSorted.findIndex(
                  (pe: any) => pe.id === el.id,
                );
                const imageUrl = capturedFrames[photoIdx] || "";
                const isSelected = photoIdx === currentFrameIndex;

                const imgRatio = imageRatios[photoIdx] || 1.777;
                const slotW = (el.width / 100) * canvasWidth;
                const slotH = (el.height / 100) * canvasHeight;
                const targetRatio = slotW / slotH;

                let drawW = slotW;
                let drawH = slotH;
                if (imgRatio > targetRatio) {
                  drawW = slotH * imgRatio;
                } else {
                  drawH = slotW / imgRatio;
                }

                const pos = photoPositions[photoIdx] || { x: 0, y: 0 };

                return (
                  <div
                    key={el.id}
                    style={{
                      ...style,
                      borderRadius: `${el.borderRadius || 0}px`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, photoIdx)}
                    onTouchStart={(e) => handleMouseDown(e, photoIdx)}
                    className={`overflow-hidden bg-neutral-900 border relative flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-150 ${
                      isSelected
                        ? "ring-4 ring-[#CCFF00] shadow-[0_0_30px_rgba(204,255,0,0.4)] z-40 border-transparent"
                        : "border-white/20 hover:border-white/40"
                    }`}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`Snapped Frame ${photoIdx + 1}`}
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          width: `${drawW}px`,
                          height: `${drawH}px`,
                          marginLeft: `${-drawW / 2 + pos.x}px`,
                          marginTop: `${-drawH / 2 + pos.y}px`,
                          transformOrigin: "center center",
                          maxWidth: "none",
                          maxHeight: "none",
                        }}
                        className={`pointer-events-none select-none transition-filter duration-150 object-cover ${
                          AVAILABLE_FILTERS.find(
                            (f) =>
                              f.id === (frameFilters[photoIdx] || "normal"),
                          )?.class || ""
                        }`}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 text-white/40">
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          EMPTY SLOT
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/80 backdrop-blur-md text-[#CCFF00] border border-white/20 text-[9px] font-black tracking-widest uppercase rounded-full shadow-lg z-30 select-none flex items-center gap-1.5">
                      <span>#{photoIdx + 1}</span>
                      {isSelected && (
                        <span className="text-white flex items-center gap-1 border-l border-white/20 pl-1.5">
                          <Move className="w-3 h-3 text-[#CCFF00]" /> DRAG
                        </span>
                      )}
                    </div>
                  </div>
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
                      fontSize: `${el.fontSize || 24}px`,
                      fontWeight: "bold",
                      whiteSpace: "nowrap",
                    }}
                    className="flex items-center justify-start overflow-hidden font-sans select-none"
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
                      className="object-contain pointer-events-none"
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
                    className="flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-center"
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
                    <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-[7px] text-zinc-400">
                      [QR]
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {template?.framePng && (
              <img
                src={template.framePng}
                alt="Overlay layout"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none z-30"
              />
            )}
          </div>
        </div>

        {/* EDITOR PANEL (FILTER & POSISI RESET) */}
        {!isMobile ? (
          <div className="flex-1 md:w-[360px] lg:w-[380px] xl:w-[420px] min-h-0 glass-panel border border-white/25 rounded-[32px] shadow-2xl flex flex-col overflow-hidden justify-between">
            <div className="px-6 py-5 border-b border-white/15 flex items-center justify-between shrink-0 bg-black/30 gap-3">
              <div className="flex items-center gap-2.5 text-[#CCFF00]">
                <Layers className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest">
                  COLOR FILTERS
                </span>
              </div>

              <div className="flex items-center gap-2 bg-black/40 border border-white/20 p-1 rounded-full">
                <button
                  disabled={currentFrameIndex === 0}
                  onClick={() => setCurrentFrameIndex((prev) => prev - 1)}
                  className="p-1.5 bg-white/10 hover:bg-[#CCFF00] hover:text-black text-white disabled:opacity-20 transition rounded-full cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
                <span className="text-[10px] font-black tracking-wider text-white px-2 uppercase">
                  SLOT #{currentFrameIndex + 1} / {capturedFrames.length || 4}
                </span>
                <button
                  disabled={
                    currentFrameIndex === (capturedFrames.length || 4) - 1
                  }
                  onClick={() => setCurrentFrameIndex((prev) => prev + 1)}
                  className="p-1.5 bg-white/10 hover:bg-[#CCFF00] hover:text-black text-white disabled:opacity-20 transition rounded-full cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0 text-left">
              {/* Petunjuk Posisi Geser */}
              <div className="p-4 bg-black/30 border border-white/15 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2.5 text-xs font-bold text-white/90">
                  <Move className="w-4 h-4 text-[#CCFF00] shrink-0" />
                  <span>Click & drag photo to adjust position</span>
                </div>
                <button
                  onClick={resetCurrentPosition}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white hover:text-black text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer shrink-0"
                  title="Reset Position"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <span className="text-[10px] font-black uppercase text-[#CCFF00] tracking-widest">
                  ESTHETIC RETRO & STUDIO FILTERS
                </span>
                <p className="text-xs font-bold text-white/70 uppercase tracking-wide leading-tight">
                  Choose a filter style for photo slot #{currentFrameIndex + 1}.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => applyFilterToCurrent(filter.id)}
                    className={`py-3.5 px-4 rounded-2xl border text-left text-xs font-black transition-all cursor-pointer flex items-center justify-between shadow-md uppercase ${
                      currentFilter === filter.id
                        ? "border-[#CCFF00] bg-[#CCFF00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] scale-[1.02]"
                        : "border-white/20 bg-black/30 text-white/70 hover:text-white hover:border-white/40"
                    }`}
                  >
                    <span>{filter.name}</span>
                    {currentFilter === filter.id && (
                      <span className="w-2.5 h-2.5 bg-black rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 border-t border-white/15 bg-black/40 flex items-center gap-4 shrink-0">
              <button
                onClick={() => navigate("/booth/camera")}
                className="flex-1 py-3.5 px-4 bg-white/10 hover:bg-red-500/20 hover:text-red-300 border border-white/20 text-xs font-black uppercase tracking-wider text-white rounded-full transition cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retake Camera</span>
              </button>
              <button
                onClick={handleDone}
                className="flex-[1.5] py-3.5 px-4 bg-[#CCFF00] hover:bg-white text-black text-xs font-black uppercase tracking-wider rounded-full transition cursor-pointer shadow-[0_0_25px_rgba(204,255,0,0.3)] flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save & Continue</span>
              </button>
            </div>
          </div>
        ) : (
          /* MOBILE BOTTOM LAYOUT */
          <div className="flex-1 bg-neutral-950/95 border border-white/20 rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden">
            <div className="w-full flex justify-center py-2 bg-black/20 shrink-0">
              <div className="w-12 h-1 bg-white/30 rounded-full" />
            </div>

            <div className="px-5 py-3 bg-black/40 border-b border-white/10 flex items-center justify-between shrink-0">
              <span className="text-xs font-black uppercase tracking-widest text-[#CCFF00] flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Color Filters
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentFrameIndex === 0}
                  onClick={() => setCurrentFrameIndex((prev) => prev - 1)}
                  className="p-1.5 bg-white/10 border border-white/20 rounded-full text-white disabled:opacity-20"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-black text-white px-1 uppercase">
                  SLOT #{currentFrameIndex + 1} / {capturedFrames.length}
                </span>
                <button
                  disabled={currentFrameIndex === capturedFrames.length - 1}
                  onClick={() => setCurrentFrameIndex((prev) => prev + 1)}
                  className="p-1.5 bg-white/10 border border-white/20 rounded-full text-white disabled:opacity-20"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0 text-left space-y-3">
              <div className="flex items-center justify-between bg-black/40 p-3 rounded-2xl text-[10px] font-black uppercase text-white/80">
                <span className="flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-[#CCFF00]" />
                  Drag photo to adjust position
                </span>
                <button
                  onClick={resetCurrentPosition}
                  className="text-[#CCFF00] underline font-bold"
                >
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {AVAILABLE_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => applyFilterToCurrent(filter.id)}
                    className={`py-3 px-3.5 rounded-2xl border text-left text-[10px] font-black transition cursor-pointer flex items-center justify-between uppercase ${
                      currentFilter === filter.id
                        ? "border-[#CCFF00] bg-[#CCFF00] text-black"
                        : "border-white/20 bg-black/40 text-white/70"
                    }`}
                  >
                    <span>{filter.name}</span>
                    {currentFilter === filter.id && (
                      <span className="w-2 h-2 bg-black rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-white/15 bg-black/50 flex items-center gap-3 shrink-0">
              <button
                onClick={() => navigate("/booth/camera")}
                className="flex-1 py-3.5 bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-widest text-white rounded-full flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Retake
              </button>
              <button
                onClick={handleDone}
                className="flex-[2] py-3.5 bg-[#CCFF00] text-black text-xs font-black uppercase tracking-widest rounded-full flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Print Layout
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
