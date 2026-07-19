import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { BoothContextType } from "../../layouts/BoothLayout";
import { CheckCircle, Home, QrCode } from "lucide-react";
import { motion } from "motion/react";

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

  // Safely generate download URL only on client side
  const downloadUrl = typeof window !== "undefined"
    ? `${window.location.origin}/download/${compiledPhotoRecord?.id || "photo-dummy"}`
    : "";
  // Generate QR image URL for fallback (used only if client cannot render QR component)
  const qrFallbackUrl = downloadUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(downloadUrl)}&color=000000&bgcolor=ffffff`
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="w-full h-[100dvh] bg-[#004ce5] text-white flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 overflow-hidden font-['Outfit'] box-border relative select-none"
    >
      {/* Background Matrix Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 80, damping: 15 }}
        className="max-w-3xl w-full bg-neutral-900 border border-white/15 rounded-[24px] p-6 md:p-8 shadow-2xl relative z-10 flex flex-col gap-6"
      >
        {/* TOP HEADER SUMMARY */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-4 shrink-0 text-left">
          <motion.div
            initial={{ rotate: -15, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 10,
              delay: 0.2,
            }}
            className="h-14 w-14 bg-[#bcff00] text-black rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(188,255,0,0.3)]"
          >
            <CheckCircle className="w-7 h-7 stroke-[3]" />
          </motion.div>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-black text-white tracking-wide uppercase">
              TERIMA KASIH!
            </h2>
            <p className="text-xs text-white/50 leading-normal font-bold uppercase tracking-wide">
              Sesi pemotretan selesai. Pindai kode QR untuk mengunduh seluruh
              berkas digital Anda secara instan.
            </p>
          </div>
        </div>

        {/* TWO-COLUMN HORIZONTAL GRID TO PREVENT VERTICAL OVERFLOW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* COLUMN 1: INTERACTIVE QR CONTROLLER */}
          <div className="bg-black/40 border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-4 shadow-sm">
            <div className="bg-white p-2.5 rounded-xl border border-white/10 inline-block shadow-lg transition transform hover:scale-105 duration-300">
              <img
                src={qrFallbackUrl}
                alt="Scan to Download"
                className="w-36 h-36 object-contain mx-auto"
                loading="eager"
              />
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#bcff00] flex items-center justify-center gap-1.5">
                <QrCode className="w-4 h-4" />
                SCAN TO DOWNLOAD SOFT-FILE
              </h4>
              <p className="text-[10px] text-white/40 leading-relaxed font-bold uppercase tracking-wide max-w-[260px] mx-auto">
                Termasuk Collage Frame, BTS Looping GIF Animasi, dan berkas foto
                pose tunggal.
              </p>
            </div>

            {compiledPhotoRecord?.id && (
              <button
                onClick={() => window.open(downloadUrl, "_blank")}
                className="px-4 py-2 bg-white/10 hover:bg-[#bcff00] text-white hover:text-black font-['Outfit'] font-black text-[10px] uppercase tracking-widest rounded-lg transition shadow-sm cursor-pointer"
              >
                BUKA PORTAL PORTABLE ↗
              </button>
            )}
          </div>

          {/* COLUMN 2: TRANSACTION METADATA & STATUS CHECK */}
          <div className="flex flex-col justify-between gap-4">
            <div className="p-5 bg-black/40 border border-white/5 rounded-2xl space-y-4 text-left shadow-sm flex-1 flex flex-col justify-center">
              <div className="flex justify-between text-xs font-black text-white/40 uppercase tracking-wider border-b border-white/10 pb-2.5">
                <span>DETAIL SESI KIOSK</span>
                <span className="text-[#bcff00] font-black">
                  SYNC COMPLETED
                </span>
              </div>

              <div className="space-y-3 text-sm text-white/60">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-white/40 font-black uppercase tracking-wider text-xs">
                    EVENT:
                  </span>
                  <span className="font-black text-white text-sm truncate max-w-[160px] text-right uppercase tracking-wide">
                    {activeEvent?.name || "Kiosk Session"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/40 font-black uppercase tracking-wider text-xs">
                    LAYANAN:
                  </span>
                  <span className="text-xs uppercase font-black text-[#bcff00] bg-[#bcff00]/10 border border-[#bcff00]/20 px-2.5 py-1 rounded-md">
                    SNAPAZZHOT CORE
                  </span>
                </div>
              </div>
            </div>

            {/* Timeout redirect indicator banner */}
            <div className="text-[10px] text-white/50 font-black uppercase tracking-widest bg-black/40 border border-white/5 px-4 py-3.5 rounded-2xl inline-block w-full text-center shadow-inner">
              KEMBALI KE BERANDA DALAM{" "}
              <span className="text-[#bcff00] font-black font-mono text-sm px-1">
                {countdown}
              </span>{" "}
              DETIK...
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="shrink-0 pt-2">
          <motion.button
            onClick={() => navigate("/booth")}
            whileHover={{
              y: -2,
              scale: 1.01,
              boxShadow: "0 12px 35px rgba(188,255,0,0.25)",
            }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-4 bg-[#bcff00] text-black font-['Outfit'] font-black uppercase tracking-widest text-xs rounded-xl shadow-xl transition flex items-center justify-center gap-2 cursor-pointer w-full"
          >
            <Home className="w-4 h-4 text-black stroke-[3]" />
            KEMBALI KE HALAMAN UTAMA
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
