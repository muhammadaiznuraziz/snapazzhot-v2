import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { supabase } from "../../lib/supabaseClient";
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
      className={`group relative w-full ${heightClass} bg-neutral-950 cursor-pointer pointer-events-auto rounded-[24px] overflow-hidden shadow-xl border border-white/2fn hover:border-[#CCFF00] transition-all duration-300`}
      onClick={() => setSelectedPhoto(photo)}
      whileHover={{
        scale: 1.04,
        y: -4,
        boxShadow: "0 25px 50px rgba(0, 0, 0, 0.4)",
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

      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 z-20">
        <button className="p-3 bg-[#CCFF00] text-black rounded-full hover:scale-110 transition active:scale-95 shadow-lg cursor-pointer">
          <Eye className="w-4 h-4 stroke-[2.5]" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleLike(parent.id, e);
          }}
          className={`p-3 rounded-full hover:scale-110 transition active:scale-95 shadow-lg cursor-pointer ${isLiked ? "bg-red-500 text-white" : "bg-white text-black"}`}
        >
          <Heart className={`w-4 h-4 stroke-[2.5] ${isLiked ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent text-white flex flex-col gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#CCFF00] flex items-center justify-center text-[9px] text-black font-extrabold">
            {parent.username ? parent.username.slice(0, 2).toUpperCase() : "G"}
          </div>
          <span className="text-[11px] font-bold text-white/90">
            {parent.username || "Guest"}
          </span>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <h4 className="text-xs font-black truncate max-w-[120px] text-white uppercase">
              {eventName}
            </h4>
            <p className="text-[9px] text-white/60 font-mono">
              {formattedDate}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full text-[10px] border border-white/20">
            <Heart className={`w-3 h-3 text-red-500 ${isLiked ? "fill-current" : ""}`} />
            <span className="font-mono font-bold">{parent.likeCount || 0}</span>
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

  const heightPresets = [
    "h-[240px] sm:h-[320px] md:h-[420px]",
    "h-[320px] sm:h-[460px] md:h-[520px]",
    "h-[220px] sm:h-[280px] md:h-[360px]",
    "h-[380px] sm:h-[480px] md:h-[500px]",
    "h-[260px] sm:h-[340px] md:h-[400px]",
    "h-[300px] sm:h-[400px] md:h-[460px]",
  ];

  const columnEffects = [
    {
      animate: { y: [0, -35, 0] },
      transition: { duration: 25, repeat: Infinity, ease: "linear" as const },
    },
    {
      animate: { y: [-40, 5, -40] },
      transition: { duration: 30, repeat: Infinity, ease: "linear" as const },
    },
    {
      animate: { y: [0, -20, 0] },
      transition: { duration: 22, repeat: Infinity, ease: "linear" as const },
    },
    {
      animate: { y: [-30, 15, -30] },
      transition: { duration: 28, repeat: Infinity, ease: "linear" as const },
    },
    {
      animate: { y: [-15, -50, -15] },
      transition: { duration: 32, repeat: Infinity, ease: "linear" as const },
    },
    {
      animate: { y: [-45, 0, -45] },
      transition: { duration: 24, repeat: Infinity, ease: "linear" as const },
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

  useEffect(() => {
    fetchInitialData(true);
  }, [fetchInitialData]);

  const handleLike = async (photoId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (likedPhotos.includes(photoId)) return;

    const updated = [...likedPhotos, photoId];
    setLikedPhotos(updated);
    localStorage.setItem("snapazzhot_liked_photos", JSON.stringify(updated));

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
    } catch (err) {
      console.warn("Failed to like photo", err);
      setLikedPhotos(likedPhotos);
      localStorage.setItem(
        "snapazzhot_liked_photos",
        JSON.stringify(likedPhotos),
      );
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
    <div className="min-h-screen bg-[#0038FF] text-white font-sans selection:bg-[#CCFF00] selection:text-black relative overflow-hidden py-12 md:py-20 px-6 sm:px-8 lg:px-12">
      {/* BACKGROUND MASONRY PARALLAX ENGINE */}
      <div className="absolute inset-0 w-full h-full grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 p-4 z-0 opacity-30 pointer-events-none scale-105 select-none [@media(prefers-reduced-motion:reduce)]:animate-none">
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
            {[...colItems, ...colItems].map((item, itemIdx) => (
              <div
                key={`bg-img-${item.id}-${itemIdx}`}
                className={`relative w-full ${item.heightClass} rounded-2xl overflow-hidden`}
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 glass-pill text-xs font-bold tracking-widest uppercase text-[#CCFF00]">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>COMMUNITY GALLERY</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase leading-none">
              PUBLIC <span className="text-[#CCFF00]">GALLERY</span>
            </h1>
            <p className="text-white/80 text-sm sm:text-base max-w-2xl leading-relaxed font-normal">
              Explore moments captured across our photobooth events. High-speed prints, looping GIFs, and behind-the-scenes memories shared by our community.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchInitialData}
              className="px-6 py-3.5 bg-white/15 hover:bg-white/25 border border-white/30 rounded-full text-white transition flex items-center gap-2 font-bold text-xs uppercase tracking-wider cursor-pointer backdrop-blur-md shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Feed
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3.5 bg-[#CCFF00] hover:bg-white text-black rounded-full transition flex items-center gap-2 font-bold text-xs uppercase tracking-wider cursor-pointer shadow-[0_10px_25px_rgba(204,255,0,0.3)]"
            >
              <span>Back to Home</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* INTERACTIVE GALLERY CONTROLLER */}
        <div className="space-y-8 text-left">
          <div className="space-y-4">
            <span className="text-xs font-black text-[#CCFF00] uppercase tracking-widest flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter By Event
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setSelectedEventId("all")}
                className={`px-6 py-3 rounded-full text-xs font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                  selectedEventId === "all"
                    ? "bg-[#CCFF00] text-black border-[#CCFF00] shadow-lg scale-105"
                    : "glass-panel border-white/25 hover:border-white text-white"
                }`}
              >
                All Events
              </button>
              {(events || []).map((evt: any) => (
                <button
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`px-6 py-3 rounded-full text-xs font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                    selectedEventId === evt.id
                      ? "bg-[#CCFF00] text-black border-[#CCFF00] shadow-lg scale-105"
                      : "glass-panel border-white/25 hover:border-white text-white"
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
                <div key={idx} className="p-2 animate-pulse space-y-3">
                  <div className="h-[300px] bg-white/10 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : individualPhotosList.length === 0 ? (
            <div className="p-16 text-center glass-panel border border-white/25 text-xs text-white/70 uppercase tracking-widest font-bold rounded-[32px]">
              No digital photos uploaded for this category yet.
            </div>
          ) : (
            <div className="space-y-10">
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
                <div className="text-center pt-6">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 12)}
                    className="px-8 py-4 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-extrabold text-xs uppercase tracking-widest rounded-full transition cursor-pointer backdrop-blur-md shadow-xl"
                  >
                    Load More Memories
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
                className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50 flex items-center justify-center p-4 overflow-y-auto"
                onClick={() => setSelectedPhoto(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 30 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                  className="bg-neutral-950 border border-white/25 text-white max-w-4xl w-full overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex flex-col md:flex-row relative my-8 rounded-[32px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="absolute top-5 right-5 p-3 bg-white/10 hover:bg-white/25 border border-white/20 rounded-full text-white transition cursor-pointer z-50 font-bold backdrop-blur-md"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <div className="flex-1 bg-black p-8 flex flex-col items-center justify-center min-h-[350px] md:min-h-[550px] relative">
                    <div className="absolute top-5 left-5 bg-black/70 backdrop-blur-md border border-white/25 p-1 rounded-full flex gap-1 z-30 text-[10px] font-bold uppercase tracking-wider">
                      <button
                        onClick={() => setShowFullStrip(false)}
                        className={`px-5 py-2 rounded-full transition cursor-pointer ${!showFullStrip ? "bg-[#CCFF00] text-black shadow-md" : "text-white/70 hover:text-white"}`}
                      >
                        Raw Photo
                      </button>
                      <button
                        onClick={() => setShowFullStrip(true)}
                        className={`px-5 py-2 rounded-full transition cursor-pointer ${showFullStrip ? "bg-[#CCFF00] text-black shadow-md" : "text-white/70 hover:text-white"}`}
                      >
                        Photostrip
                      </button>
                    </div>

                    <img
                      src={showFullStrip ? parent.url : selectedPhoto.url}
                      alt={eventName}
                      className="max-h-[70vh] object-contain select-none rounded-2xl shadow-2xl"
                    />
                  </div>

                  <div className="w-full md:w-88 p-8 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/15 gap-6 bg-neutral-950 text-left">
                    <div className="space-y-6">
                      <div className="space-y-2 pb-5 border-b border-white/15">
                        <span className="text-[10px] font-extrabold text-[#CCFF00] uppercase tracking-widest block font-mono">
                          Live Session Photo
                        </span>
                        <h3 className="text-2xl font-black text-white truncate leading-tight mt-1">
                          {parent.username || "Guest"}
                        </h3>
                        <p className="text-xs text-white/60 flex items-center gap-2 font-bold">
                          <Calendar className="w-4 h-4 text-[#CCFF00]" />
                          {formattedDate}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-white/50 uppercase block font-mono">
                            Event
                          </span>
                          <p className="text-xs font-black text-white flex items-center gap-2 uppercase tracking-wide">
                            <Globe className="w-4 h-4 text-[#CCFF00]" />
                            {eventName}
                          </p>
                        </div>

                        {eventLocation && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-white/50 uppercase block font-mono">
                              Location
                            </span>
                            <p className="text-xs font-bold text-white/80 flex items-center gap-2">
                              <Layers className="w-4 h-4 text-white/50" />
                              {eventLocation}
                            </p>
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-white/50 uppercase block font-mono">
                            Template Frame
                          </span>
                          <p className="text-xs font-black text-white flex items-center gap-2">
                            <Award className="w-4 h-4 text-[#CCFF00]" />
                            {parent.templateName || "Custom Strip Layout"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-5 border-t border-white/15">
                      <button
                        onClick={() => navigate(`/download/${parent.id}`)}
                        className="w-full py-4 bg-[#CCFF00] hover:bg-white text-black text-xs font-black uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_10px_25px_rgba(204,255,0,0.3)] active:scale-[0.98]"
                      >
                        <Sparkles className="w-4 h-4 text-black animate-pulse" />
                        <span>Download Soft-Files</span>
                      </button>

                      <div className="flex gap-2.5">
                        <button
                          onClick={(e) => handleLike(parent.id, e)}
                          className={`flex-1 py-3.5 border rounded-full text-xs font-extrabold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                            isLiked
                              ? "bg-red-500 border-red-500 text-white shadow-lg"
                              : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 stroke-[2.5] ${isLiked ? "fill-white" : ""}`}
                          />
                          <span>
                            {isLiked ? "Liked" : `Like (${parent.likeCount || 0})`}
                          </span>
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
                          className="p-3.5 bg-white/10 hover:bg-[#CCFF00] text-white hover:text-black border border-white/20 rounded-full transition flex items-center justify-center cursor-pointer shadow-lg"
                          title="Download"
                        >
                          <Download className="w-4 h-4 stroke-[2.5]" />
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
