import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { BoothContextType } from "../../layouts/BoothLayout";
import { renderMedia } from "../../utils/render";
import {
  Camera,
  Sparkles,
  RotateCcw,
  Check,
  Maximize2,
  Minimize2,
  Grid,
  Volume2,
  VolumeX,
  Sliders,
  Video as VideoIcon,
  RefreshCw,
  Info,
  Tv,
  Monitor,
  Layers,
  Image as ImageIcon,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Utility to lazily load gifshot library from CDN for reliable pure client-side compiling
export function loadGifshot(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).gifshot) {
      resolve((window as any).gifshot);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/gifshot@0.4.5/dist/gifshot.min.js";
    script.onload = () => {
      resolve((window as any).gifshot);
    };
    script.onerror = (err) => {
      reject(err);
    };
    document.body.appendChild(script);
  });
}

// Helper to crop image data URL to a clean 1:1 square to prevent squishing
export function cropImageToSquare(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = Math.min(img.width, img.height);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } else {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

const filterStyles: Record<string, string> = {
  none: "none",
  grayscale: "grayscale(100%)",
  sepia: "sepia(100%)",
  vintage: "contrast(1.2) saturate(0.8) sepia(0.3)",
  warm: "saturate(1.15) sepia(0.12) hue-rotate(-8deg)",
  cool: "saturate(0.9) hue-rotate(8deg) contrast(1.05)",
  monochrome: "contrast(1.35) grayscale(100%) brightness(1.05)",
};

interface HistoryItem {
  id: string;
  frameNumber: number;
  url: string;
  status: "success" | "retake";
  timestamp: string;
}

export default function BoothCamera() {
  const context = useOutletContext<BoothContextType>();
  const navigate = useNavigate();

  const {
    activeEvent,
    photosToTake,
    countdownSeconds,
    flash,
    setFlash,
    capturedFrames,
    setCapturedFrames,
    setAllSnappedPhotos,
    videoRef,
    offscreenCanvasRef,
    selectedCameraId,
    setSelectedCameraId,
    useSimulator,
    setUseSimulator,
    playBeep,
    stopCamera,
    renderSimulatorPortrait,
    setCurrentFrameIndex,
    cameraList,
    setCameraList,
    setSessionBtsCaptureTimes,
    sessionVideoUrls,
    setSessionVideoUrls,
    mirror,
    setMirror,
    zoom,
    setZoom,
    selectedFrameId,
  } = context;

  const { templates } = useApp() as any;

  // Local Flow States
  const [sessionState, setSessionState] = useState<
    | "ready"
    | "countdown"
    | "preview_single"
    | "countdown_running"
    | "review_all"
    | "countdown_retake"
  >("ready");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null);
  const [tempCaptured, setTempCaptured] = useState<string[]>([]);
  const [currentCountdownVal, setCurrentCountdownVal] = useState(0);
  const [latestSnappedPhoto, setLatestSnappedPhoto] = useState<string | null>(
    null,
  );
  const [processingMedia, setProcessingMedia] = useState(false);

  // New Audit State for Tracking Historic Retakes & Active Snapshots
  const [photoHistory, setPhotoHistory] = useState<HistoryItem[]>([]);

  // Reset audit pipeline when session rolls back to clean state
  useEffect(() => {
    if (tempCaptured.length === 0) {
      setPhotoHistory([]);
    }
  }, [tempCaptured]);

  // Find template matching selection
  const template =
    templates?.find(
      (t: any) =>
        t.id === selectedFrameId ||
        t.id === activeEvent?.templateId ||
        t.id === activeEvent?.frameId ||
        t.id === `tpl-${selectedFrameId}` ||
        t.id === `tpl-${activeEvent?.templateId}` ||
        t.id === `tpl-${activeEvent?.frameId}`,
    ) || templates?.[0];

  const canvasWidth = template?.canvasWidth || 1200;
  const canvasHeight = template?.canvasHeight || 800;
  const elements = template ? [...(template.elements || [])] : [];

  // Sort and filter photo elements
  const rawPhotoElements = elements.filter(
    (el: any) => el.type === "photo" && !el.hidden,
  );
  const rows: any[][] = [];
  const sortedByY = [...rawPhotoElements].sort((a, b) => a.y - b.y);

  for (const el of sortedByY) {
    let foundRow = false;
    for (const r of rows) {
      const avgY = r.reduce((sum, item) => sum + item.y, 0) / r.length;
      if (Math.abs(avgY - el.y) < 10) {
        r.push(el);
        foundRow = true;
        break;
      }
    }
    if (!foundRow) {
      rows.push([el]);
    }
  }

  for (const r of rows) {
    r.sort((a, b) => a.x - b.x);
  }

  const photoElementsSorted = rows.flat();

  // Dynamic Scale hook for Preview Photo
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    if (sessionState !== "review_all" || !previewContainerRef.current) return;
    const updateScale = () => {
      if (!previewContainerRef.current) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      const availableWidth = rect.width - 32;
      const availableHeight = rect.height - 32;
      if (availableWidth > 0 && availableHeight > 0) {
        const calculatedScale = Math.min(
          availableWidth / canvasWidth,
          availableHeight / canvasHeight,
        );
        setPreviewScale(Math.min(calculatedScale, 1.0));
      }
    };

    updateScale();
    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(previewContainerRef.current);

    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [sessionState, canvasWidth, canvasHeight]);

  // Camera Settings
  const [brightness, setBrightness] = useState(100);
  const [exposure, setExposure] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeFilter, setActiveFilter] = useState("none");

  // MediaRecorder Refs for behind the scenes video
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingLoopActiveRef = useRef<boolean>(false);

  // Load cameras list on mount
  useEffect(() => {
    let isMounted = true;
    async function initCameraDiscovery() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        if (!isMounted) return;

        setTimeout(() => {
          if (!isMounted) return;
          setCameraList(videoDevices);
          if (videoDevices.length > 0 && !selectedCameraId) {
            setSelectedCameraId(videoDevices[0].deviceId);
          }
        }, 0);
      } catch (err) {
        console.warn("Failed enumerating devices", err);
      }
    }
    initCameraDiscovery();
    return () => {
      isMounted = false;
    };
  }, [selectedCameraId]);

  const getActiveVideoDeviceId = (
    stream: MediaStream | null,
  ): string | null => {
    if (!stream) return null;
    const track = stream.getVideoTracks()[0];
    if (!track) return null;
    const settings = track.getSettings();
    return settings.deviceId || null;
  };

  const isStreamActive = (stream: MediaStream | null): boolean => {
    if (!stream) return false;
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) return false;
    const allTracksActive = tracks.every(
      (track) => track.readyState === "live" && track.enabled,
    );
    if (!allTracksActive) return false;

    if (selectedCameraId) {
      const activeDeviceId = getActiveVideoDeviceId(stream);
      if (activeDeviceId && activeDeviceId !== selectedCameraId) {
        return false;
      }
    }
    return true;
  };

  const ensureCameraStream = async (): Promise<MediaStream | null> => {
    if (useSimulator) return null;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (!useSimulator) {
        setTimeout(() => {
          setUseSimulator(true);
        }, 0);
      }
      return null;
    }

    if (localStreamRef.current && isStreamActive(localStreamRef.current)) {
      if (
        videoRef.current &&
        videoRef.current.srcObject !== localStreamRef.current
      ) {
        videoRef.current.srcObject = localStreamRef.current;
        try {
          await videoRef.current.play();
        } catch (e) {}
      }
      return localStreamRef.current;
    }

    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          deviceId:
            selectedCameraId && selectedCameraId !== "webcam-1"
              ? { ideal: selectedCameraId }
              : undefined,
          width: 1280,
          height: 720,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {}
      }
      return stream;
    } catch (err) {
      if (!useSimulator) {
        setTimeout(() => {
          setUseSimulator(true);
        }, 0);
      }
      return null;
    }
  };

  const waitUntilVideoReady = (
    video: HTMLVideoElement,
    timeoutMs = 3000,
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const check = () => {
        if (!video) {
          resolve(false);
          return;
        }
        const isReady =
          video.srcObject &&
          video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
          video.videoWidth > 0 &&
          video.videoHeight > 0;

        if (isReady) {
          resolve(true);
        } else if (Date.now() - startTime > timeoutMs) {
          resolve(video.videoWidth > 0 && video.videoHeight > 0);
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  };

  useEffect(() => {
    if (videoRef.current && !useSimulator) {
      ensureCameraStream();
    }
  }, [videoRef.current, sessionState, useSimulator]);

  useEffect(() => {
    if (!useSimulator) {
      ensureCameraStream();
    }
  }, [selectedCameraId, useSimulator]);

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      stopCamera();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  const triggerBeep = (freq: number, dur: number) => {
    if (isMuted) return;
    playBeep(freq, dur);
  };

  const startRecordingLoop = (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    recordingLoopActiveRef.current = true;

    const loop = () => {
      if (!recordingLoopActiveRef.current) return;
      if (video && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
        ctx.save();
        if (mirror) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      requestAnimationFrame(loop);
    };
    loop();
  };

  const stopRecordingLoop = () => {
    recordingLoopActiveRef.current = false;
  };

  const startBtsRecording = async () => {
    if (activeEvent?.enableVideo === false) return;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    let rawStream = localStreamRef.current;
    if (!rawStream && videoRef.current && videoRef.current.srcObject) {
      rawStream = videoRef.current.srcObject as MediaStream;
    }

    if (!rawStream && !useSimulator) {
      try {
        rawStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: activeEvent?.enableAudio || false,
        });
        localStreamRef.current = rawStream;
      } catch (e) {}
    }

    let streamToRecord: MediaStream | null = null;

    if (rawStream) {
      const recCanvas = document.createElement("canvas");
      recCanvas.width = 1280;
      recCanvas.height = 720;
      recordingCanvasRef.current = recCanvas;

      if (videoRef.current) {
        startRecordingLoop(videoRef.current, recCanvas);
        try {
          const canvasStream = (recCanvas as any).captureStream(
            30,
          ) as MediaStream;
          const audioTracks = rawStream.getAudioTracks();
          audioTracks.forEach((track) => canvasStream.addTrack(track));
          streamToRecord = canvasStream;
        } catch (e) {
          streamToRecord = rawStream;
        }
      } else {
        streamToRecord = rawStream;
      }
    } else if (useSimulator) {
      const recCanvas = document.createElement("canvas");
      recCanvas.width = 1280;
      recCanvas.height = 720;
      recordingCanvasRef.current = recCanvas;

      recordingLoopActiveRef.current = true;
      const ctx = recCanvas.getContext("2d");
      const loop = () => {
        if (!recordingLoopActiveRef.current || !ctx) return;
        const simUri = renderSimulatorPortrait(currentPhotoIndex);
        const img = new Image();
        img.src = simUri;
        img.onload = () => {
          ctx.save();
          if (mirror) {
            ctx.translate(recCanvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(img, 0, 0, recCanvas.width, recCanvas.height);
          ctx.restore();
        };
        setTimeout(() => requestAnimationFrame(loop), 33);
      };
      loop();

      try {
        streamToRecord = (recCanvas as any).captureStream(30) as MediaStream;
      } catch (e) {}
    }

    if (streamToRecord) {
      try {
        const options = { mimeType: "video/webm;codecs=vp9" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = "video/webm";
        }
        const mediaRecorder = new MediaRecorder(streamToRecord, options);
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start();
        recordingStartTimeRef.current = Date.now();
      } catch (err) {}
    }
  };

  const stopBtsRecordingAndSave = (): Promise<string> => {
    return new Promise((resolve) => {
      if (
        !mediaRecorderRef.current ||
        mediaRecorderRef.current.state !== "recording"
      ) {
        resolve("");
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        stopRecordingLoop();
        if (recordedChunksRef.current.length === 0) {
          resolve("");
          return;
        }
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });
        const videoUrl = URL.createObjectURL(blob);
        resolve(videoUrl);
      };

      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        resolve("");
      }
    });
  };

  const handleStartCapture = async () => {
    if (tempCaptured.length === 0 || tempCaptured.length >= photosToTake) {
      setTempCaptured([]);
      setCurrentPhotoIndex(0);
      setSessionVideoUrls([]);
    }
    startCountDownSequence();
  };

  const startCountDownSequence = (
    isRetake = false,
    indexToRetake: number | null = null,
  ) => {
    setSessionState(isRetake ? "countdown_retake" : "countdown");
    setCurrentCountdownVal(countdownSeconds);
    triggerBeep(800, 0.1);
    startBtsRecording();

    const interval = setInterval(() => {
      setCurrentCountdownVal((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          triggerFlashAndSnap(isRetake, indexToRetake);
          return 0;
        }
        triggerBeep(800, 0.1);
        return prev - 1;
      });
    }, 1000);
  };

  const triggerFlashAndSnap = async (
    isRetake = false,
    indexToRetake: number | null = null,
  ) => {
    setFlash(true);
    triggerBeep(1400, 0.45);
    setTimeout(() => setFlash(false), 300);

    const elapsed =
      recordingStartTimeRef.current > 0
        ? (Date.now() - recordingStartTimeRef.current) / 1000
        : 0;

    const activeIndex =
      isRetake && indexToRetake !== null ? indexToRetake : currentPhotoIndex;

    setSessionBtsCaptureTimes((prev) => {
      const next = [...prev];
      next[activeIndex] = elapsed;
      return next;
    });

    if (!useSimulator) {
      await ensureCameraStream();
      if (videoRef.current) {
        await waitUntilVideoReady(videoRef.current);
      }
    }

    let snappedBase64 = "";
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      if (useSimulator) {
        const simUri = renderSimulatorPortrait(activeIndex);
        const img = new Image();
        img.src = simUri;
        await new Promise((resolve) => {
          img.onload = () => {
            renderMedia({
              ctx,
              source: img,
              x: 0,
              y: 0,
              width: canvas.width,
              height: canvas.height,
              objectFit: "cover",
              mirror: mirror,
              zoom: zoom,
            });
            resolve(null);
          };
          img.onerror = () => resolve(null);
        });
      } else if (videoRef.current) {
        const video = videoRef.current;
        if (
          video &&
          video.srcObject &&
          video.videoWidth > 0 &&
          video.videoHeight > 0 &&
          video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA
        ) {
          renderMedia({
            ctx,
            source: video,
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
            objectFit: "cover",
            mirror: mirror,
            zoom: zoom,
          });
        } else {
          ctx.fillStyle = "#1e1e24";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      snappedBase64 = canvas.toDataURL("image/jpeg", 0.95);
    }

    const capturedPhoto = snappedBase64;
    setLatestSnappedPhoto(capturedPhoto);
    setAllSnappedPhotos((prev) => [...prev, capturedPhoto]);
    setSessionState("preview_single");

    const videoUrl = await stopBtsRecordingAndSave();
    setSessionVideoUrls((prev) => {
      const next = [...prev];
      next[activeIndex] = videoUrl;
      return next;
    });

    if (isRetake && indexToRetake !== null) {
      const updatedQueue = [...tempCaptured];
      updatedQueue[indexToRetake] = capturedPhoto;
      setTempCaptured(updatedQueue);

      // Mutate audit records history cleanly
      setPhotoHistory((prev) => {
        const updatedHistory = prev.map((item) => {
          if (
            item.frameNumber === indexToRetake + 1 &&
            item.status === "success"
          ) {
            return { ...item, status: "retake" as const };
          }
          return item;
        });
        return [
          ...updatedHistory,
          {
            id: `snap-${Date.now()}`,
            frameNumber: indexToRetake + 1,
            url: capturedPhoto,
            status: "success" as const,
            timestamp: new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          },
        ];
      });

      setTimeout(() => {
        setLatestSnappedPhoto(null);
        setRetakeIndex(null);
        setSessionState("review_all");
      }, 1500);
    } else {
      const updatedQueue = [...tempCaptured, capturedPhoto];
      setTempCaptured(updatedQueue);

      // Push primary capture to historic record array
      setPhotoHistory((prev) => [
        ...prev,
        {
          id: `snap-${Date.now()}`,
          frameNumber: updatedQueue.length,
          url: capturedPhoto,
          status: "success" as const,
          timestamp: new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        },
      ]);

      setTimeout(() => {
        setLatestSnappedPhoto(null);
        if (updatedQueue.length >= photosToTake) {
          setSessionState("review_all");
        } else {
          setCurrentPhotoIndex(updatedQueue.length);
          setSessionState("ready");
        }
      }, 1500);
    }
  };

  const handleCompleteSession = async (finalPhotos: string[]) => {
    setProcessingMedia(true);
    setCapturedFrames(finalPhotos);

    let finalGifUrl = "";
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    try {
      const gifshotLib = await loadGifshot();
      const compileOptions = {
        images: finalPhotos,
        interval: 0.45,
        gifWidth: 640,
        gifHeight: 360,
        numWorkers: 2,
      };

      const gifDataUrl: string = await new Promise((resolve) => {
        gifshotLib.createGIF(compileOptions, (obj: any) => {
          if (!obj.error) {
            resolve(obj.image);
          } else {
            resolve("");
          }
        });
      });
      finalGifUrl = gifDataUrl;
    } catch (err) {
      finalGifUrl = finalPhotos[0] || "";
    }

    context.setSessionGifUrl(finalGifUrl);
    context.setSessionVideoUrl(sessionVideoUrls[0] || "");
    setProcessingMedia(false);
    setCurrentFrameIndex(0);
    navigate("/booth/editor");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (processingMedia) {
    return (
      <div className="fixed inset-0 z-50 bg-[#004ce5] text-white flex flex-col items-center justify-center space-y-6 p-6 font-['Outfit']">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />
        <div className="w-12 h-12 border-2 border-[#bcff00] border-t-transparent rounded-full animate-spin relative z-10" />
        <div className="text-center space-y-3 max-w-md relative z-10">
          <h2 className="text-xl font-black uppercase tracking-wider italic text-[#bcff00]">
            Compiling Session Media
          </h2>
          <p className="text-[10px] text-white/70 leading-relaxed uppercase tracking-wide">
            Creating high-quality loop GIF animations and combining
            behind-the-scenes video footage...
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 text-[#bcff00] rounded-full text-[9px] uppercase tracking-widest font-bold relative z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          Live Compiling Engine Active
        </div>
      </div>
    );
  }

  // Pre-generate dynamic list of target slots with pending statuses
  const renderHistoryList = () => {
    const slots = Array.from({ length: photosToTake }, (_, i) => i + 1);

    // items from history
    const directHistory = [...photoHistory];

    // tracking slots that have been fulfilled by successful items
    const fulfilledSlots = new Set(
      directHistory
        .filter((h) => h.status === "success")
        .map((h) => h.frameNumber),
    );

    // inject pending nodes for placeholders
    slots.forEach((slotNum) => {
      if (!fulfilledSlots.has(slotNum)) {
        directHistory.push({
          id: `pending-${slotNum}`,
          frameNumber: slotNum,
          url: "",
          status: "pending" as any,
          timestamp: "",
        });
      }
    });

    // Sort logically: Historic objects first grouped by frame, matching chronological snapshot sequence
    return directHistory.sort((a, b) => {
      if (a.frameNumber !== b.frameNumber) {
        return a.frameNumber - b.frameNumber;
      }
      // If same slot number, let the 'retake' status come before the 'success' item
      return a.status === "retake" ? -1 : 1;
    });
  };

  const activeAuditList = renderHistoryList();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 w-screen h-[100dvh] z-40 bg-[#004ce5] text-white flex flex-col overflow-hidden font-sans select-none"
    >
      {/* Background Matrix Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />

      {/* FLASH SCREEN TRIGGER */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* CORE SPLIT SCREEN */}
      <div
        className={`flex-1 h-full min-h-0 w-full flex flex-col lg:grid ${
          sessionState === "review_all"
            ? "lg:grid-cols-[325px_1fr]"
            : "lg:grid-cols-[325px_1fr_325px]"
        } p-4 sm:p-6 md:p-8 gap-6 overflow-hidden relative z-10`}
      >
        {/* LEFT SIDEBAR - CLEAN THUMBNAIL FEED */}
        <div className="h-full min-h-0 w-full p-4 bg-neutral-900 border border-white/15 rounded-[20px] shadow-xl flex flex-col gap-4 text-left overflow-hidden">
          {/* VERTICAL SCROLL ENGINE FEED */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {photoHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <p className="font-['Outfit'] text-[11px] uppercase font-bold text-white/40 tracking-wide">
                  Belum ada foto yang diambil.
                </p>
              </div>
            ) : (
              activeAuditList
                .filter((item) => item.status !== "pending") // Hanya tampilkan foto yang sudah terisi snapshot aktif/retake
                .map((item) => (
                  <div
                    key={item.id}
                    className="w-full aspect-[16/9] bg-black rounded-xl overflow-hidden border border-white/10 relative group transition-all duration-200 hover:border-white/30"
                  >
                    <img
                      src={item.url}
                      alt="Captured snapshot"
                      className="w-full h-full object-cover"
                    />

                    {/* Minimal Retake Indicator Badge at Top Right */}
                    {item.status === "retake" && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-600/90 backdrop-blur-sm text-white text-[8px] font-['Outfit'] font-black uppercase tracking-wider rounded-md shadow-md flex items-center gap-1">
                        <span>🔄</span>
                        <span>Retake</span>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>

        {/* CENTER STAGE */}
        <div className="flex-1 p-5 bg-neutral-900 border border-white/15 rounded-[20px] shadow-xl flex flex-col items-center justify-center gap-4 md:gap-6 overflow-hidden min-h-0 relative">
          {sessionState === "review_all" ? (
            <div className="w-full flex flex-col items-center gap-6 py-2 h-full min-h-0">
              <div className="text-center space-y-1 shrink-0">
                <span className="px-3 py-1 bg-black/40 border border-white/10 text-[9px] text-[#bcff00] font-bold font-['Outfit'] tracking-widest uppercase inline-block rounded-full">
                  Layar Review Sesi
                </span>
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-white leading-none">
                  Tinjau Hasil Foto Anda
                </h2>
                <p className="text-[10px] text-white/50 max-w-md mx-auto leading-relaxed uppercase font-['Outfit']">
                  Silakan tinjau tata letak frame di bawah. Anda dapat mengambil
                  ulang (retake) foto satuan dengan tombol di bawah frame.
                </p>
              </div>

              {/* DYNAMIC FRAME CANVAS PREVIEW CONTAINER */}
              <div
                ref={previewContainerRef}
                className="w-full flex-1 min-h-0 flex items-center justify-center relative overflow-hidden bg-black/40 border border-white/5 rounded-xl p-4 select-none"
              >
                <div
                  style={{
                    width: `${canvasWidth}px`,
                    height: `${canvasHeight}px`,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "center center",
                    position: "absolute",
                    backgroundColor:
                      activeEvent?.themeColor ||
                      template?.themeColor ||
                      "#ffffff",
                    backgroundImage:
                      template?.backgroundImage || activeEvent?.backgroundImage
                        ? `url(${template?.backgroundImage || activeEvent?.backgroundImage})`
                        : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  className="shadow-2xl border border-white/10 relative overflow-hidden"
                >
                  {/* Elements */}
                  {elements.map((el: any) => {
                    const style: React.CSSProperties = {
                      position: "absolute",
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.width}%`,
                      height: `${el.height}%`,
                      transform: el.rotation
                        ? `rotate(${el.rotation}deg)`
                        : undefined,
                      opacity:
                        el.opacity !== undefined ? el.opacity / 100 : undefined,
                      zIndex: el.zIndex || 10,
                    };

                    if (el.type === "photo") {
                      const photoIdx = photoElementsSorted.findIndex(
                        (pe: any) => pe.id === el.id,
                      );
                      const imageUrl = tempCaptured[photoIdx] || "";

                      return (
                        <div
                          key={el.id}
                          style={{
                            ...style,
                            borderRadius: `${el.borderRadius || 0}px`,
                          }}
                          className="overflow-hidden bg-neutral-950 border border-white/5 relative flex items-center justify-center"
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={`Captured Frame ${photoIdx + 1}`}
                              className={`w-full h-full ${el.objectFit === "contain" ? "object-contain" : "object-cover"}`}
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-2">
                              <RotateCcw className="w-5 h-5 animate-spin text-[#bcff00]" />
                              <span className="text-[8px] font-['Outfit'] font-bold uppercase tracking-widest text-[#bcff00]">
                                Retaking...
                              </span>
                            </div>
                          )}
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black text-[#bcff00] text-[7px] font-['Outfit'] tracking-widest uppercase rounded border border-white/10">
                            Frame #{photoIdx + 1}
                          </div>
                        </div>
                      );
                    }

                    if (el.type === "text" || el.type === "meta") {
                      let text = el.textValue || el.name;
                      if (el.type === "meta") {
                        if (el.name.toLowerCase().includes("tanggal")) {
                          text = new Date().toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          });
                        } else if (el.name.toLowerCase().includes("jam")) {
                          text = new Date().toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        } else if (el.name.toLowerCase().includes("event")) {
                          text = activeEvent?.name || "";
                        }
                      }

                      return (
                        <div
                          key={el.id}
                          style={{
                            ...style,
                            color: el.fontColor || "#000000",
                            fontSize: `${el.fontSize || 24}px`,
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                          }}
                          className="flex items-center justify-start overflow-hidden font-sans select-none"
                        >
                          {text}
                        </div>
                      );
                    }

                    if (el.type === "logo" || el.type === "decor") {
                      if (
                        el.textValue &&
                        el.textValue.startsWith("data:image")
                      ) {
                        return (
                          <img
                            key={el.id}
                            src={el.textValue}
                            alt={el.name}
                            style={style}
                            className="object-contain pointer-events-none"
                          />
                        );
                      }
                      return (
                        <div
                          key={el.id}
                          style={{
                            ...style,
                            border: "1px solid rgba(0,0,0,0.08)",
                            backgroundColor: "rgba(0,0,0,0.02)",
                          }}
                          className="flex items-center justify-center text-[10px] font-['Outfit'] font-bold uppercase tracking-wider text-center"
                        >
                          {el.name}
                        </div>
                      );
                    }

                    if (el.type === "qr") {
                      return (
                        <div
                          key={el.id}
                          style={{
                            ...style,
                            backgroundColor: "#ffffff",
                            padding: "4px",
                            border: "1px solid rgba(0,0,0,0.08)",
                          }}
                          className="flex flex-col items-center justify-center overflow-hidden"
                        >
                          <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-[7px] font-['Outfit'] text-zinc-400">
                            [QR CODE]
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}

                  {/* Template overlay on top */}
                  {template?.framePng && (
                    <img
                      src={template.framePng}
                      alt="Frame Overlay"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none z-30"
                    />
                  )}
                </div>
              </div>

              {/* RETAKE CONTROLS - OUTSIDE FRAME */}
              <div className="flex flex-col items-center gap-2 w-full shrink-0">
                <span className="font-['Outfit'] text-[9px] uppercase tracking-widest text-white/40 font-bold">
                  Ambil Ulang Satuan (Retake Frame)
                </span>
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl w-full">
                  {photoElementsSorted.map((el: any, idx: number) => (
                    <button
                      key={el.id}
                      onClick={() => {
                        setRetakeIndex(idx);
                        setTempCaptured((prev) => {
                          const next = [...prev];
                          next[idx] = "";
                          return next;
                        });
                        startCountDownSequence(true, idx);
                      }}
                      className="px-4 py-2 bg-black/40 hover:bg-[#bcff00] border border-white/10 hover:border-transparent text-[9px] font-['Outfit'] font-black uppercase tracking-widest text-white hover:text-black rounded-xl transition duration-150 flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Frame #{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* BOTTOM ACTIONS */}
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 w-full justify-center border-t border-dashed border-white/10 pt-4 shrink-0">
                <button
                  onClick={() => {
                    if (
                      mediaRecorderRef.current &&
                      mediaRecorderRef.current.state !== "inactive"
                    ) {
                      try {
                        mediaRecorderRef.current.stop();
                      } catch (_) {}
                    }
                    mediaRecorderRef.current = null;
                    recordedChunksRef.current = [];
                    setSessionBtsCaptureTimes([]);
                    setSessionVideoUrls([]);
                    setTempCaptured([]);
                    setCurrentPhotoIndex(0);
                    setSessionState("ready");
                  }}
                  className="px-6 py-3 bg-black/40 hover:bg-red-600 hover:text-white border border-white/10 hover:border-transparent text-[10px] font-['Outfit'] font-black uppercase tracking-wider text-white/80 rounded-xl transition duration-150 cursor-pointer"
                >
                  Ulang Semua Foto
                </button>
                <button
                  onClick={() => handleCompleteSession(tempCaptured)}
                  className="px-8 py-3 bg-[#bcff00] text-black hover:bg-white text-[10px] font-['Outfit'] font-black uppercase tracking-wider rounded-[20px] transition duration-150 cursor-pointer shadow-xl flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Gunakan Semua & Lanjut ke Editor
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center w-full space-y-3 flex flex-col items-center">
                <span className="font-['Outfit'] text-[10px] uppercase tracking-widest text-[#bcff00] font-black bg-black/40 border border-white/10 px-3 py-1 rounded-full">
                  Progress:{" "}
                  {currentPhotoIndex +
                    (sessionState === "preview_single" ? 1 : 0)}{" "}
                  / {photosToTake} Frame
                </span>

                {/* VIEWPORT WRAPPER */}
                <div className="relative w-full aspect-[16/9] bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
                  {/* STAGE CONTAINER WITH CSS ZOOM + FILTERS */}
                  <div
                    className="w-full h-full relative"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: "center center",
                      filter: `brightness(${brightness}%) contrast(${exposure}%) ${
                        activeFilter !== "none"
                          ? filterStyles[activeFilter]
                          : ""
                      }`,
                      transition:
                        "transform 0.2s ease-out, filter 0.1s ease-out",
                    }}
                  >
                    {useSimulator ? (
                      <div className="absolute inset-0 bg-[#0a0a0c] flex flex-col items-center justify-center space-y-4 text-white">
                        <Camera className="w-12 h-12 text-[#bcff00] animate-pulse" />
                        <div className="space-y-1 text-center">
                          <p className="text-[11px] font-black font-['Outfit'] uppercase tracking-widest text-[#bcff00]">
                            Virtual DSLR Viewfinder Active
                          </p>
                          <p className="text-[9px] text-zinc-400 font-['Outfit'] bg-black/60 px-3 py-1 rounded-lg border border-white/5 inline-block font-bold">
                            Auto-focusing ok • Capture Index #
                            {currentPhotoIndex + 1}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${mirror ? "scale-x-[-1]" : ""}`}
                      />
                    )}
                  </div>

                  {/* OVERLAY GRID */}
                  {showGrid && (
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-20">
                      <div className="border-b border-r border-white/15" />
                      <div className="border-b border-r border-white/15" />
                      <div className="border-b border-white/15" />
                      <div className="border-b border-r border-white/15" />
                      <div className="border-b border-r border-white/15" />
                      <div className="border-b border-white/15" />
                      <div className="border-r border-white/15" />
                      <div className="border-r border-white/15" />
                      <div />
                    </div>
                  )}

                  {/* COUNTDOWN TRANSPARENT OVERLAY */}
                  <AnimatePresence>
                    {(sessionState === "countdown" ||
                      sessionState === "countdown_retake") &&
                      currentCountdownVal > 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-30 pointer-events-none"
                        >
                          <motion.span
                            key={currentCountdownVal}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 1 }}
                            exit={{ scale: 1.8, opacity: 0 }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                            className="text-8xl md:text-9xl font-black text-[#bcff00] drop-shadow-[0_4px_20px_rgba(188,255,0,0.4)] font-['Outfit'] italic"
                          >
                            {currentCountdownVal}
                          </motion.span>
                        </motion.div>
                      )}
                  </AnimatePresence>

                  {/* SINGLE SNAPPED REVIEW OVERLAY */}
                  <AnimatePresence>
                    {sessionState === "preview_single" &&
                      latestSnappedPhoto && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-neutral-900 border border-white/10 flex flex-col justify-between p-6 z-40 rounded-2xl"
                        >
                          <div className="text-center space-y-1">
                            <span className="px-3.5 py-1.5 bg-black/40 border border-white/10 text-[9px] text-[#bcff00] font-black font-['Outfit'] tracking-widest uppercase inline-block rounded-full">
                              {retakeIndex !== null
                                ? "Retake Berhasil"
                                : "Frame Berhasil Disimpan"}
                            </span>
                            <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wide font-['Outfit']">
                              {retakeIndex !== null
                                ? `Frame ${retakeIndex + 1} telah diperbarui`
                                : `Frame ${tempCaptured.length} dari ${photosToTake}`}
                            </h3>
                          </div>

                          <div className="flex-1 min-h-0 flex items-center justify-center my-4">
                            <div className="h-full aspect-[16/9] bg-black border border-white/10 rounded-xl overflow-hidden relative shadow-2xl">
                              <img
                                src={latestSnappedPhoto}
                                alt="Review Shot"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-2 pb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-['Outfit'] uppercase tracking-widest text-white/60 font-bold">
                              {retakeIndex !== null
                                ? "Kembali ke menu review..."
                                : tempCaptured.length >= photosToTake
                                  ? "Membuka lembar tinjauan..."
                                  : "Menyiapkan bidikan berikutnya..."}
                            </span>
                          </div>
                        </motion.div>
                      )}
                  </AnimatePresence>
                </div>

                {/* PROGRESS BAR */}
                <div className="w-full h-1 bg-black/40 rounded-full border border-white/5 relative mt-2 overflow-hidden">
                  <div
                    className="absolute h-full left-0 top-0 bg-[#bcff00] transition-all duration-300 shadow-[0_0_10px_#bcff00]"
                    style={{
                      width: `${(tempCaptured.length / photosToTake) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* SIGNAL/TRIGGER BOTTON OPERATIONAL */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                {(sessionState === "ready" ||
                  sessionState === "countdown_retake") && (
                  <button
                    onClick={handleStartCapture}
                    className="w-16 h-16 bg-[#bcff00] border-4 border-neutral-900 rounded-full cursor-pointer shadow-[0_0_0_2px_#bcff00] flex items-center justify-center transition hover:scale-105 active:scale-95 group"
                  >
                    <Camera className="w-6 h-6 text-black group-hover:animate-pulse" />
                  </button>
                )}
                <span className="font-['Outfit'] text-[9px] font-black tracking-widest text-[#bcff00] uppercase mt-2">
                  {sessionState === "ready"
                    ? "Capture Frame"
                    : "Session Active"}
                </span>
              </div>
            </>
          )}
        </div>

        {/* RIGHT SIDEBAR - CAMERA ADJUSTMENTS */}
        {sessionState !== "review_all" && (
          <div className="h-fit w-full p-5 bg-neutral-900 border border-white/15 rounded-[20px] shadow-xl flex flex-col gap-6 text-left">
            {" "}
            {/* SLIDERS */}
            <div className="flex flex-col gap-5">
              <div className="pb-2 border-b border-white/10">
                <span className="font-['Outfit'] text-[10px] font-black uppercase tracking-widest text-[#bcff00] flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Visual Engine
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-['Outfit'] text-[9px] uppercase tracking-widest text-white/40 font-bold">
                  Digital Zoom [{zoom.toFixed(1)}x]
                </span>
                <input
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#bcff00]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-['Outfit'] text-[9px] uppercase tracking-widest text-white/40 font-bold">
                  Brightness [{brightness}%]
                </span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full h-1 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#bcff00]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-['Outfit'] text-[9px] uppercase tracking-widest text-white/40 font-bold">
                  Contrast [{exposure}%]
                </span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={exposure}
                  onChange={(e) => setExposure(parseInt(e.target.value))}
                  className="w-full h-1 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#bcff00]"
                />
              </div>
            </div>
            {/* EXTRA UTILITIES */}
            <div className="flex flex-col gap-3 pt-4 border-t border-dashed border-white/10">
              <span className="font-['Outfit'] text-[9px] uppercase tracking-widest text-white/40 font-bold">
                Toggles
              </span>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`py-2.5 px-3.5 border font-['Outfit'] text-[10px] font-black uppercase transition flex items-center justify-between cursor-pointer rounded-xl ${
                    showGrid
                      ? "bg-[#bcff00] border-[#bcff00] text-black"
                      : "bg-black/30 border-white/5 text-white/60 hover:text-white hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4" />
                    <span>Grid Overlay</span>
                  </div>
                  <span className="text-[9px] opacity-75">
                    {showGrid ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  onClick={() => setMirror(!mirror)}
                  className={`py-2.5 px-3.5 border font-['Outfit'] text-[10px] font-black uppercase transition flex items-center justify-between cursor-pointer rounded-xl ${
                    mirror
                      ? "bg-[#bcff00] border-[#bcff00] text-black"
                      : "bg-black/30 border-white/5 text-white/60 hover:text-white hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    <span>Mirror Mode</span>
                  </div>
                  <span className="text-[9px] opacity-75">
                    {mirror ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`py-2.5 px-3.5 border font-['Outfit'] text-[10px] font-black uppercase transition flex items-center justify-between cursor-pointer rounded-xl ${
                    isMuted
                      ? "bg-red-950/40 border-red-500/30 text-red-400"
                      : "bg-black/30 border-white/5 text-white/60 hover:text-white hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                    <span>Sound Beep</span>
                  </div>
                  <span className="text-[9px] opacity-75">
                    {isMuted ? "MUTED" : "ACTIVE"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
