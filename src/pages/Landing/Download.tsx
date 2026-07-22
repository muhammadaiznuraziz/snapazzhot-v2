"use client";

import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";

// Init Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Interfaces
interface PhotoMeta {
  gifUrl?: string;
  videoUrl?: string;
  rawPhotos?: string[];
  [key: string]: any;
}

interface PhotoRecord {
  id: string;
  url: string;
  type: string;
  eventId: string;
  timestamp: string;
  username: string;
  templateName: string;
  likeCount: number;
  meta: PhotoMeta;
}

interface PageProps {
  params: { id?: string };
}

export default function DownloadPage({ params }: PageProps) {
  const id = params?.id || "PHO-1784703800040-70"; // Fallback ID jika dari router

  const [photo, setPhoto] = useState<PhotoRecord | null>(null);
  const [event, setEvent] = useState({
    name: "SNAPAZZHOT",
    location: "STUDIO",
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<{
    percent: number;
    status: string;
  }>({ percent: 0, status: "" });

  // 1. Fetch & Normalisasi Data dari Supabase
  useEffect(() => {
    async function fetchSession() {
      try {
        setLoading(true);
        const PHOTO_SELECT =
          "id, url, type, event_id, timestamp, username, template_name, like_count, meta";

        const { data: dbPhoto, error: photoErr } = await supabase
          .from("photos")
          .select(PHOTO_SELECT)
          .eq("id", id)
          .maybeSingle();

        if (photoErr) throw photoErr;

        if (dbPhoto) {
          const rawMeta = dbPhoto.meta || {};

          // Normalisasi Snake Case & Camel Case dari Meta Payload DB
          const parsedGifUrl =
            rawMeta.gifUrl || rawMeta.gif_url || rawMeta.gif || "";
          const parsedVideoUrl =
            rawMeta.videoUrl || rawMeta.video_url || rawMeta.video || "";

          let parsedRawPhotos: string[] = [];
          if (Array.isArray(rawMeta.rawPhotos)) {
            parsedRawPhotos = rawMeta.rawPhotos;
          } else if (Array.isArray(rawMeta.raw_photos)) {
            parsedRawPhotos = rawMeta.raw_photos;
          } else if (Array.isArray(rawMeta.poses)) {
            parsedRawPhotos = rawMeta.poses;
          } else if (Array.isArray(rawMeta.photos)) {
            parsedRawPhotos = rawMeta.photos;
          }

          const photoRecord: PhotoRecord = {
            id: dbPhoto.id,
            url: dbPhoto.url || "",
            type: dbPhoto.type || "photo",
            eventId: dbPhoto.event_id || "",
            timestamp: dbPhoto.timestamp,
            username: dbPhoto.username || "Guest",
            templateName: dbPhoto.template_name || "Photo Strip",
            likeCount: dbPhoto.like_count ?? 0,
            meta: {
              ...rawMeta,
              gifUrl: parsedGifUrl,
              videoUrl: parsedVideoUrl,
              rawPhotos: parsedRawPhotos,
            },
          };

          setPhoto(photoRecord);

          if (dbPhoto.event_id) {
            const { data: dbEvent } = await supabase
              .from("events")
              .select("name")
              .eq("id", dbPhoto.event_id)
              .single();
            if (dbEvent) {
              setEvent({ name: dbEvent.name, location: "STUDIO" });
            }
          }
        }
      } catch (err) {
        console.error("Failed to load session:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [id]);

  // 2. Fetch Helper dengan Fallback Canvas Proxy untuk CORS
  const fetchFileAsBlob = async (url: string): Promise<Blob | null> => {
    if (!url) return null;
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      return await res.blob();
    } catch (e) {
      console.warn(
        `Direct fetch failed (CORS/Network) for ${url}. Switching to fallback proxy...`,
      );

      // Fallback khusus file Gambar via Canvas
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const bypassUrl = url.includes("?")
          ? `${url}&cb=${Date.now()}`
          : `${url}?cb=${Date.now()}`;

        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob((blob) => resolve(blob), "image/png");
        };

        img.onerror = () => {
          console.error(`Failed to fetch file as blob: ${url}`);
          resolve(null);
        };

        img.src = bypassUrl;
      });
    }
  };

  // 3. Eksekusi Kompresi ZIP Seluruh Asset
  const handleDownloadAllZip = async () => {
    if (!photo) return;

    setIsDownloading(true);
    setZipProgress({ percent: 10, status: "Mempersiapkan antrean file..." });

    try {
      const zip = new JSZip();
      const tasks: { url: string; zipPath: string }[] = [];

      // A. Photostrip Output Utama
      if (photo.url) {
        tasks.push({ url: photo.url, zipPath: `Photostrip_${photo.id}.png` });
      }

      // B. GIF
      if (photo.meta.gifUrl) {
        tasks.push({
          url: photo.meta.gifUrl,
          zipPath: `Animation_${photo.id}.gif`,
        });
      }

      // C. Video
      if (photo.meta.videoUrl) {
        tasks.push({
          url: photo.meta.videoUrl,
          zipPath: `LiveVideo_${photo.id}.mp4`,
        });
      }

      // D. Raw Poses / Foto Mentahan
      if (photo.meta.rawPhotos && photo.meta.rawPhotos.length > 0) {
        photo.meta.rawPhotos.forEach((rawUrl, index) => {
          if (rawUrl && typeof rawUrl === "string") {
            const cleanUrl = rawUrl.split("?")[0];
            const ext =
              cleanUrl.substring(cleanUrl.lastIndexOf(".") + 1) || "jpg";
            tasks.push({
              url: rawUrl,
              zipPath: `raw_poses/Pose_${index + 1}.${ext}`,
            });
          }
        });
      }

      if (tasks.length === 0) {
        alert("Tidak ada asset media yang siap diunduh.");
        setIsDownloading(false);
        return;
      }

      let completed = 0;
      const total = tasks.length;

      // Parallel Fetch All Items
      await Promise.all(
        tasks.map(async (task) => {
          const blob = await fetchFileAsBlob(task.url);
          if (blob && blob.size > 0) {
            zip.file(task.zipPath, blob);
          } else {
            console.warn(`Asset diabaikan karena gagal diunduh: ${task.url}`);
          }
          completed++;
          setZipProgress({
            percent: Math.round(10 + (completed / total) * 75),
            status: `Mengunduh file (${completed}/${total})...`,
          });
        }),
      );

      setZipProgress({ percent: 90, status: "Membuat file ZIP..." });

      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Trigger Browser Download
      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${event.name.replace(/\s+/g, "_")}_${photo.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

      setZipProgress({ percent: 100, status: "Selesai!" });
      setTimeout(() => setIsDownloading(false), 1500);
    } catch (err) {
      console.error("ZIP Generation Failure:", err);
      alert(
        "Gagal mengompresi file ZIP. Periksa jaringan atau CORS bucket Anda.",
      );
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white font-mono">
        LOADING SESSION...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 font-mono">
      {/* Header Info */}
      <header className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider">{event.name}</h1>
          <p className="text-xs text-slate-400">ID: {photo?.id}</p>
        </div>
        <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 text-xs rounded-full">
          READY
        </span>
      </header>

      {/* Main Preview Container */}
      <main className="flex-1 flex flex-col items-center justify-center my-8">
        {photo?.url ? (
          <div className="relative max-w-sm w-full border-2 border-slate-700 bg-slate-900 p-2 rounded-lg shadow-2xl">
            <img
              src={photo.url}
              alt="Photostrip Preview"
              className="w-full h-auto object-contain rounded"
            />
          </div>
        ) : (
          <div className="text-slate-500 text-sm">Preview Tidak Tersedia</div>
        )}
      </main>

      {/* Control Footer */}
      <footer className="w-full max-w-md mx-auto space-y-4">
        {isDownloading && (
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>{zipProgress.status}</span>
              <span>{zipProgress.percent}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-lime-400 h-full transition-all duration-300"
                style={{ width: `${zipProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleDownloadAllZip}
          disabled={isDownloading || !photo}
          className="w-full py-4 bg-lime-400 hover:bg-lime-300 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black text-sm tracking-widest uppercase transition-colors rounded"
        >
          {isDownloading ? "PROCESSING ZIP..." : "DOWNLOAD ZIP"}
        </button>
      </footer>
    </div>
  );
}
