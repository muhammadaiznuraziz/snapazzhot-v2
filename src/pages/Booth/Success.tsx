import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { BoothContextType } from "../../layouts/BoothLayout";
import { CheckCircle, Home, QrCode } from "lucide-react";
import { motion } from "framer-motion";

export default function BoothSuccess() {
  const context = useOutletContext<BoothContextType>();
  const navigate = useNavigate();

  const { activeEvent, compiledPhotoRecord } = context;

  const [countdown, setCountdown] = useState(25);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/booth");
    }, 25000);

    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [navigate]);

  const getBaseUrl = () => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    if (origin.includes("localhost") || origin.includes("127.0.0.1") || origin.startsWith("http://192.")) {
      return "https://snapazzhot-v2.vercel.app"; 
    }
    return origin;
  };

  const downloadUrl = compiledPhotoRecord?.id
    ? `${getBaseUrl()}/download/${compiledPhotoRecord.id}`
    : "";

  const qrFallbackUrl = downloadUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(downloadUrl)}&color=000000&bgcolor=ffffff`
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="w-full h-[100dvh] bg-[#0038FF] text-white flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 overflow-hidden font-sans box-border relative select-none"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,255,0,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(0,46,214,0.8),transparent_70%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 80, damping: 15 }}
        className="max-w-3xl w-full glass-panel border border-white/25 rounded-[32px] p-6 md:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.4)] relative z-10 flex flex-col gap-6"
      >
        {/* TOP HEADER SUMMARY */}
        <div className="flex items-center gap-4 border-b border-white/15 pb-5 shrink-0 text-left">
          <motion.div
            initial={{ rotate: -15, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 10,
              delay: 0.2,
            }}
            className="h-16 w-16 bg-[#CCFF00] text-black rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_25px_rgba(204,255,0,0.4)]"
          >
            <CheckCircle className="w-8 h-8 stroke-[3]" />
          </motion.div>
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
              THANK YOU! <span className="text-[#CCFF00]">MOMENT SAVED.</span>
            </h2>
            <p className="text-xs text-white/80 leading-relaxed font-bold uppercase tracking-wide">
              Your photo session is complete. Scan the QR code to instantly download your digital files.
            </p>
          </div>
        </div>

        {/* TWO-COLUMN HORIZONTAL GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* COLUMN 1: INTERACTIVE QR CONTROLLER */}
          <div className="bg-black/30 border border-white/15 p-6 rounded-[24px] flex flex-col items-center justify-center text-center gap-4 shadow-inner">
            <div className="bg-white p-3 rounded-2xl border border-white/20 inline-block shadow-2xl transition transform hover:scale-105 duration-300 min-h-[160px] min-w-[160px] flex items-center justify-center">
              {downloadUrl ? (
                <img
                  src={qrFallbackUrl}
                  alt="Scan to Download"
                  className="w-36 h-36 object-contain mx-auto"
                  loading="eager"
                />
              ) : (
                <div className="text-xs text-neutral-900 font-bold p-4 text-center">
                  Generating QR Code...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#CCFF00] flex items-center justify-center gap-1.5">
                <QrCode className="w-4 h-4" />
                SCAN TO DOWNLOAD SOFT-FILE
              </h4>
              <p className="text-[10px] text-white/70 leading-relaxed font-bold uppercase tracking-wide max-w-[260px] mx-auto">
                Includes Collage Frame, BTS Looping GIF Animation, and single pose files.
              </p>
            </div>

            {downloadUrl && (
              <button
                onClick={() => window.open(downloadUrl, "_blank")}
                className="px-5 py-2.5 bg-white/10 hover:bg-[#CCFF00] text-white hover:text-black font-extrabold text-[10px] uppercase tracking-widest rounded-full transition shadow-md cursor-pointer border border-white/20"
              >
                OPEN PORTAL ↗
              </button>
            )}
          </div>

          {/* COLUMN 2: TRANSACTION METADATA & STATUS CHECK */}
          <div className="flex flex-col justify-between gap-4">
            <div className="p-6 bg-black/30 border border-white/15 rounded-[24px] space-y-4 text-left shadow-inner flex-1 flex flex-col justify-center">
              <div className="flex justify-between text-xs font-black text-white/60 uppercase tracking-wider border-b border-white/15 pb-3">
                <span>KIOSK SESSION DETAIL</span>
                <span className="text-[#CCFF00] font-black">
                  {downloadUrl ? "SYNC COMPLETED" : "SYNCHRONIZING..."}
                </span>
              </div>

              <div className="space-y-3 text-sm text-white/80">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-white/60 font-black uppercase tracking-wider text-xs">
                    EVENT:
                  </span>
                  <span className="font-black text-white text-sm truncate max-w-[180px] text-right uppercase tracking-wide">
                    {activeEvent?.name || "Kiosk Session"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 font-black uppercase tracking-wider text-xs">
                    SERVICE:
                  </span>
                  <span className="text-xs uppercase font-black text-[#CCFF00] bg-[#CCFF00]/15 border border-[#CCFF00]/30 px-3 py-1 rounded-full">
                    SNAPAZZHOT CORE
                  </span>
                </div>
              </div>
            </div>

            {/* Timeout redirect indicator banner */}
            <div className="text-[10px] text-white/80 font-black uppercase tracking-widest bg-black/30 border border-white/15 px-4 py-4 rounded-[24px] inline-block w-full text-center shadow-inner">
              RETURNING TO HOME IN{" "}
              <span className="text-[#CCFF00] font-black font-mono text-sm px-1">
                {countdown}
              </span>{" "}
              SECONDS...
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="shrink-0 pt-1">
          <motion.button
            onClick={() => navigate("/booth")}
            whileHover={{
              y: -2,
              scale: 1.01,
              boxShadow: "0 15px 35px rgba(204,255,0,0.3)",
            }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-4 bg-[#CCFF00] hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer w-full"
          >
            <Home className="w-4 h-4 text-black stroke-[3]" />
            <span>RETURN TO HOME SCREEN</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}