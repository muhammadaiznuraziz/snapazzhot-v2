import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { BoothContextType, PhotoTransform } from "../../layouts/BoothLayout";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowLeft,
  Check,
  MousePointer2,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // Konsisten menggunakan framer-motion dari index

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

export default function BoothEditor() {
  const context = useOutletContext<BoothContextType>();
  const navigate = useNavigate();
  const { templates, activeEvent } = useApp() as any;

  const {
    capturedFrames,
    frameFilters,
    setFrameFilters,
    frameStickers,
    setFrameStickers,
    photoTransforms,
    setPhotoTransforms,
    selectedFrameId,
    handleCompileLayout,
  } = context;

  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"crop" | "filter">("crop");
  const [compiling, setCompiling] = useState(false);
  const [imageRatios, setImageRatios] = useState<Record<number, number>>({});
  const [isMobile, setIsMobile] = useState(false);

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

  const defaultTransform = (): PhotoTransform => ({
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotation: 0,
    mirrorX: false,
    mirrorY: false,
  });

  const getTransform = (idx: number): PhotoTransform => {
    return photoTransforms[idx] || defaultTransform();
  };

  useEffect(() => {
    if (capturedFrames.length > 0) {
      setPhotoTransforms((prev) => {
        const next = { ...prev };
        capturedFrames.forEach((_, idx) => {
          if (!next[idx]) {
            next[idx] = defaultTransform();
          }
        });
        return next;
      });
    }
  }, [capturedFrames, setPhotoTransforms]);

  const applyFilterToCurrent = (filterId: string) => {
    setFrameFilters((prev) => ({
      ...prev,
      [currentFrameIndex]: filterId,
    }));
  };

  const handleMouseDown = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    setCurrentFrameIndex(idx);

    const startX = e.clientX;
    const startY = e.clientY;

    const currentTransform = getTransform(idx);
    const initTx = currentTransform.translateX;
    const initTy = currentTransform.translateY;

    const imgRatio = imageRatios[idx] || 1.777;
    const el = photoElementsSorted[idx];
    if (!el) return;
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

    const finalScale = Math.max(1, currentTransform.scale);
    const scaledW = drawW * finalScale;
    const scaledH = drawH * finalScale;

    const maxTx = Math.max(0, (scaledW - slotW) / 2);
    const maxTy = Math.max(0, (scaledH - slotH) / 2);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const dragX = currentTransform.mirrorX ? -dx : dx;
      const dragY = currentTransform.mirrorY ? -dy : dy;

      let finalDx = dragX / previewScale;
      let finalDy = dragY / previewScale;

      if (currentTransform.rotation === 90) {
        const tmp = finalDx;
        finalDx = finalDy;
        finalDy = -tmp;
      } else if (currentTransform.rotation === 180) {
        finalDx = -finalDx;
        finalDy = -finalDy;
      } else if (currentTransform.rotation === 270) {
        const tmp = finalDx;
        finalDx = -finalDy;
        finalDy = tmp;
      }

      const nextTx = Math.min(maxTx, Math.max(-maxTx, initTx + finalDx));
      const nextTy = Math.min(maxTy, Math.max(-maxTy, initTy + finalDy));

      setPhotoTransforms((prev) => ({
        ...prev,
        [idx]: {
          ...currentTransform,
          translateX: nextTx,
          translateY: nextTy,
        },
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleWheel = (e: React.WheelEvent, idx: number) => {
    setCurrentFrameIndex(idx);
    const currentTransform = getTransform(idx);

    const zoomFactor = 0.05;
    const direction = e.deltaY < 0 ? 1 : -1;
    const nextScale = Math.min(
      4.0,
      Math.max(1.0, currentTransform.scale + direction * zoomFactor),
    );

    const imgRatio = imageRatios[idx] || 1.777;
    const el = photoElementsSorted[idx];
    if (!el) return;
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

    const scaledW = drawW * nextScale;
    const scaledH = drawH * nextScale;

    const maxTx = Math.max(0, (scaledW - slotW) / 2);
    const maxTy = Math.max(0, (scaledH - slotH) / 2);

    const boundTx = Math.min(
      maxTx,
      Math.max(-maxTx, currentTransform.translateX),
    );
    const boundTy = Math.min(
      maxTy,
      Math.max(-maxTy, currentTransform.translateY),
    );

    setPhotoTransforms((prev) => ({
      ...prev,
      [idx]: {
        ...currentTransform,
        scale: nextScale,
        translateX: boundTx,
        translateY: boundTy,
      },
    }));
  };

  const touchRef = useRef<{
    startX: number;
    startY: number;
    initTx: number;
    initTy: number;
    initScale: number;
    lastDistance: number;
  } | null>(null);

  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
    setCurrentFrameIndex(idx);
    const currentTransform = getTransform(idx);

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        initTx: currentTransform.translateX,
        initTy: currentTransform.translateY,
        initScale: currentTransform.scale,
        lastDistance: 0,
      };
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      touchRef.current = {
        startX: (t1.clientX + t2.clientX) / 2,
        startY: (t1.clientY + t2.clientY) / 2,
        initTx: currentTransform.translateX,
        initTy: currentTransform.translateY,
        initScale: currentTransform.scale,
        lastDistance: dist,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent, idx: number) => {
    if (!touchRef.current) return;
    const currentTransform = getTransform(idx);

    const imgRatio = imageRatios[idx] || 1.777;
    const el = photoElementsSorted[idx];
    if (!el) return;
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

    if (e.touches.length === 1 && touchRef.current.lastDistance === 0) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchRef.current.startX;
      const dy = touch.clientY - touchRef.current.startY;

      const dragX = currentTransform.mirrorX ? -dx : dx;
      const dragY = currentTransform.mirrorY ? -dy : dy;

      let finalDx = dragX / previewScale;
      let finalDy = dragY / previewScale;

      if (currentTransform.rotation === 90) {
        const tmp = finalDx;
        finalDx = finalDy;
        finalDy = -tmp;
      } else if (currentTransform.rotation === 180) {
        finalDx = -finalDx;
        finalDy = -finalDy;
      } else if (currentTransform.rotation === 270) {
        const tmp = finalDx;
        finalDx = -finalDy;
        finalDy = tmp;
      }

      const finalScale = Math.max(1, currentTransform.scale);
      const scaledW = drawW * finalScale;
      const scaledH = drawH * finalScale;

      const maxTx = Math.max(0, (scaledW - slotW) / 2);
      const maxTy = Math.max(0, (scaledH - slotH) / 2);

      const nextTx = Math.min(
        maxTx,
        Math.max(-maxTx, touchRef.current.initTx + finalDx),
      );
      const nextTy = Math.min(
        maxTy,
        Math.max(-maxTy, touchRef.current.initTy + finalDy),
      );

      setPhotoTransforms((prev) => ({
        ...prev,
        [idx]: {
          ...currentTransform,
          translateX: nextTx,
          translateY: nextTy,
        },
      }));
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (touchRef.current.lastDistance > 0) {
        const ratio = dist / touchRef.current.lastDistance;
        const nextScale = Math.min(
          4.0,
          Math.max(1.0, touchRef.current.initScale * ratio),
        );

        const scaledW = drawW * nextScale;
        const scaledH = drawH * nextScale;

        const maxTx = Math.max(0, (scaledW - slotW) / 2);
        const maxTy = Math.max(0, (scaledH - slotH) / 2);

        const boundTx = Math.min(
          maxTx,
          Math.max(-maxTx, currentTransform.translateX),
        );
        const boundTy = Math.min(
          maxTy,
          Math.max(-maxTy, currentTransform.translateY),
        );

        setPhotoTransforms((prev) => ({
          ...prev,
          [idx]: {
            ...currentTransform,
            scale: nextScale,
            translateX: boundTx,
            translateY: boundTy,
          },
        }));
      }
    }
  };

  const handleTouchEnd = () => {
    touchRef.current = null;
  };

  const lastTapRef = useRef<{ time: number; idx: number } | null>(null);

  const handleTouchStartWithDoubleTap = (e: React.TouchEvent, idx: number) => {
    const now = Date.now();
    if (
      lastTapRef.current &&
      lastTapRef.current.idx === idx &&
      now - lastTapRef.current.time < 300
    ) {
      handleReset(idx);
      lastTapRef.current = null;
      return;
    }
    lastTapRef.current = { time: now, idx };
    handleTouchStart(e, idx);
  };

  const handleReset = (idx: number) => {
    setPhotoTransforms((prev) => ({
      ...prev,
      [idx]: defaultTransform(),
    }));
  };

  const handleZoomIncrement = (amount: number) => {
    const current = getTransform(currentFrameIndex);
    const nextScale = Math.min(4.0, Math.max(1.0, current.scale + amount));
    updateScaleValue(currentFrameIndex, nextScale);
  };

  const updateScaleValue = (idx: number, nextScale: number) => {
    const current = getTransform(idx);
    const imgRatio = imageRatios[idx] || 1.777;
    const el = photoElementsSorted[idx];
    if (!el) return;
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

    const scaledW = drawW * nextScale;
    const scaledH = drawH * nextScale;

    const maxTx = Math.max(0, (scaledW - slotW) / 2);
    const maxTy = Math.max(0, (scaledH - slotH) / 2);

    const boundTx = Math.min(maxTx, Math.max(-maxTx, current.translateX));
    const boundTy = Math.min(maxTy, Math.max(-maxTy, current.translateY));

    setPhotoTransforms((prev) => ({
      ...prev,
      [idx]: {
        ...current,
        scale: nextScale,
        translateX: boundTx,
        translateY: boundTy,
      },
    }));
  };

  const handleRotateCurrent = () => {
    const current = getTransform(currentFrameIndex);
    const nextRotation = (current.rotation + 90) % 360;
    setPhotoTransforms((prev) => ({
      ...prev,
      [currentFrameIndex]: {
        ...current,
        rotation: nextRotation,
      },
    }));
  };

  const handleFlipHorizontal = () => {
    const current = getTransform(currentFrameIndex);
    setPhotoTransforms((prev) => ({
      ...prev,
      [currentFrameIndex]: {
        ...current,
        mirrorX: !current.mirrorX,
      },
    }));
  };

  const handleFlipVertical = () => {
    const current = getTransform(currentFrameIndex);
    setPhotoTransforms((prev) => ({
      ...prev,
      [currentFrameIndex]: {
        ...current,
        mirrorY: !current.mirrorY,
      },
    }));
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
      <div className="fixed inset-0 z-50 bg-[#004ce5] flex flex-col items-center justify-center space-y-6 p-6">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
        <div className="relative z-10">
          <div className="w-16 h-16 border-4 border-[#bcff00] border-t-transparent rounded-full animate-spin" />
          <Sparkles className="w-6 h-6 text-[#bcff00]/60 absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="text-center space-y-2 max-w-md relative z-10">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white font-['Outfit']">
            RENDERING FINAL LAYOUT...
          </h2>
          <p className="text-[10px] text-white/60 leading-relaxed font-['Outfit'] font-bold tracking-wide uppercase">
            Sedang merender tata letak template beserta filter retro, dan posisi
            kustom transformasi foto...
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black border border-white/10 text-[#bcff00] rounded-full font-['Outfit'] text-[9px] uppercase tracking-wider shadow-lg relative z-10">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Offscreen Canvas Renderer Active
        </div>
      </div>
    );
  }

  const currentFilter = frameFilters[currentFrameIndex] || "normal";

  const renderTabContent = () => {
    switch (activeTab) {
      case "crop":
        return (
          <div className="w-full space-y-4 text-left">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-['Outfit'] font-black uppercase text-[#bcff00] tracking-widest">
                KONTROL PRESISI TRANSFORMASI
              </span>
              <p className="text-[10px] font-['Outfit'] font-bold text-white/50 uppercase tracking-wide leading-tight">
                Sesuaikan zoom, rotasi, atau pencerminan bingkai foto aktif.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleZoomIncrement(0.15)}
                className="py-3 px-4 bg-black/40 hover:bg-[#bcff00] text-white hover:text-black border border-white/5 hover:border-transparent rounded-xl text-[10px] font-['Outfit'] font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <ZoomIn className="w-4 h-4 text-inherit" />
                Zoom +
              </button>

              <button
                onClick={() => handleZoomIncrement(-0.15)}
                className="py-3 px-4 bg-black/40 hover:bg-[#bcff00] text-white hover:text-black border border-white/5 hover:border-transparent rounded-xl text-[10px] font-['Outfit'] font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <ZoomOut className="w-4 h-4 text-inherit" />
                Zoom -
              </button>

              <button
                onClick={handleFlipHorizontal}
                className={`py-3 px-4 border rounded-xl text-[10px] font-['Outfit'] font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                  getTransform(currentFrameIndex).mirrorX
                    ? "bg-[#bcff00] text-black border-transparent"
                    : "bg-black/40 text-white border-white/5 hover:border-[#bcff00]/40"
                }`}
              >
                <FlipHorizontal className="w-4 h-4 text-inherit" />
                Mirror H
              </button>

              <button
                onClick={handleFlipVertical}
                className={`py-3 px-4 border rounded-xl text-[10px] font-['Outfit'] font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                  getTransform(currentFrameIndex).mirrorY
                    ? "bg-[#bcff00] text-black border-transparent"
                    : "bg-black/40 text-white border-white/5 hover:border-[#bcff00]/40"
                }`}
              >
                <FlipVertical className="w-4 h-4 text-inherit" />
                Mirror V
              </button>

              <button
                onClick={handleRotateCurrent}
                className="py-3 px-4 bg-black/40 hover:bg-[#bcff00] text-white hover:text-black border border-white/5 hover:border-transparent rounded-xl text-[10px] font-['Outfit'] font-black uppercase tracking-wider transition col-span-2 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RotateCw className="w-4 h-4 text-inherit" />
                Rotate 90°
              </button>

              <button
                onClick={() => handleReset(currentFrameIndex)}
                className="py-3 px-4 bg-black/40 hover:bg-red-950/40 hover:text-red-400 border border-white/5 hover:border-red-500/30 rounded-xl text-[10px] font-['Outfit'] font-black uppercase tracking-wider transition col-span-2 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-4 h-4 text-inherit" />
                Reset Posisi Foto
              </button>
            </div>
          </div>
        );

      case "filter":
        return (
          <div className="w-full space-y-4 text-left">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-['Outfit'] font-black uppercase text-[#bcff00] tracking-widest">
                RETRO & STUDIO FILTERS
              </span>
              <p className="text-[10px] font-['Outfit'] font-bold text-white/50 uppercase tracking-wide leading-tight">
                Pilih filter warna estetik untuk memberikan nuansa khas pada
                foto terpilih.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => applyFilterToCurrent(filter.id)}
                  className={`py-3 px-4 rounded-xl border text-left font-['Outfit'] text-[10px] font-black transition cursor-pointer flex items-center justify-between shadow-sm uppercase ${
                    currentFilter === filter.id
                      ? "border-[#bcff00] bg-[#bcff00] text-black"
                      : "border-white/5 bg-black/30 text-white/60 hover:text-white hover:border-white/15"
                  }`}
                >
                  <span>{filter.name}</span>
                  {currentFilter === filter.id && (
                    <span className="w-1.5 h-1.5 bg-black rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-[100dvh] flex flex-col bg-[#004ce5] text-white overflow-hidden font-['Outfit'] select-none box-border"
    >
      {/* Background Matrix Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />

      {/* MAIN CONTENT WORKSPACE AREA */}
      <div
        ref={mainRowRef}
        className="flex-1 min-h-0 flex flex-col md:flex-row items-stretch p-4 md:p-6 lg:p-8 gap-6 overflow-hidden relative z-10"
      >
        {/* PREVIEW CONTAINER */}
        <div
          style={
            !isMobile
              ? { width: `${previewWidth + 32}px`, height: "100%" }
              : { width: "100%", height: `${previewHeight + 32}px` }
          }
          className="shrink-0 flex items-center justify-center bg-black/40 border border-white/15 rounded-[20px] relative overflow-hidden select-none transition-all duration-300 shadow-xl"
        >
          {/* Canvas Wrapper */}
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
            className="shadow-2xl border border-white/10 relative overflow-hidden"
          >
            {/* Elements Layer */}
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
                const transform = getTransform(photoIdx);
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

                return (
                  <div
                    key={el.id}
                    style={{
                      ...style,
                      borderRadius: `${el.borderRadius || 0}px`,
                    }}
                    className={`overflow-hidden bg-neutral-900 border relative flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-300 ${
                      isSelected
                        ? "ring-4 ring-[#bcff00] shadow-[0_0_25px_rgba(188,255,0,0.4)] z-40 border-transparent"
                        : "border-white/10 hover:border-white/30"
                    }`}
                    onMouseDown={(e) => handleMouseDown(e, photoIdx)}
                    onWheel={(e) => handleWheel(e, photoIdx)}
                    onTouchStart={(e) =>
                      handleTouchStartWithDoubleTap(e, photoIdx)
                    }
                    onTouchMove={(e) => handleTouchMove(e, photoIdx)}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => setCurrentFrameIndex(photoIdx)}
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
                          marginLeft: `${-drawW / 2}px`,
                          marginTop: `${-drawH / 2}px`,
                          transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale}) rotate(${transform.rotation}deg) scaleX(${transform.mirrorX ? -1 : 1}) scaleY(${transform.mirrorY ? -1 : 1})`,
                          transformOrigin: "center center",
                          maxWidth: "none",
                          maxHeight: "none",
                        }}
                        className={`pointer-events-none select-none transition-transform duration-75 ${
                          AVAILABLE_FILTERS.find(
                            (f) =>
                              f.id === (frameFilters[photoIdx] || "normal"),
                          )?.class || ""
                        }`}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-800 text-white/30">
                        <span className="text-[8px] font-['Outfit'] font-black uppercase tracking-widest">
                          EMPTY SLOT
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black text-[#bcff00] border border-white/10 text-[8px] font-['Outfit'] font-black tracking-widest uppercase rounded shadow-md z-30 select-none">
                      #{photoIdx + 1} {isSelected && "• ACTIVE"}
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
                    className="flex items-center justify-center text-[10px] font-['Outfit'] font-bold uppercase tracking-wider text-center"
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
                    <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-[7px] font-['Outfit'] text-zinc-400">
                      [QR]
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* PNG Frame Overlay */}
            {template?.framePng && (
              <img
                src={template.framePng}
                alt="Overlay layout"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none z-30"
              />
            )}
          </div>
        </div>

        {/* EDITOR PANEL & TOOLS */}
        {!isMobile ? (
          // DESKTOP LAYOUT
          <div className="flex-1 min-h-0 bg-neutral-900 border border-white/15 rounded-[20px] shadow-xl flex flex-col overflow-hidden">
            {/* TABS HEADER */}
            <div className="px-5 pt-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-black/30">
              <div className="flex text-[10px] font-['Outfit'] font-black uppercase tracking-widest gap-4">
                <button
                  onClick={() => setActiveTab("crop")}
                  className={`pb-3 px-1 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "crop"
                      ? "border-[#bcff00] text-[#bcff00]"
                      : "border-transparent text-white/40 hover:text-white/80"
                  }`}
                >
                  <MousePointer2 className="w-3.5 h-3.5" />
                  Posisi & Zoom
                </button>
                <button
                  onClick={() => setActiveTab("filter")}
                  className={`pb-3 px-1 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "filter"
                      ? "border-[#bcff00] text-[#bcff00]"
                      : "border-transparent text-white/40 hover:text-white/80"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Filter Warna
                </button>
              </div>
            </div>

            {/* ACTIVE FRAME NAVIGATOR */}
            <div className="px-5 py-3.5 bg-black/10 border-b border-white/5 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  disabled={currentFrameIndex === 0}
                  onClick={() => setCurrentFrameIndex((prev) => prev - 1)}
                  className="p-1.5 bg-neutral-800 hover:bg-[#bcff00] hover:text-black border border-white/10 hover:border-transparent text-white disabled:opacity-25 disabled:hover:bg-neutral-800 disabled:hover:text-white transition rounded-lg cursor-pointer shadow"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-['Outfit'] text-[10px] font-black uppercase tracking-widest text-white px-2.5">
                  SLOT FOTO: #{currentFrameIndex + 1} / {capturedFrames.length}
                </span>
                <button
                  disabled={currentFrameIndex === capturedFrames.length - 1}
                  onClick={() => setCurrentFrameIndex((prev) => prev + 1)}
                  className="p-1.5 bg-neutral-800 hover:bg-[#bcff00] hover:text-black border border-white/10 hover:border-transparent text-white disabled:opacity-25 disabled:hover:bg-neutral-800 disabled:hover:text-white transition rounded-lg cursor-pointer shadow"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="font-['Outfit'] text-[8px] uppercase tracking-widest text-[#bcff00] font-black flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded-full border border-white/5">
                <Sparkles className="w-3 h-3 text-[#bcff00] animate-pulse" />
                Live Engine
              </div>
            </div>

            {/* SCROLLABLE TOOL CONTENT */}
            <div className="flex-1 overflow-y-auto p-5 min-h-0 text-left">
              {renderTabContent()}
            </div>

            {/* ACTION FOOTER */}
            <div className="p-5 border-t border-white/10 bg-black/40 flex flex-col gap-2.5 shrink-0">
              <button
                onClick={handleDone}
                className="w-full py-4 px-6 bg-[#bcff00] hover:bg-white text-black text-xs font-['Outfit'] font-black uppercase tracking-widest rounded-xl transition duration-150 cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Simpan
              </button>
              <button
                onClick={() => navigate("/booth/camera")}
                className="w-full py-3 px-6 bg-black/30 hover:bg-red-950/50 hover:text-red-400 border border-white/5 hover:border-red-500/30 text-[10px] font-['Outfit'] font-black uppercase tracking-widest text-white/70 rounded-xl transition duration-150 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Ulang Sesi Kamera
              </button>
            </div>
          </div>
        ) : (
          // MOBILE BOTTOM LAYOUT
          <div className="flex-1 bg-neutral-900 border border-white/15 rounded-t-[20px] shadow-2xl flex flex-col overflow-hidden">
            <div className="w-full flex justify-center py-2 bg-black/20 shrink-0">
              <div className="w-12 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="px-4 border-b border-white/5 flex justify-around bg-black/30 shrink-0">
              <button
                onClick={() => setActiveTab("crop")}
                className={`pb-2.5 pt-1 text-[10px] font-['Outfit'] font-black uppercase tracking-widest transition cursor-pointer flex flex-col items-center gap-1 ${
                  activeTab === "crop"
                    ? "text-[#bcff00] border-b-2 border-[#bcff00]"
                    : "text-white/40"
                }`}
              >
                <MousePointer2 className="w-4 h-4" />
                Posisi
              </button>
              <button
                onClick={() => setActiveTab("filter")}
                className={`pb-2.5 pt-1 text-[10px] font-['Outfit'] font-black uppercase tracking-widest transition cursor-pointer flex flex-col items-center gap-1 ${
                  activeTab === "filter"
                    ? "text-[#bcff00] border-b-2 border-[#bcff00]"
                    : "text-white/40"
                }`}
              >
                <Layers className="w-4 h-4" />
                Filter
              </button>
            </div>

            <div className="px-4 py-2 bg-black/10 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentFrameIndex === 0}
                  onClick={() => setCurrentFrameIndex((prev) => prev - 1)}
                  className="p-1 bg-neutral-800 border border-white/10 rounded-md text-white disabled:opacity-20"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-['Outfit'] text-[9px] font-black text-white px-1.5">
                  SLOT #{currentFrameIndex + 1} / {capturedFrames.length}
                </span>
                <button
                  disabled={currentFrameIndex === capturedFrames.length - 1}
                  onClick={() => setCurrentFrameIndex((prev) => prev + 1)}
                  className="p-1 bg-neutral-800 border border-white/10 rounded-md text-white disabled:opacity-20"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[8px] font-['Outfit'] text-white/45 font-bold uppercase tracking-wide">
                Gunakan Gesture untuk Zoom & Geser
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0 bg-neutral-900 text-left">
              {renderTabContent()}
            </div>

            <div className="p-4 border-t border-white/10 bg-black/40 flex items-center gap-3 shrink-0">
              <button
                onClick={() => navigate("/booth/camera")}
                className="flex-1 py-3 bg-black/30 border border-white/5 text-[9px] font-['Outfit'] font-black uppercase tracking-widest text-white/75 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Ulang
              </button>
              <button
                onClick={handleDone}
                className="flex-[2] py-3 bg-[#bcff00] text-black text-[10px] font-['Outfit'] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-1 shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Proses Cetak ⚡
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
