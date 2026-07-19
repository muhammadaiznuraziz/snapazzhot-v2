import React, { useEffect, useState } from "react";
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
  Layers,
  Check,
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const handleSelectCustomTemplate = (template: any) => {
    setSelectedFrameId(template.id);
    const photoCount =
      template.elements?.filter((el: any) => el.type === "photo").length || 0;
    setPhotosToTake(photoCount);
    showToast(`Template: ${template.name.toUpperCase()}`);
  };

  useEffect(() => {
    if (templates && templates.length > 0) {
      const activeTpl = templates.find((t: any) => t.id === selectedFrameId);
      if (activeTpl) {
        const photoCount =
          activeTpl.elements?.filter((el: any) => el.type === "photo").length ||
          0;
        setPhotosToTake(photoCount);
      } else {
        handleSelectCustomTemplate(templates[0]);
      }
    }
  }, [templates, selectedFrameId]);

  useEffect(() => {
    setCapturedFrames([]);
    setAllSnappedPhotos([]);
    setCompiledPhotoRecord(null);
    setFrameFilters({});
    setFrameStickers({});

    async function getCameras() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setTimeout(() => {
          setUseSimulator(true);
        }, 0);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        stream.getTracks().forEach((track) => track.stop());
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameraList(videoDevices);
        if (videoDevices.length > 0) {
          if (selectedCameraId === "webcam-1") {
            setSelectedCameraId(videoDevices[0].deviceId);
          }
          setUseSimulator(false);
        } else {
          setUseSimulator(true);
        }
      } catch (err) {
        setUseSimulator(true);
      }
    }
    getCameras();
  }, []);

  const handleStart = () => {
    navigate("/booth/camera");
  };

  const activeTpl =
    templates?.find((t: any) => t.id === selectedFrameId) || templates?.[0];
  const slots =
    activeTpl?.elements?.filter((el: any) => el.type === "photo").length || 0;
  const canvasWidth = activeTpl?.canvasWidth || 800;
  const canvasHeight = activeTpl?.canvasHeight || 1800;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } },
      }}
      className="w-full min-h-screen p-4 sm:p-6 md:p-8 flex flex-col bg-[#004ce5] text-white relative overflow-y-auto overflow-x-hidden box-border justify-start items-center gap-6"
    >
      {/* Background Matrix Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />

      {/* Header Info */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: -10 },
          show: { opacity: 1, y: 0 },
        }}
        className="text-center space-y-2 max-w-xl w-full shrink-0 relative z-10"
      >
        <h2 className="text-3xl md:text-4xl font-black italic tracking-tight text-white uppercase leading-none">
          Sesi Pemotretan Kiosk
        </h2>
        {activeEvent && (
          <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-black border border-white/10 rounded-full font-['Outfit'] text-[9px] font-bold text-white/85 uppercase tracking-widest shadow-lg">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            Event: {activeEvent.name}
          </div>
        )}
      </motion.div>

      {/* 3-Card Consistent Grid System */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl w-full items-stretch relative z-10">
        {/* [ CARD 1 ]: Canvas Aspect Ratio (Preview Kiri) */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            show: { opacity: 1, y: 0 },
          }}
          className="p-5 bg-neutral-900 border border-white/15 rounded-[20px] shadow-xl flex flex-col gap-4 min-h-[340px] md:min-h-[400px]"
        >
          <div className="pb-2 border-b border-white/10 text-left">
            <h3 className="font-['Outfit'] text-[10px] font-black uppercase tracking-widest text-[#bcff00] flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Live Canvas Aspect-Ratio
            </h3>
          </div>

          <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center justify-center flex-1 min-h-[220px] relative overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTpl ? (
                <motion.div
                  key={selectedFrameId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
                  className="relative h-full max-h-[260px] border border-white/20 rounded-lg overflow-hidden shadow-2xl bg-black"
                >
                  {activeTpl.backgroundImage ? (
                    <img
                      src={activeTpl.backgroundImage}
                      className="absolute inset-0 w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="absolute inset-0 bg-black" />
                  )}

                  <div className="absolute inset-0 pointer-events-none select-none z-10">
                    {activeTpl.elements?.map((el: any) => {
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
                            <ImageIcon className="w-2.5 h-2.5 text-[#bcff00]" />
                          )}
                          {el.type === "qr" && (
                            <QrCode className="w-full h-full text-black" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {activeTpl.framePng && (
                    <img
                      src={activeTpl.framePng}
                      className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
                      alt=""
                    />
                  )}
                </motion.div>
              ) : (
                <div className="text-center font-['Outfit'] text-[10px] text-white/30">
                  NO PREVIEW
                </div>
              )}
            </AnimatePresence>
          </div>

          {activeTpl && (
            <div className="text-center py-2.5 bg-black/40 rounded-xl border border-white/5 shrink-0">
              <h4 className="text-xs font-black text-white uppercase tracking-wider font-['Outfit'] truncate px-2">
                {activeTpl.name}
              </h4>
              <p className="font-['Outfit'] text-[9px] text-[#bcff00] font-bold mt-0.5">
                {slots} CAPTURE SLOTS ACTIVE
              </p>
            </div>
          )}
        </motion.div>

        {/* [ CARD 2 ]: Desain Template Selection (Tengah) */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            show: { opacity: 1, y: 0 },
          }}
          className="p-5 bg-neutral-900 border border-white/15 rounded-[20px] shadow-xl flex flex-col gap-4 min-h-[300px] md:min-h-[400px]"
        >
          <div className="pb-2 border-b border-white/10 text-left">
            <h3 className="font-['Outfit'] text-[10px] font-black uppercase tracking-widest text-[#bcff00] flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Pilih Desain Template ({templates?.length || 0})
            </h3>
          </div>

          <div className="max-h-[320px] md:max-h-none md:flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin text-left">
            {templates && templates.length > 0 ? (
              templates.map((tpl: any) => {
                const isSelected = selectedFrameId === tpl.id;
                const tplSlots =
                  tpl.elements?.filter((el: any) => el.type === "photo")
                    .length || 0;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectCustomTemplate(tpl)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? "bg-[#bcff00] text-black border-[#bcff00] shadow-md"
                        : "bg-black/30 text-white border-white/5 hover:border-white/15 hover:bg-black/50"
                    }`}
                  >
                    <div className="space-y-0.5 pointer-events-none">
                      <p
                        className={`text-xs font-black uppercase tracking-wide font-['Outfit'] ${isSelected ? "text-black" : "text-white"}`}
                      >
                        {tpl.name}
                      </p>
                      <p
                        className={`text-[9px] font-['Outfit'] ${isSelected ? "text-black/60" : "text-white/45"}`}
                      >
                        {tpl.canvasWidth}×{tpl.canvasHeight} px • {tplSlots}{" "}
                        Foto
                      </p>
                    </div>
                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center text-[#bcff00]">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-12 font-['Outfit'] text-[10px] text-white/30">
                NO TEMPLATE
              </div>
            )}
          </div>
        </motion.div>

        {/* [ CARD 3 ]: Konfigurasi Perangkat (Kanan) */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            show: { opacity: 1, y: 0 },
          }}
          className="p-5 bg-neutral-900 border border-white/15 rounded-[20px] shadow-xl flex flex-col gap-4 min-h-[300px] md:min-h-[400px] text-left"
        >
          <div className="pb-2 border-b border-white/10">
            <h3 className="font-['Outfit'] text-[10px] font-black uppercase tracking-widest text-[#bcff00] flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Konfigurasi Perangkat
            </h3>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-5">
            {/* Countdown */}
            <div className="space-y-2">
              <label className="font-['Outfit'] text-[9px] font-bold text-white/40 uppercase tracking-widest block">
                Interval Countdown
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[3, 5, 7, 10].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setCountdownSeconds(sec)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-['Outfit'] text-[11px] font-bold uppercase transition border cursor-pointer ${
                      countdownSeconds === sec
                        ? "bg-white text-black border-white"
                        : "bg-black/30 text-white/60 border-white/5 hover:border-white/15"
                    }`}
                  >
                    <span>{sec} Dtk</span>
                    {countdownSeconds === sec && (
                      <div className="w-1.5 h-1.5 bg-black rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Camera Input */}
            <div className="space-y-2">
              <label className="font-['Outfit'] text-[9px] font-bold text-white/40 uppercase tracking-widest block">
                Input Kamera Hardware
              </label>
              {useSimulator ? (
                <div className="px-3 py-2.5 bg-black/40 border border-[#bcff00]/20 rounded-lg text-[10px] font-['Outfit'] font-bold text-[#bcff00] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#bcff00] rounded-full animate-pulse" />
                  DSLR SIMULATOR ACTIVE
                </div>
              ) : (
                <div className="relative bg-black/30 border border-white/5 rounded-lg px-3 py-2.5 focus-within:border-white transition">
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
                        {cam.label ||
                          `CAM-ID [${cam.deviceId.substring(0, 6)}]`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Kiosk Action Trigger */}
      <motion.div
        variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
        className="w-full shrink-0 relative z-10 pb-4 flex justify-center"
      >
        <motion.button
          onClick={handleStart}
          whileHover={{
            y: -2,
            scale: 1.02,
            boxShadow: "0 15px 35px rgba(188,255,0,0.3)",
          }}
          whileTap={{ scale: 0.98 }}
          className="w-full max-w-md py-4 bg-[#bcff00] hover:bg-white text-black font-['Outfit'] font-black uppercase tracking-widest text-xs rounded-[20px] shadow-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer px-8"
        >
          <Camera className="w-4 h-4 text-black animate-pulse" />
          Mulai Pemotretan
        </motion.button>
      </motion.div>

      {/* Toast Notification Alert */}
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
