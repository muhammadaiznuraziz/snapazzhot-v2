import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { supabase } from "../../lib/supabaseClient";
import {
  Camera,
  Image as ImageIcon,
  LayoutGrid,
  Printer,
  ArrowRight,
  QrCode,
  Sparkles,
  Heart,
  Eye,
  Calendar,
  Award,
  Layers,
  Globe,
  Download,
  Maximize2,
  Minimize2,
  Smartphone,
  Sparkle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "react-qr-code";
import SocialCards from "../../components/ui/card-fan-carousel";

const FALLBACK_PHOTOS: Record<string, string[]> = {
  "evt-wedding": [
    "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519225495810-7512c696505a?q=80&w=600&auto=format&fit=crop",
  ],
  "evt-graduation": [
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1525921429573-0aa899981521?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1532649538693-f3a2ec1bf8bd?q=80&w=600&auto=format&fit=crop",
  ],
  "evt-corporate": [
    "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop",
  ],
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

  const eventId = photo.eventId || "evt-wedding";
  const fallbacks =
    FALLBACK_PHOTOS[eventId] || FALLBACK_PHOTOS["evt-corporate"];
  const hash = photo.id
    .split("")
    .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);

  return fallbacks.map((url: string, index: number) => {
    const rotatedIndex = (index + hash) % fallbacks.length;
    return {
      id: `${photo.id}-raw-${index}`,
      url: fallbacks[rotatedIndex],
      parentPhoto: photo,
      index: index,
    };
  });
};

const IndividualPhotoCard = ({
  photo,
  likedPhotos,
  handleLike,
  setSelectedPhoto,
  events,
}: any) => {
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  const parent = photo.parentPhoto;
  const isLiked = likedPhotos.includes(parent.id);
  const matchingEvent = events.find((e: any) => e.id === parent.eventId);
  const eventName = matchingEvent ? matchingEvent.name : "Photo Booth Session";
  const formattedDate = new Date(parent.timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between cursor-pointer"
      onClick={() => setSelectedPhoto(photo)}
    >
      <div className="relative aspect-[3/4] bg-neutral-900/40 overflow-hidden flex items-center justify-center">
        {!isImgLoaded && (
          <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
            <Camera className="w-8 h-8 text-white/30 animate-pulse" />
          </div>
        )}

        <img
          src={photo.url}
          alt={`${eventName} frame`}
          loading="lazy"
          onLoad={() => setIsImgLoaded(true)}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isImgLoaded ? "opacity-100" : "opacity-0"}`}
        />

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPhoto(photo);
            }}
            className="p-3 bg-white text-blue-600 rounded-full hover:scale-110 transition active:scale-95"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLike(parent.id, e);
            }}
            className={`p-3 rounded-full hover:scale-110 transition active:scale-95 ${isLiked ? "bg-red-500 text-white" : "bg-white text-gray-800"}`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-t from-black/80 to-black/20 text-white flex flex-col gap-1.5 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#bcff00] overflow-hidden border border-white/30 flex items-center justify-center text-[10px] text-black font-bold">
            {parent.username ? parent.username.slice(0, 2).toUpperCase() : "G"}
          </div>
          <span className="text-xs font-semibold tracking-wide text-white/90">
            {parent.username || "Guest"}
          </span>
        </div>

        <div className="flex justify-between items-end mt-1">
          <div className="truncate pr-2 text-left">
            <h4 className="text-sm font-bold truncate max-w-[160px]">
              {eventName}
            </h4>
            <p className="text-[10px] text-white/60">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-2.5 bg-black/40 px-2.5 py-1 rounded-full border border-white/10 text-xs flex-shrink-0">
            <span className="flex items-center gap-1">
              <Heart
                className={`w-3.5 h-3.5 text-red-500 ${isLiked ? "fill-current" : ""}`}
              />
              <span className="font-mono text-[10px] font-bold">
                {parent.likeCount || 0}
              </span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function LandingPage() {
  const {
    events = [],
    photos = [],
    fetchInitialData,
    loading,
  } = useApp() as any;
  const navigate = useNavigate();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<
    "all" | "newest" | "popular" | "template" | "theme"
  >("all");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("all");
  const [selectedTheme, setSelectedTheme] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const [likedPhotos, setLikedPhotos] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [showFullStrip, setShowFullStrip] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .catch((err) => console.warn(err));
    } else {
      document.exitFullscreen();
    }
  };

  const onStartKiosk = () => navigate("/booth");
  const onOpenGallery = () => navigate("/gallery");

  const uniqueTemplates = useMemo(() => {
    const publicPhotos = (photos || []).filter((p: any) => p.isPublic === true);
    return Array.from(
      new Set(publicPhotos.map((p: any) => p.templateName).filter(Boolean)),
    ) as string[];
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    let list = (photos || []).filter((p: any) => p.isPublic === true);

    if (galleryFilter === "newest") {
      list = [...list].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    } else if (galleryFilter === "popular") {
      list = [...list].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    } else if (galleryFilter === "template" && selectedTemplate !== "all") {
      list = list.filter((p: any) => p.templateName === selectedTemplate);
    } else if (galleryFilter === "theme" && selectedTheme !== "all") {
      list = list.filter((p: any) => {
        const matchingEvent = (events || []).find(
          (e: any) => e.id === p.eventId,
        );
        return matchingEvent?.layoutType === selectedTheme;
      });
    }

    return list;
  }, [photos, galleryFilter, selectedTemplate, selectedTheme, events]);

  const individualPhotosList = useMemo(() => {
    const list: any[] = [];
    filteredPhotos.forEach((photo: any) => {
      const rawPhotos = getIndividualPhotos(photo);
      list.push(...rawPhotos);
    });
    return list;
  }, [filteredPhotos]);

  const carouselCards = useMemo(() => {
    const fallbackCards = [
      {
        imgUrl:
          "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=700&fit=crop",
        alt: "Demo 1",
      },
      {
        imgUrl:
          "https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?w=400&h=700&fit=crop",
        alt: "Demo 2",
      },
      {
        imgUrl:
          "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=700&fit=crop",
        alt: "Demo 3",
      },
    ];

    const dbCards = (individualPhotosList || []).map((photo: any) => ({
      imgUrl: photo.url,
      alt: photo.parentPhoto?.username || "Guest",
      onClick: () => {
        setSelectedPhoto(photo);
        setShowFullStrip(false);
      },
    }));

    return dbCards.length > 0
      ? dbCards
      : fallbackCards.map((c, idx) => ({
          ...c,
          onClick: () => {
            const mockPhoto = {
              id: `demo-${idx}`,
              url: c.imgUrl,
              username: "Inspirasi Pose",
              timestamp: new Date().toISOString(),
              likeCount: 42 + idx,
              isPublic: true,
              templateName: "Retro Frame",
              parentPhoto: {
                id: `demo-parent-${idx}`,
                url: c.imgUrl,
                username: "Inspirasi Pose",
                timestamp: new Date().toISOString(),
                likeCount: 42 + idx,
                templateName: "Retro Frame",
              },
            };
            setSelectedPhoto(mockPhoto);
            setShowFullStrip(false);
          },
        }));
  }, [individualPhotosList]);

  const visiblePhotos = useMemo(() => {
    return individualPhotosList.slice(0, visibleCount);
  }, [individualPhotosList, visibleCount]);

  const handleLike = async (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (likedPhotos.includes(photoId)) return;

    try {
      const { data: photoData, error: fetchErr } = await supabase
        .from("photos")
        .select("like_count")
        .eq("id", photoId)
        .single();
      
      if (fetchErr) throw fetchErr;

      const currentLikes = photoData?.like_count || 0;
      const { error: updateErr } = await supabase
        .from("photos")
        .update({ like_count: currentLikes + 1 })
        .eq("id", photoId);

      if (updateErr) throw updateErr;

      setLikedPhotos((prev) => [...prev, photoId]);
      if (fetchInitialData) await fetchInitialData();
    } catch (err) {
      console.warn("Failed to live-sync like event:", err);
      // Fallback local state if API fails
      setLikedPhotos((prev) => [...prev, photoId]);
    }
  };

  useEffect(() => {
    if (selectedPhoto) {
      const parentId = selectedPhoto.parentPhoto?.id || selectedPhoto.id;
      const updatedParent = (photos || []).find((p: any) => p.id === parentId);
      if (updatedParent) {
        setSelectedPhoto((prev: any) =>
          prev ? { ...prev, parentPhoto: updatedParent } : null,
        );
      }
    }
  }, [photos, selectedPhoto]);

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

      {/* Main Fluid Container */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 md:py-10 relative z-10 space-y-12 md:space-y-20 lg:space-y-28">
        {/* 1. HERO SECTION */}
        <section className="relative w-full">
          {/* Responsive Grid System: Mobile (1 Col) -> Tablet (1 Col/Stacked optimized) -> Laptop/Desktop (2 Equal Flex Blocks via 12-Col) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 lg:gap-12 items-center">
            {/* Left Content Column */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="grid grid-cols-1 lg:col-span-7 space-y-6 md:space-y-8 text-left"
            >
              <div className="space-y-1 md:space-y-2">
                <span className="block text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight italic text-[#bcff00] uppercase font-mono">
                  #SNAPAZZHOT
                </span>
                <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] text-white lowercase">
                  snapazzhot
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

              {/* CTAs: Flex Wrap auto-adapts on mobile screens */}
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
               <div className="flex justify-center mt-4">
                 <QRCode value={`${window.location.origin}/gallery`} size={128} />
               </div>
            </motion.div>

            {/* Right Card Stack Column: Fluid Height allocation dynamically scaled per screen profile */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="lg:col-span-5 relative w-full aspect-[4/5] sm:max-w-[400px] lg:max-w-none min-h-[380px] sm:min-h-[460px] md:min-h-[500px] lg:min-h-0 flex items-center justify-center mx-auto mt-6 sm:mt-10 lg:mt-0"
            >
              {/* Arrow Indicator: Hidden on Mobile & Tablets to maintain neatness */}
              <div className="absolute inset-0 pointer-events-none z-20 hidden lg:block">
                <svg
                  className="absolute top-[5%] left-[-10%] w-24 h-24 text-[#bcff00] animate-pulse"
                  viewBox="0 0 100 100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path
                    d="M10 50 C 40 20, 70 20, 80 40 C 85 50, 80 70, 60 75"
                    strokeLinecap="round"
                  />
                  <path d="M55 65 L 60 75 L 50 82" strokeLinecap="round" />
                </svg>
              </div>

              {/* Absolute Stack container wrapper */}
              <div className="relative w-full aspect-[3/4] max-w-[280px] sm:max-w-[320px] md:max-w-[340px]">
                {carouselCards.slice(0, 3).map((card, i) => {
                  const rotation =
                    i === 0 ? "-12deg" : i === 1 ? "-4deg" : "8deg";
                  const translationX =
                    i === 0 ? "-25px" : i === 1 ? "-5px" : "25px";
                  const zIndex = i === 0 ? "10" : i === 1 ? "20" : "30";
                  return (
                    <motion.div
                      key={i}
                      className={`absolute inset-0 origin-bottom transform z-${zIndex}`}
                      style={{ rotate: rotation, x: translationX }}
                      whileHover={{ scale: 1.06, zIndex: 50, rotate: "0deg" }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      <div
                        className={`w-full h-full rounded-2xl md:rounded-3xl overflow-hidden p-2.5 md:p-3 shadow-2xl flex flex-col justify-between ${i === 2 ? "bg-white/20 backdrop-blur-xl border-2 border-white/40" : "bg-white/10 backdrop-blur-md border border-white/20"}`}
                      >
                        <div className="aspect-[4/5] bg-neutral-900 rounded-xl md:rounded-2xl overflow-hidden">
                          <img
                            src={card.imgUrl}
                            className="w-full h-full object-cover"
                            alt={card.alt}
                            loading="eager"
                          />
                        </div>
                        <div className="pt-2 text-white text-[9px] md:text-[10px] font-mono flex justify-between px-1">
                          <span className="font-bold truncate max-w-[120px]">
                            {card.alt}
                          </span>
                          <span className="text-[#bcff00] font-bold flex-shrink-0">
                            LIVE SYNC
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
