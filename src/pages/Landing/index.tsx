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
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

// Helper SVG Generator untuk variasi bentuk frame tanpa database/external fetch
const generateDynamicShapeSVG = (type: "strip" | "polaroid" | "modern") => {
  let svgContent = "";

  if (type === "strip") {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450" fill="none">
      <rect width="100%" height="100%" fill="#111111"/>
      <rect x="20" y="20" width="260" height="110" rx="16" fill="#1A1A1A"/>
      <circle cx="150" cy="75" r="25" fill="#CCFF00" opacity="0.9"/>
      <rect x="20" y="150" width="260" height="110" rx="16" fill="#1A1A1A"/>
      <path d="M100 220 L150 170 L200 220" stroke="#0038FF" stroke-width="8" stroke-linecap="round"/>
      <rect x="20" y="280" width="260" height="110" rx="16" fill="#1A1A1A"/>
      <rect x="60" y="320" width="180" height="30" rx="8" fill="#222222"/>
      <text x="150" y="425" text-anchor="middle" fill="#CCFF00" font-family="monospace" font-size="12" font-weight="bold">CLASSIC 3-STRIP</text>
    </svg>`;
  } else if (type === "polaroid") {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="380" viewBox="0 0 300 380" fill="none">
      <rect width="100%" height="100%" fill="#FFFFFF" rx="24"/>
      <rect x="20" y="20" width="260" height="260" rx="16" fill="#111111"/>
      <circle cx="150" cy="150" r="60" fill="#0038FF" opacity="0.4"/>
      <path d="M110 180 Q150 110 190 180" stroke="#CCFF00" stroke-width="6" fill="none"/>
      <text x="150" y="330" text-anchor="middle" fill="#111111" font-family="sans-serif" font-size="16" font-weight="800">POLAROID SQUARE</text>
      <text x="150" y="352" text-anchor="middle" fill="#6C757D" font-family="monospace" font-size="10">#SNAPAZZHOT-2026</text>
    </svg>`;
  } else {
    svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400" fill="none">
      <rect width="100%" height="100%" fill="#111111" rx="24"/>
      <rect x="12" y="12" width="276" height="376" rx="20" fill="#1A1A1A" stroke="#CCFF00" stroke-width="2" stroke-dasharray="8 8"/>
      <circle cx="150" cy="160" r="50" fill="#0038FF" opacity="0.4"/>
      <path d="M120 250 L180 250 M150 220 L150 280" stroke="#CCFF00" stroke-width="4" stroke-linecap="round"/>
      <text x="150" y="340" text-anchor="middle" fill="#FFFFFF" font-family="monospace" font-size="14" font-weight="bold">MODERN 4:5 FRAME</text>
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

  const heroShapeCards = useMemo(
    () => [
      {
        id: "card-strip",
        title: "Photo Strip 2x6",
        aspectRatio: "aspect-[1/2]",
        rotation: "-12deg",
        translationX: "-30px",
        translationY: "10px",
        zIndex: 10,
        imgUrl: generateDynamicShapeSVG("strip"),
        containerClass: "glass-panel p-3 shadow-[0_20px_40px_rgba(0,0,0,0.2)]",
      },
      {
        id: "card-polaroid",
        title: "Polaroid Vintage",
        aspectRatio: "aspect-[4/5]",
        rotation: "-3deg",
        translationX: "0px",
        translationY: "-15px",
        zIndex: 20,
        imgUrl: generateDynamicShapeSVG("polaroid"),
        containerClass:
          "bg-white text-black shadow-[0_25px_50px_rgba(0,0,0,0.25)] p-3.5 rounded-[32px] border border-neutral-200",
      },
      {
        id: "card-modern",
        title: "Modern Live Frame",
        aspectRatio: "aspect-[3/4]",
        rotation: "10deg",
        translationX: "32px",
        translationY: "5px",
        zIndex: 30,
        imgUrl: generateDynamicShapeSVG("modern"),
        containerClass:
          "glass-panel border-2 border-[#CCFF00] p-3 shadow-[0_25px_50px_rgba(0,56,255,0.25)]",
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
    <div className="min-h-screen bg-[#0038FF] text-white font-sans selection:bg-[#CCFF00] selection:text-black relative overflow-hidden">
      {/* Background Gradient & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,255,0,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(0,46,214,0.8),transparent_70%)] pointer-events-none z-0" />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08] z-0"
        style={{
          backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-8 md:px-12 py-8 md:py-16 relative z-10 space-y-16 md:space-y-24">
        {/* HERO SECTION */}
        <section className="relative w-full pt-4 md:pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: CTA & Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="lg:col-span-7 space-y-6 md:space-y-8 text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 glass-pill text-xs font-bold tracking-widest uppercase text-[#CCFF00]">
                <Sparkles className="w-5.5 h-5.5 animate-pulse" />
                <span>SNAPAZZHOT</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase text-white leading-[0.95]">
                  READY <br />
                  <span className="text-[#CCFF00]">TO SNAP?</span>
                </h1>
              </div>

              <p className="text-white/80 text-base md:text-lg lg:text-xl max-w-xl leading-relaxed font-normal">
                Capture your moment. Make it yours. High-speed instant printing,
                automated looping GIFs, and immersive Behind-The-Scenes video
                footage crafted for modern event experiences.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <motion.button
                  onClick={onStartKiosk}
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 bg-[#CCFF00] hover:bg-white text-black font-extrabold rounded-full transition-all duration-300 shadow-[0_10px_25px_rgba(204,255,0,0.3)] flex items-center justify-center gap-3 text-sm md:text-base uppercase tracking-wider cursor-pointer"
                >
                  <span>START SHOOT</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </motion.button>

                <motion.button
                  onClick={onOpenGallery}
                  whileHover={{
                    y: -2,
                    scale: 1.02,
                    backgroundColor: "rgba(255,255,255,0.15)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-extrabold rounded-full transition-all duration-300 flex items-center justify-center gap-3 text-sm md:text-base uppercase tracking-wider cursor-pointer backdrop-blur-md"
                >
                  <ImageIcon className="w-5 h-5" />
                  <span>Explore Gallery</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Right Column: Dynamic Shape Card Stack */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="lg:col-span-5 relative w-full aspect-[4/5] max-w-[420px] lg:max-w-none flex items-center justify-center mx-auto"
            >
              <div className="relative w-full aspect-[3/4] max-w-[320px] md:max-w-[360px] flex items-center justify-center">
                {heroShapeCards.map((card) => (
                  <motion.div
                    key={card.id}
                    className="absolute inset-x-0 mx-auto w-full max-w-[260px] sm:max-w-[290px] origin-center transform"
                    style={{
                      rotate: card.rotation,
                      x: card.translationX,
                      y: card.translationY,
                      zIndex: card.zIndex,
                    }}
                    whileHover={{
                      scale: 1.06,
                      zIndex: 50,
                      rotate: "0deg",
                      y: -12,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                  >
                    <div
                      className={`w-full h-full ${card.containerClass} transition-all duration-300 rounded-[32px] overflow-hidden`}
                    >
                      <div
                        className={`w-full ${card.aspectRatio} overflow-hidden rounded-[24px] relative bg-neutral-950 flex items-center justify-center`}
                      >
                        <img
                          src={card.imgUrl}
                          className="w-full h-full object-cover select-none pointer-events-none"
                          alt={card.title}
                          loading="eager"
                        />
                      </div>
                      <div className="pt-3 pb-1 text-xs font-mono flex justify-between items-center px-2">
                        <span className="font-extrabold uppercase tracking-wider">
                          {card.title}
                        </span>
                        <span className="text-[#CCFF00] bg-black/50 px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider">
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
      </div>
    </div>
  );
}
