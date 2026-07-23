import { useState } from "react";
import JSZip from "jszip";
import { triggerConfetti } from "../utils/confetti";

interface ZipProgress {
  percent: number;
  status: string;
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
  meta: any;
}

export const useZipDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<ZipProgress>({ percent: 0, status: "" });

  const downloadFile = async (url: string, filename: string, zipFolder: JSZip) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      zipFolder.file(filename, blob);
    } catch (err) {
      console.error(`Failed to download ${filename}:`, err);
    }
  };

  const handleDownloadZip = async (photo: PhotoRecord, eventName: string) => {
    if (!photo) return;
    setIsDownloading(true);
    setProgress({ percent: 5, status: "Preparing files..." });

    try {
      const zip = new JSZip();
      
      const photoFolder = zip.folder("Photos");
      const gifFolder = zip.folder("GIF");
      const videoFolder = zip.folder("Video");

      let totalTasks = 0;
      let completedTasks = 0;

      const incrementProgress = () => {
        completedTasks++;
        const p = 5 + Math.floor((completedTasks / totalTasks) * 75);
        setProgress({ percent: p, status: "Downloading assets..." });
      };

      // Calculate total tasks
      if (photo.url) totalTasks++;
      if (photo.meta?.rawPhotos?.length) totalTasks += photo.meta.rawPhotos.length;
      if (photo.meta?.gifUrl) totalTasks++;
      if (photo.meta?.videoUrl) totalTasks++;

      const tasks: Promise<void>[] = [];

      // Photostrip
      if (photo.url && photoFolder) {
        tasks.push(downloadFile(photo.url, `Photostrip_${photo.id}.png`, photoFolder).then(incrementProgress));
      }

      // Raw Photos
      if (photo.meta?.rawPhotos?.length && photoFolder) {
        photo.meta.rawPhotos.forEach((rawUrl: string, idx: number) => {
          tasks.push(downloadFile(rawUrl, `RawPhoto_${idx + 1}.png`, photoFolder).then(incrementProgress));
        });
      }

      // GIF
      if (photo.meta?.gifUrl && gifFolder) {
        tasks.push(downloadFile(photo.meta.gifUrl, `Animation_${photo.id}.gif`, gifFolder).then(incrementProgress));
      }

      // Video
      if (photo.meta?.videoUrl && videoFolder) {
        tasks.push(downloadFile(photo.meta.videoUrl, `BTS_Video_${photo.id}.mp4`, videoFolder).then(incrementProgress));
      }

      await Promise.all(tasks);

      setProgress({ percent: 85, status: "Zipping files..." });

      const zipBlob = await zip.generateAsync({ type: "blob" });

      setProgress({ percent: 95, status: "Finalizing..." });

      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      const safeEventName = eventName.replace(/[^a-zA-Z0-9]/g, "_");
      link.href = blobUrl;
      link.download = `SnapAzzHot_${safeEventName}_${photo.id}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

      setProgress({ percent: 100, status: "Complete!" });
      triggerConfetti();

      setTimeout(() => {
        setIsDownloading(false);
        setProgress({ percent: 0, status: "" });
      }, 3000);

    } catch (err) {
      console.error("ZIP Generation Error:", err);
      setProgress({ percent: 0, status: "Failed to generate ZIP." });
      setTimeout(() => setIsDownloading(false), 2000);
    }
  };

  return { handleDownloadZip, isDownloading, progress };
};
