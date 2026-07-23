import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

// --- SAFE ENVIRONMENT READ & FALLBACK ---
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const rawUrl = url ? url.trim() : undefined;
const rawKey = key ? key.trim() : undefined;

// Validasi apakah variabel environment benar-benar ada dan berformat URL
const isEnvValid = Boolean(
  rawUrl && rawKey && typeof rawUrl === "string" && rawUrl.startsWith("http"),
);

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

export default function DownloadPage({ id: propId }: { id?: string }) {
  const params = useParams<{ id: string }>();
  // Gunakan ID dari parameter URL, lalu prop, atau fallback
  const id = params.id || propId || "";

  const [photo, setPhoto] = useState<PhotoRecord | null>(null);
  const [event, setEvent] = useState({
    name: "SNAPAZZHOT",
    location: "STUDIO",
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState({ percent: 0, status: "" });

  useEffect(() => {
    // Hindari fetch data jika env tidak valid (guardrail akan menangani UI-nya)
    if (!isEnvValid) {
      setLoading(false);
      return;
    }

    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchSession() {
      try {
        setLoading(true);
        const { data: dbPhoto, error: photoErr } = await supabase
          .from("photos")
          .select(
            "id, url, type, event_id, timestamp, username, template_name, like_count, meta"
          )
          .eq("id", id)
          .maybeSingle();

        if (photoErr) throw photoErr;

        if (dbPhoto) {
          // Parse string JSON jika Supabase mengembalikannya sebagai string
          let rawMeta = dbPhoto.meta;
          if (typeof rawMeta === "string") {
            try {
              rawMeta = JSON.parse(rawMeta);
            } catch (e) {
              rawMeta = {};
            }
          }
          rawMeta = rawMeta || {};

          setPhoto({
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
              gifUrl: rawMeta.gifUrl || rawMeta.gif_url || "",
              videoUrl: rawMeta.videoUrl || rawMeta.video_url || "",
              rawPhotos: Array.isArray(rawMeta.rawPhotos)
                ? rawMeta.rawPhotos
                : [],
            },
          });
        }
      } catch (err) {
        console.error("Failed to load session:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [id]);

  // Guardrail UI: Jika Vercel build gagal membaca env, tampilkan layar peringatan
  if (!isEnvValid) {
    return (
      <div className="min-h-screen bg-slate-950 text-red-400 p-6 font-mono flex flex-col items-center justify-center text-center">
        <div className="border border-red-800 bg-red-950/40 p-6 rounded-lg max-w-md w-full">
          <h2 className="text-xl font-bold mb-2">Build Environment Missing</h2>
          <p className="text-xs text-slate-300 mb-4">
            Variabel{" "}
            <code className="text-lime-400 bg-slate-900 px-1">
              VITE_SUPABASE_URL
            </code>{" "}
            atau{" "}
            <code className="text-lime-400 bg-slate-900 px-1">
              VITE_SUPABASE_ANON_KEY
            </code>{" "}
            belum terinjeksi saat build time.
          </p>
          <div className="text-left bg-slate-900 p-3 rounded text-xs text-slate-400 space-y-1">
            <p className="font-bold text-white">Langkah Perbaikan:</p>
            <p>1. Buka Vercel -&gt; Settings -&gt; Environment Variables</p>
            <p>2. Pastikan nilai variabel terisi (tanpa spasi tambahan)</p>
            <p>3. Pilih Deployments -&gt; Redeploy</p>
            <p>4. Hilangkan centang pada "Use existing Build Cache"</p>
          </div>
        </div>
      </div>
    );
  }

  const handleDownloadAllZip = async () => {
    if (!photo) return;
    setIsDownloading(true);
    setZipProgress({ percent: 10, status: "Mempersiapkan antrean file..." });

    try {
      const zip = new JSZip();
      if (photo.url) {
        const res = await fetch(photo.url);
        const blob = await res.blob();
        zip.file(`Photostrip_${photo.id}.png`, blob);
      }

      setZipProgress({ percent: 80, status: "Membuat file ZIP..." });
      const zipBlob = await zip.generateAsync({ type: "blob" });

      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${event.name}_${photo.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

      setZipProgress({ percent: 100, status: "Selesai!" });
      setTimeout(() => setIsDownloading(false), 1500);
    } catch (err) {
      console.error("ZIP Error:", err);
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

  if (!photo && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-400 font-mono">
        Sesi foto tidak ditemukan atau URL tidak valid.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 font-mono">
      <header className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wider">{event.name}</h1>
          <p className="text-xs text-slate-400">ID: {photo.id}</p>
        </div>
        <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 text-xs rounded-full">
          READY
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center my-8">
        {photo.url ? (
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
