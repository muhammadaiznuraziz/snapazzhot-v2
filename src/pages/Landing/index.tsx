import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { supabase } from "../../lib/supabaseClient";
import {
  Camera,
  Image as ImageIcon,
  ArrowRight,
  Eye,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";

// Helper SVG Generator untuk variasi bentuk frame tanpa database/external fetch
const generateDynamicShapeSVG = (type: "strip" | "polaroid" | "modern") => {
  let svgContent = "";

  if (type === "strip") {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450" fill="none">
      <rect width="100%" height="100%" fill="#111827"/>
      <rect x="20" y="20" width="260" height="110" rx="12" fill="#1f2937"/>
      <circle cx="150" cy="75" r="25" fill="#bcff00" opacity="0.8"/>
      <rect x="20" y="150" width="260" height="110" rx="12" fill="#1f2937"/>
      <path d="M100 220 L150 170 L200 220" stroke="#004ce5" stroke-width="8" stroke-linecap="round"/>
      <rect x="20" y="280" width="260" height="110" rx="12" fill="#1f2937"/>
      <rect x="60" y="320" width="180" height="30" rx="6" fill="#374151"/>
      <text x="150" y="425" text-anchor="middle" fill="#bcff00" font-family="monospace" font-size="12" font-weight="bold">CLASSIC 3-STRIP</text>
    </svg>`;
  } else if (type === "polaroid") {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="380" viewBox="0 0 300 380" fill="none">
      <rect width="100%" height="100%" fill="#f8fafc" rx="16"/>
      <rect x="20" y="20" width="260" height="260" rx="8" fill="#0f172a"/>
      <circle cx="150" cy="150" r="60" fill="#38bdf8" opacity="0.3"/>
      <path d="M110 180 Q150 110 190 180" stroke="#38bdf8" stroke-width="6" fill="none"/>
      <text x="150" y="330" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-size="16" font-weight="800">POLAROID SQUARE</text>
      <text x="150" y="352" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="10">#SNAPAZZHOT-2026</text>
    </svg>`;
  } else {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400" fill="none">
      <rect width="100%" height="100%" fill="#09090b"/>
      <rect x="12" y="12" width="276" height="376" rx="16" fill="#18181b" stroke="#bcff00" stroke-width="2" stroke-dasharray="6 6"/>
      <circle cx="150" cy="160" r="50" fill="#bcff00" opacity="0.2"/>
      <path d="M120 250 L180 250 M150 220 L150 280" stroke="#bcff00" stroke-width="4" stroke-linecap="round"/>
      <text x="150" y="340" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="14" font-weight="bold">MODERN 4:5 FRAME</text>
    </svg>`;
  }

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
};

const getIndividualPhotos = (photo: any) => {
  if (
    photo.meta?.rawPhotos &&
    Array.isArray(photo.meta.rawPhotos) &&
    photo.meta.rawPhotos.length > 0
  ) {
    return photo.meta.rawPhotos.map((url: string, index: number) => ({
      id: `${photo.id}-raw-${index}`,
      url: url,
      parentPhoto: photo,
      index: index,
    }));
  }

  // Fallback: use the photo URL from Supabase directly.
  // Every photo stored in the database already has a public URL from Supabase Storage.
  return [
    {
      id: `${photo.id}-raw-0`,
      url: photo.url,
      parentPhoto: photo,
      index: 0,
    },
  ];
};

export default function LandingPage() {
  const { events = [], photos = [] } = useApp() as any;
  const navigate = useNavigate();

  const [galleryFilter] = useState<"all" | "newest" | "popular">("all");
  const [likedPhotos, setLikedPhotos] = useState<string[]>([]);
  const [, setSelectedPhoto] = useState<any | null>(null);

  const onStartKiosk = () => navigate("/booth");
  const onOpenGallery = () => navigate("/gallery");

  // Config tumpukan kartu dengan variasi bentuk visual (Strip, Polaroid, Modern 4:5)
  const heroShapeCards = useMemo(
    () => [
      {
        id: "card-strip",
        title: "Photo Strip 2x6",
        aspectRatio: "aspect-[1/2]",
        rotation: "-14deg",
        translationX: "-35px",
        translationY: "10px",
        zIndex: 10,
        imgUrl: generateDynamicShapeSVG("strip"),
        containerClass:
          "bg-black/50 backdrop-blur-md border border-white/20 p-2 rounded-xl",
      },
      {
        id: "card-polaroid",
        title: "Polaroid Vintage",
        aspectRatio: "aspect-[4/5]",
        rotation: "-2deg",
        translationX: "-5px",
        translationY: "-15px",
        zIndex: 20,
        imgUrl: generateDynamicShapeSVG("polaroid"),
        containerClass:
          "bg-white text-black shadow-2xl p-3 rounded-2xl border border-white",
      },
      {
        id: "card-modern",
        title: "Modern Live Frame",
        aspectRatio: "aspect-[3/4]",
        rotation: "12deg",
        translationX: "30px",
        translationY: "5px",
        zIndex: 30,
        imgUrl: generateDynamicShapeSVG("modern"),
        containerClass:
          "bg-white/20 backdrop-blur-xl border-2 border-[#bcff00] p-2.5 rounded-3xl shadow-2xl",
      },
    ],
    [],
  );

  const filteredPhotos = useMemo(() => {
    let list = (photos || []).filter((p: any) => p.isPublic === true);
    if (galleryFilter === "newest") {
      list = [...list].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    } else if (galleryFilter === "popular") {
      list = [...list].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    }
    return list;
  }, [photos, galleryFilter]);

  const individualPhotosList = useMemo(() => {
    const list: any[] = [];
    filteredPhotos.forEach((photo: any) => {
      const rawPhotos = getIndividualPhotos(photo);
      list.push(...rawPhotos);
    });
    return list;
  }, [filteredPhotos]);

  const handleLike = async (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (likedPhotos.includes(photoId)) return;

    setLikedPhotos((prev) => [...prev, photoId]);

    try {
      const { data: photoData, error: fetchErr } = await supabase
        .from("photos")
        .select("like_count")
        .eq("id", photoId)
        .single();

      if (fetchErr) throw fetchErr;

      const currentLikes = photoData?.like_count || 0;
      await supabase
        .from("photos")
        .update({ like_count: currentLikes + 1 })
        .eq("id", photoId);
    } catch (err) {
      console.warn("Failed to live-sync like event:", err);
      setLikedPhotos((prev) => prev.filter((id) => id !== photoId));
    }
  };

  return (
    <div className="min-h-screen bg-[#004ce5] text-white font-sans selection:bg-[#bcff00] selection:text-black relative overflow-hidden">
      {/* Blueprint Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15] z-0"
        style={{
          backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Main Container */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 md:py-10 relative z-10 space-y-12 md:space-y-20 lg:space-y-28">
        {/* HERO SECTION */}
        <section className="relative w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 lg:gap-12 items-center">
            {/* Left Column: CTA & Headline */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="grid grid-cols-1 lg:col-span-7 space-y-6 md:space-y-8 text-left"
            >
              <div className="space-y-1 md:space-y-2">
                <h1 className="block text-2xl sm:text-4xl md:text-5xl lg:text-8xl font-extrabold tracking-tight italic text-[#bcff00] uppercase font-mono">
                  #SNAPAZZHOT
                </h1>
              </div>

              <p className="text-white/80 text-sm sm:text-base md:text-lg lg:text-xl max-w-2xl leading-relaxed font-medium">
                Software photo booth premium dengan cetak otomatis berkecepatan
                tinggi, looping GIF otomatis, tangkapan video{" "}
                <span className="font-bold text-white underline decoration-lime-400 decoration-2">
                  Behind The Scenes
                </span>
                , dan QR Code instan untuk mempercantik momen spesial Anda.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <motion.button
                  onClick={onStartKiosk}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 md:px-8 py-3.5 md:py-4 bg-black hover:bg-neutral-900 text-white font-bold rounded-full transition cursor-pointer flex items-center justify-center gap-2 shadow-2xl text-sm md:text-base"
                >
                  Mulai Sesi Foto
                  <ArrowRight className="w-5 h-5" />
                </motion.button>

                <motion.button
                  onClick={onOpenGallery}
                  whileHover={{
                    scale: 1.02,
                    backgroundColor: "rgba(255,255,255,0.15)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 md:px-8 py-3.5 md:py-4 bg-transparent border-2 border-white text-white font-bold rounded-full transition cursor-pointer flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  Lihat Galeri Cetak
                  <ImageIcon className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </motion.div>

            {/* Right Column: Dynamic Shape Card Stack */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="lg:col-span-5 relative w-full aspect-[4/5] sm:max-w-[400px] lg:max-w-none min-h-[400px] sm:min-h-[480px] md:min-h-[520px] lg:min-h-0 flex items-center justify-center mx-auto mt-6 sm:mt-10 lg:mt-0"
            >
              {/* Stack Container */}
              <div className="relative w-full aspect-[3/4] max-w-[280px] sm:max-w-[320px] md:max-w-[350px] flex items-center justify-center">
                {heroShapeCards.map((card) => (
                  <motion.div
                    key={card.id}
                    className="absolute inset-x-0 mx-auto w-full max-w-[240px] sm:max-w-[270px] origin-center transform"
                    style={{
                      rotate: card.rotation,
                      x: card.translationX,
                      y: card.translationY,
                      zIndex: card.zIndex,
                    }}
                    whileHover={{
                      scale: 1.08,
                      zIndex: 50,
                      rotate: "0deg",
                      y: -10,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 280,
                      damping: 18,
                    }}
                  >
                    <div
                      className={`w-full h-full ${card.containerClass} shadow-2xl transition-all duration-300`}
                    >
                      <div
                        className={`w-full ${card.aspectRatio} overflow-hidden rounded-lg relative bg-neutral-950 flex items-center justify-center`}
                      >
                        <img
                          src={card.imgUrl}
                          className="w-full h-full object-cover select-none pointer-events-none"
                          alt={card.title}
                          loading="eager"
                        />
                      </div>
                      <div className="pt-2 text-[10px] font-mono flex justify-between items-center px-1">
                        <span className="font-bold truncate opacity-90 tracking-wider uppercase">
                          {card.title}
                        </span>
                        <span className="text-[#bcff00] bg-black/60 px-1.5 py-0.5 rounded font-bold text-[8px] flex-shrink-0">
                          LIVE
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* GALLERY GRID PREVIEW */}
        {individualPhotosList.length > 0 && (
          <section className="space-y-6">
            <h3 className="text-xl md:text-2xl font-bold tracking-tight uppercase font-mono text-[#bcff00]">
              Hasil Cetak Sesi Terakhir
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {individualPhotosList.slice(0, 4).map((photo: any) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 hover:scale-[1.02] transition cursor-pointer"
                >
                  <div className="aspect-[3/4] bg-neutral-900 rounded-xl overflow-hidden mb-3">
                    <img
                      src={photo.url}
                      alt="Gallery Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="truncate">
                      {photo.parentPhoto?.username || "Guest"}
                    </span>
                    <button
                      onClick={(e) => handleLike(photo.parentPhoto?.id, e)}
                      className="flex items-center gap-1 text-red-400"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>{photo.parentPhoto?.likeCount || 0}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
