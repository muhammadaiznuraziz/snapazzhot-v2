import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import {
  RefreshCw,
  Download,
  Eye,
  Sparkles,
  Filter,
  Calendar,
  Heart,
  Award,
  Layers,
  Camera,
  Globe,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  heightClass,
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
      className={`group relative w-full ${heightClass} rounded-[16px] overflow-hidden shadow-xl bg-neutral-900 cursor-pointer pointer-events-auto filter brightness-100 contrast-100 hover:brightness-105 hover:contrast-105 transition-all duration-300`}
      onClick={() => setSelectedPhoto(photo)}
      whileHover={{
        scale: 1.05,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none z-10" />

      {!isImgLoaded && (
        <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
          <Camera className="w-8 h-8 text-white/30" />
        </div>
      )}

      <img
        src={photo.url}
        alt={`${eventName} frame`}
        loading="lazy"
        onLoad={() => setIsImgLoaded(true)}
        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isImgLoaded ? "opacity-100" : "opacity-0"}`}
      />

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 z-20">
        <button className="p-3 bg-white text-[#004ce5] rounded-full hover:scale-110 transition active:scale-95">
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

      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent text-white flex flex-col gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#bcff00] flex items-center justify-center text-[9px] text-black font-bold">
            {parent.username ? parent.username.slice(0, 2).toUpperCase() : "G"}
          </div>
          <span className="text-[11px] font-semibold text-white/90">
            {parent.username || "Guest"}
          </span>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <h4 className="text-xs font-bold truncate max-w-[120px] text-white">
              {eventName}
            </h4>
            <p className="text-[9px] text-white/50 font-mono">
              {formattedDate}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-2 py-0.5 rounded-full border border-white/15 text-[10px]">
            <span className="flex items-center gap-0.5">
              <Heart
                className={`w-3 h-3 text-red-500 ${isLiked ? "fill-current" : ""}`}
              />
              <span className="font-mono">{parent.likeCount || 0}</span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function Gallery() {
  const { photos, events, fetchInitialData, loading } = useApp() as any;
  const navigate = useNavigate();
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [likedPhotos, setLikedPhotos] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [showFullStrip, setShowFullStrip] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(24);

  // Preset tinggi acak Pinterest-style antara 220px hingga 520px
  const heightPresets = [
    "h-[240px] sm:h-[320px] md:h-[420px]",
    "h-[320px] sm:h-[460px] md:h-[520px]",
    "h-[220px] sm:h-[280px] md:h-[360px]",
    "h-[380px] sm:h-[480px] md:h-[500px]",
    "h-[260px] sm:h-[340px] md:h-[400px]",
    "h-[300px] sm:h-[400px] md:h-[460px]",
  ];

  // Efek paralaks linear asimetris per lajur kolom (Otomatis dijaga agar sinkron)
  const columnEffects = [
    {
      animate: { y: [0, -35, 0] },
      transition: { duration: 25, repeat: Infinity, ease: "linear" },
    },
    {
      animate: { y: [-40, 5, -40] },
      transition: { duration: 30, repeat: Infinity, ease: "linear" },
    },
    {
      animate: { y: [0, -20, 0] },
      transition: { duration: 22, repeat: Infinity, ease: "linear" },
    },
    {
      animate: { y: [-30, 15, -30] },
      transition: { duration: 28, repeat: Infinity, ease: "linear" },
    },
    {
      animate: { y: [-15, -50, -15] },
      transition: { duration: 32, repeat: Infinity, ease: "linear" },
    },
    {
      animate: { y: [-45, 0, -45] },
      transition: { duration: 24, repeat: Infinity, ease: "linear" },
    },
  ];

  useEffect(() => {
    const list = localStorage.getItem("snapazzhot_liked_photos");
    if (list) {
      try {
        setLikedPhotos(JSON.parse(list));
      } catch (err) {
        setLikedPhotos([]);
      }
    }
  }, []);

  const handleLike = async (photoId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (likedPhotos.includes(photoId)) return;

    try {
      const res = await fetch(`/api/gallery/${photoId}/like`, {
        method: "POST",
      });
      const d = await res.json();
      if (d.success) {
        const updated = [...likedPhotos, photoId];
        setLikedPhotos(updated);
        localStorage.setItem(
          "snapazzhot_liked_photos",
          JSON.stringify(updated),
        );
        if (fetchInitialData) await fetchInitialData();
      }
    } catch (err) {
      console.warn("Failed to like photo", err);
    }
  };

  const filteredPhotos = useMemo(() => {
    const publicPhotos = (photos || []).filter((p: any) => p.isPublic === true);
    if (selectedEventId === "all") return publicPhotos;
    return publicPhotos.filter((p: any) => p.eventId === selectedEventId);
  }, [photos, selectedEventId]);

  const individualPhotosList = useMemo(() => {
    return (filteredPhotos || []).flatMap((p: any) => getIndividualPhotos(p));
  }, [filteredPhotos]);

  const visiblePhotos = useMemo(() => {
    return individualPhotosList.slice(0, visibleCount);
  }, [individualPhotosList, visibleCount]);

  // ENGINE MASONRY: Distribusi data secara merata ke dalam 6 lajur kolom
  const columnsData = useMemo(() => {
    const cols: any[][] = [[], [], [], [], [], []];
    visiblePhotos.forEach((photo, idx) => {
      cols[idx % 6].push({
        ...photo,
        heightClass: heightPresets[idx % heightPresets.length],
      });
    });
    return cols;
  }, [visiblePhotos]);

  return (
    <div className="min-h-screen bg-[#004ce5] text-white font-sans selection:bg-[#bcff00] selection:text-black relative overflow-hidden py-12 md:py-20 px-4 sm:px-6 lg:px-8">
      {/* BACKGROUND MASONRY PARALLAX ENGINE */}
      <div className="absolute inset-0 w-full h-full grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 p-4 z-0 opacity-40 pointer-events-none scale-105 select-none [@media(prefers-reduced-motion:reduce)]:animate-none">
        {columnsData.map((colItems, colIdx) => (
          <motion.div
            key={`bg-col-${colIdx}`}
            animate={columnEffects[colIdx].animate}
            transition={columnEffects[colIdx].transition}
            className={`flex flex-col gap-4 ${
              colIdx >= 2 && colIdx < 4
                ? "hidden sm:flex"
                : colIdx >= 4
                  ? "hidden md:flex"
                  : "flex"
            }`}
          >
            {/* Duplikasi array menjamin infinite track visual tidak terputus */}
            {[...colItems, ...colItems].map((item, itemIdx) => (
              <div
                key={`bg-img-${item.id}-${itemIdx}`}
                className={`relative w-full ${item.heightClass} rounded-[16px] overflow-hidden bg-white/5 border border-white/5 shadow-inner`}
              >
                <img
                  src={item.url}
                  alt="Decorative Background"
                  className="w-full h-full object-cover filter brightness-[1.05] contrast-[1.05]"
                  loading="lazy"
                />
              </div>
            ))}
          </motion.div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        {/* HEADER BRANDING */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 border-b border-white/20 pb-10">
          <div className="space-y-4 text-left">
            <h1 className="text-4xl sm:text-6xl font-black italic tracking-tight text-white uppercase leading-none">
              snapazzhot
            </h1>
            <p className="text-white/80 text-sm sm:text-base max-w-2xl leading-relaxed font-medium">
              Software photo booth premium dengan cetak otomatis berkecepatan
              tinggi, looping GIF otomatis, tangkapan video{" "}
              <span className="font-bold underline decoration-2 decoration-[#bcff00]">
                Behind The Scenes
              </span>
              , dan QR Code instan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchInitialData}
              className="px-6 py-3.5 bg-black hover:bg-neutral-900 border border-white/10 rounded-full text-white transition flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Feed
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3.5 bg-[#bcff00] hover:bg-white text-black rounded-full transition flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              Kembali Ke Beranda
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* INTERACTIVE GALLERY CONTROLLER */}
        <div className="space-y-8 text-left">
          <div className="space-y-4">
            <span className="font-mono text-xs font-black text-[#bcff00] uppercase tracking-widest flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter Menurut Event
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedEventId("all")}
                className={`px-5 py-3 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  selectedEventId === "all"
                    ? "bg-black text-white border-black shadow-lg"
                    : "bg-transparent border-white/20 hover:border-white text-white hover:bg-white/10"
                }`}
              >
                Semua Event
              </button>
              {(events || []).map((evt: any) => (
                <button
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`px-5 py-3 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    selectedEventId === evt.id
                      ? "bg-black text-white border-black shadow-lg"
                      : "bg-transparent border-white/20 hover:border-white text-white hover:bg-white/10"
                  }`}
                >
                  {evt.name}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 w-full">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-[16px] p-2 animate-pulse space-y-3"
                >
                  <div className="h-[300px] bg-white/10 rounded-[12px]" />
                </div>
              ))}
            </div>
          ) : individualPhotosList.length === 0 ? (
            <div className="p-16 text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl font-mono text-xs text-white/50 uppercase tracking-widest">
              Belum ada cetak foto digital yang diunggah untuk kategori ini.
            </div>
          ) : (
            <div className="space-y-8">
              {/* MAIN FOREGROUND MASONRY VIEWPORT */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 w-full pointer-events-none">
                <AnimatePresence mode="popLayout">
                  {columnsData.map((colItems, colIdx) => (
                    <div
                      key={`fg-col-${colIdx}`}
                      className={`flex flex-col gap-4 ${
                        colIdx >= 2 && colIdx < 4
                          ? "hidden sm:flex"
                          : colIdx >= 4
                            ? "hidden md:flex"
                            : "flex"
                      }`}
                    >
                      {colItems.map((photo: any) => (
                        <IndividualPhotoCard
                          key={photo.id}
                          photo={photo}
                          likedPhotos={likedPhotos}
                          handleLike={handleLike}
                          setSelectedPhoto={(p: any) => {
                            setSelectedPhoto(p);
                            setShowFullStrip(false);
                          }}
                          events={events}
                          heightClass={photo.heightClass}
                        />
                      ))}
                    </div>
                  ))}
                </AnimatePresence>
              </div>

              {individualPhotosList.length > visibleCount && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 12)}
                    className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-[11px] uppercase tracking-widest font-bold rounded-full transition cursor-pointer"
                  >
                    Muat Kenangan Lebih Banyak
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DETAIL MODAL EXPANSION */}
      <AnimatePresence>
        {selectedPhoto &&
          (() => {
            const parent = selectedPhoto.parentPhoto || selectedPhoto;
            const isLiked = likedPhotos.includes(parent.id);
            const matchingEvent = events.find(
              (e: any) => e.id === parent.eventId,
            );
            const eventName = matchingEvent
              ? matchingEvent.name
              : "Photo Booth Session";
            const eventLocation = matchingEvent?.location || "Grand Ballroom";
            const formattedDate = new Date(parent.timestamp).toLocaleDateString(
              "id-ID",
              {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              },
            );

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 overflow-y-auto"
                onClick={() => setSelectedPhoto(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 30 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                  className="bg-neutral-900 border border-white/20 text-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col md:flex-row relative my-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="absolute top-4 right-4 p-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white/80 hover:text-white transition cursor-pointer z-50 font-bold"
                  >
                    ✕
                  </button>

                  <div className="flex-1 bg-black p-6 flex flex-col items-center justify-center min-h-[350px] md:min-h-[550px] relative">
                    <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md border border-white/10 p-0.5 rounded-full flex gap-1 z-30 font-mono text-[9px] font-bold uppercase tracking-wider">
                      <button
                        onClick={() => setShowFullStrip(false)}
                        className={`px-4 py-1.5 rounded-full transition cursor-pointer ${!showFullStrip ? "bg-[#bcff00] text-black" : "text-white/60 hover:text-white"}`}
                      >
                        Raw Photo
                      </button>
                      <button
                        onClick={() => setShowFullStrip(true)}
                        className={`px-4 py-1.5 rounded-full transition cursor-pointer ${showFullStrip ? "bg-[#bcff00] text-black" : "text-white/60 hover:text-white"}`}
                      >
                        Hasil Photostrip
                      </button>
                    </div>

                    <img
                      src={showFullStrip ? parent.url : selectedPhoto.url}
                      alt={eventName}
                      className="max-h-[70vh] object-contain select-none rounded-2xl shadow-2xl"
                    />
                  </div>

                  <div className="w-full md:w-80 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/10 gap-6 bg-neutral-900 text-left">
                    <div className="space-y-5">
                      <div className="space-y-2 pb-4 border-b border-white/10">
                        <span className="font-mono text-[9px] font-bold text-[#bcff00] uppercase tracking-widest block">
                          Live Session Photo
                        </span>
                        <h3 className="text-xl font-bold text-white truncate leading-tight mt-1">
                          {parent.username || "Guest"}
                        </h3>
                        <p className="text-[10px] text-white/50 flex items-center gap-1.5 font-mono font-medium">
                          <Calendar className="w-4 h-4" />
                          {formattedDate}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold text-white/40 uppercase block">
                            Event
                          </span>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Globe className="w-4.5 h-4.5 text-[#bcff00]" />
                            {eventName}
                          </p>
                        </div>

                        {eventLocation && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono font-bold text-white/40 uppercase block">
                              Lokasi
                            </span>
                            <p className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                              <Layers className="w-4.5 h-4.5 text-white/40" />
                              {eventLocation}
                            </p>
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold text-white/40 uppercase block">
                            Template Frame
                          </span>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Award className="w-4.5 h-4.5 text-[#bcff00]" />
                            {parent.templateName || "Custom Strip Layout"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <button
                        onClick={() => navigate(`/download/${parent.id}`)}
                        className="w-full py-3.5 bg-[#bcff00] hover:bg-white text-black font-mono text-[9px] font-bold uppercase tracking-widest rounded-full transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98]"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-950 animate-pulse" />
                        Download Soft-Files (GIF & BTS)
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleLike(parent.id, e)}
                          className={`flex-1 py-3 border rounded-full font-mono text-[9px] font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer ${
                            isLiked
                              ? "bg-red-500 border-red-500 text-white"
                              : "bg-transparent border-white/20 text-white hover:bg-white/10"
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${isLiked ? "fill-white" : ""}`}
                          />
                          {isLiked
                            ? "Liked"
                            : `Like (${parent.likeCount || 0})`}
                        </button>

                        <a
                          href={showFullStrip ? parent.url : selectedPhoto.url}
                          download={
                            showFullStrip
                              ? `snapazzhot-strip-${parent.id}.png`
                              : `snapazzhot-photo-${selectedPhoto.id}.png`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-white text-black hover:bg-[#bcff00] rounded-full transition flex items-center justify-center cursor-pointer shadow"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}
