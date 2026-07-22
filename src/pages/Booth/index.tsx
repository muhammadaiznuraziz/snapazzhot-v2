import React, { useEffect, useState, useRef, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { BoothContextType } from "../../layouts/BoothLayout";
import { useApp } from "../../contexts/AppContext";
import {
  Sparkles,
  Image as ImageIcon,
  QrCode,
  Camera,
  Sliders,
  Monitor,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BoothIndex() {
  const context = useOutletContext<BoothContextType>();
  const navigate = useNavigate();
  const { templates } = useApp() as any;

  const {
    activeEvent,
    photosToTake,
    setPhotosToTake,
    countdownSeconds,
    setCountdownSeconds,
    selectedFrameId,
    setSelectedFrameId,
    selectedCameraId,
    setSelectedCameraId,
    useSimulator,
    cameraList,
    setCameraList,
    setUseSimulator,
    setCapturedFrames,
    setAllSnappedPhotos,
    setCompiledPhotoRecord,
    setFrameFilters,
    setFrameStickers,
  } = context;

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const handleSelectCustomTemplate = useCallback(
    (template: any) => {
      if (!template) return;
      setSelectedFrameId(template.id);
      const photoCount =
        template.elements?.filter((el: any) => el.type === "photo").length || 0;
      setPhotosToTake(photoCount);
      showToast(`Template: ${template.name.toUpperCase()}`);
    },
    [setSelectedFrameId, setPhotosToTake, showToast],
  );

  // Auto-select template effect (Fixed re-render loop)
  useEffect(() => {
    if (!templates || templates.length === 0) return;

    const activeTpl = templates.find((t: any) => t.id === selectedFrameId);
    if (activeTpl) {
      const photoCount =
        activeTpl.elements?.filter((el: any) => el.type === "photo").length ||
        0;
      if (photosToTake !== photoCount) {
        setPhotosToTake(photoCount);
      }
    } else {
      // Auto select first template without triggering state loop
      const firstTpl = templates[0];
      setSelectedFrameId(firstTpl.id);
      const photoCount =
        firstTpl.elements?.filter((el: any) => el.type === "photo").length || 0;
      setPhotosToTake(photoCount);
    }
  }, [
    templates,
    selectedFrameId,
    photosToTake,
    setSelectedFrameId,
    setPhotosToTake,
  ]);

  // Reset booth session & initialize hardware camera
  useEffect(() => {
    let isMounted = true;
    setCapturedFrames([]);
    setAllSnappedPhotos([]);
    setCompiledPhotoRecord(null);
    setFrameFilters({});
    setFrameStickers({});

    async function getCameras() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMounted) setUseSimulator(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());

        if (!isMounted) return;

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameraList(videoDevices);

        if (videoDevices.length > 0) {
          if (selectedCameraId === "webcam-1" || !selectedCameraId) {
            setSelectedCameraId(videoDevices[0].deviceId);
          }
          setUseSimulator(false);
        } else {
          setUseSimulator(true);
        }
      } catch (err) {
        if (isMounted) setUseSimulator(true);
      }
    }

    getCameras();

    return () => {
      isMounted = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleStart = () => {
    navigate("/booth/camera");
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const offset = direction === "left" ? -300 : 300;
      carouselRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (carouselRef.current) {
      if (carouselRef.current.scrollWidth > carouselRef.current.clientWidth) {
        carouselRef.current.scrollBy({
          left: e.deltaY * 1.2,
          behavior: "smooth",
        });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    if (carouselRef.current.scrollWidth <= carouselRef.current.clientWidth)
      return;
    isDown.current = true;
    carouselRef.current.classList.remove("snap-x", "snap-mandatory");
    startX.current = e.pageX - carouselRef.current.offsetLeft;
    scrollLeft.current = carouselRef.current.scrollLeft;
  };

  const handleMouseLeaveOrUp = () => {
    isDown.current = false;
    if (carouselRef.current) {
      carouselRef.current.classList.add("snap-x", "snap-mandatory");
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    carouselRef.current.scrollLeft = scrollLeft.current - walk;
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } },
      }}
      className="w-full min-h-screen md:h-screen p-4 sm:p-6 md:p-8 flex flex-col bg-[#004ce5] text-white relative overflow-y-auto md:overflow-hidden box-border justify-between items-center gap-4 select-none"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />

      {/* Header Info */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: -10 },
          show: { opacity: 1, y: 0 },
        }}
        className="text-center space-y-2 max-w-xl w-full shrink-0 relative z-10"
      >
        <h2 className="text-2xl md:text-4xl font-black  tracking-tight text-white uppercase leading-none">
          Pilih Frame Foto Anda
        </h2>
        {activeEvent && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/60 border border-white/10 rounded-full font-['Outfit'] text-[9px] font-bold text-white/85 uppercase tracking-widest shadow-lg backdrop-blur-sm">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            Event: {activeEvent.name}
          </div>
        )}
      </motion.div>

      {/* CENTER ZONE: Carousel Area */}
      <div className="w-full max-w-7xl flex flex-col gap-2 items-center justify-center flex-1 min-h-0 relative z-10">
        <div className="w-full relative flex items-center group/carousel px-2 md:px-16 h-full justify-center">
          <button
            onClick={() => scrollCarousel("left")}
            className="absolute left-2 z-20 p-3 rounded-full bg-black/50 border border-white/10 hover:bg-black/80 hover:border-white/30 text-white transition-all shadow-xl hidden md:flex items-center justify-center backdrop-blur-sm cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div
            ref={carouselRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeaveOrUp}
            onMouseUp={handleMouseLeaveOrUp}
            onMouseMove={handleMouseMove}
            className="w-full flex gap-6 md:gap-8 items-center overflow-x-auto justify-start md:justify-center snap-x snap-mandatory py-4 px-4 cursor-grab active:cursor-grabbing scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden h-full max-h-[460px]"
          >
            {templates && templates.length > 0 ? (
              templates.map((tpl: any) => {
                const isSelected = selectedFrameId === tpl.id;
                const tplSlots =
                  tpl.elements?.filter((el: any) => el.type === "photo")
                    .length || 0;
                const aspectW = tpl.canvasWidth || 800;
                const aspectH = tpl.canvasHeight || 1800;

                return (
                  <div
                    key={tpl.id}
                    className="flex-none snap-center flex flex-col items-center gap-2 h-full justify-center"
                  >
                    <motion.div
                      onClick={() => handleSelectCustomTemplate(tpl)}
                      whileHover={{ scale: isSelected ? 1 : 1.02 }}
                      animate={{
                        scale: isSelected ? 1.04 : 0.96,
                        borderColor: isSelected
                          ? "#a855f7"
                          : "rgba(255,255,255,0.15)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 25,
                      }}
                      style={{ aspectRatio: `${aspectW} / ${aspectH}` }}
                      className={`relative h-[280px] sm:h-[340px] md:h-full md:max-h-[360px]  shadow-2xl bg-black border-2 transition-shadow duration-200 cursor-pointer ${
                        isSelected
                          ? "shadow-[#a855f7]/30 ring-4 ring-[#a855f7]/20"
                          : "hover:border-white/40"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-30 w-5 h-5 rounded-full bg-[#a855f7] text-white flex items-center justify-center shadow-lg">
                          <Check className="w-3 stroke-[3]" />
                        </div>
                      )}

                      {tpl.backgroundImage ? (
                        <img
                          src={tpl.backgroundImage}
                          className="absolute inset-0 w-full h-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="absolute inset-0 bg-neutral-950" />
                      )}

                      <div className="absolute inset-0 pointer-events-none select-none z-10">
                        {tpl.elements?.map((el: any) => {
                          if (el.hidden) return null;
                          return (
                            <div
                              key={el.id}
                              style={{
                                left: `${el.x}%`,
                                top: `${el.y}%`,
                                width: `${el.width}%`,
                                height: `${el.height}%`,
                                transform: `rotate(${el.rotation || 0}deg)`,
                              }}
                              className={`absolute flex flex-col items-center justify-center ${
                                el.type === "photo"
                                  ? "bg-white/10 border border-white/10 text-white"
                                  : "bg-white text-black p-[0.5px]"
                              }`}
                            >
                              {el.type === "photo" && (
                                <ImageIcon className="w-3 h-3 text-[#bcff00]/80" />
                              )}
                              {el.type === "qr" && (
                                <QrCode className="w-full h-full text-black" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {tpl.framePng && (
                        <img
                          src={tpl.framePng}
                          className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
                          alt=""
                        />
                      )}
                    </motion.div>

                    <div
                      className={`text-center transition-opacity duration-200 shrink-0 ${
                        isSelected ? "opacity-100" : "opacity-60"
                      }`}
                    >
                      <h4 className="text-[11px] font-black text-white uppercase tracking-wide font-['Outfit'] max-w-[160px] truncate">
                        {tpl.name}
                      </h4>
                      <p className="font-['Outfit'] text-[9px] text-white/50 font-medium">
                        <span className="text-[#bcff00] font-black">
                          {tplSlots} FOTO
                        </span>{" "}
                        • {tpl.canvasWidth}×{tpl.canvasHeight}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center py-12 font-['Outfit'] text-xs text-white/30 uppercase tracking-widest">
                Tidak Ada Template Tersedia
              </div>
            )}
          </div>

          <button
            onClick={() => scrollCarousel("right")}
            className="absolute right-2 z-20 p-3 rounded-full bg-black/50 border border-white/10 hover:bg-black/80 hover:border-white/30 text-white transition-all shadow-xl hidden md:flex items-center justify-center backdrop-blur-sm cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <p className="font-['Outfit'] text-[9px] text-white/30 uppercase tracking-widest block md:hidden">
          Geser ke kiri atau kanan untuk melihat frame lainnya.
        </p>
      </div>

      {/* BOTTOM CONTROLS ZONE */}
      <div className="w-full max-w-4xl shrink-0 flex flex-col gap-4 relative z-10">
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            show: { opacity: 1, y: 0 },
          }}
          className="w-full p-4 bg-black/40 border border-white/10 rounded-[20px] shadow-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 backdrop-blur-md items-center"
        >
          <div className="space-y-1.5">
            <label className="font-['Outfit'] text-[9px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-[#bcff00]" /> Interval
              Countdown
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 7, 10].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setCountdownSeconds(sec)}
                  className={`flex items-center justify-center py-1.5 rounded-lg font-['Outfit'] text-[11px] font-bold uppercase transition border cursor-pointer ${
                    countdownSeconds === sec
                      ? "bg-white text-black border-white shadow-md"
                      : "bg-black/40 text-white/60 border-white/5 hover:border-white/15"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-['Outfit'] text-[9px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#bcff00]" /> Input Kamera
              Hardware
            </label>
            {useSimulator ? (
              <div className="py-1.5 px-4 bg-black/50 border border-[#bcff00]/20 rounded-lg text-[10px] font-['Outfit'] font-black text-[#bcff00] flex items-center gap-2 tracking-wide">
                <span className="w-1.5 h-1.5 bg-[#bcff00] rounded-full animate-pulse" />
                DSLR SIMULATOR ACTIVE
              </div>
            ) : (
              <div className="relative bg-black/40 border border-white/5 rounded-lg px-4 py-1 focus-within:border-white transition flex items-center">
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-[11px] font-['Outfit'] font-bold text-white outline-none focus:ring-0 cursor-pointer appearance-none"
                >
                  {cameraList.map((cam) => (
                    <option
                      key={cam.deviceId}
                      value={cam.deviceId}
                      className="bg-neutral-900 text-white"
                    >
                      {cam.label || `Kamera [${cam.deviceId.substring(0, 6)}]`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </motion.div>

        {/* Action Button */}
        <div className="w-full flex justify-center pb-2">
          <motion.button
            onClick={handleStart}
            whileHover={{
              y: -2,
              scale: 1.01,
              boxShadow: "0 15px 30px rgba(188,255,0,0.25)",
            }}
            whileTap={{ scale: 0.99 }}
            className="w-full max-w-md py-3.5 bg-[#bcff00] hover:bg-white text-black font-['Outfit'] font-black uppercase tracking-widest text-xs  shadow-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-black" />
            Mulai Pemotretan
          </motion.button>
        </div>
      </div>

      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#bcff00] text-black font-['Outfit'] text-[10px] font-black uppercase tracking-widest px-5 py-3.5 rounded-xl border-2 border-black flex items-center gap-2 whitespace-nowrap shadow-2xl"
          >
            <Sparkles className="w-3.5 h-3.5 text-black animate-pulse" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
