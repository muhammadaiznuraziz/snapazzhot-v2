import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { BoothContextType } from "../../layouts/BoothLayout";
import { renderMedia } from "../../utils/render";
import {
  Camera,
  RotateCcw,
  Grid,
  Volume2,
  VolumeX,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  status: "success" | "retake" | "pending";
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
    setCapturedFrames,
    setAllSnappedPhotos,
    videoRef,
    selectedCameraId,
    setSelectedCameraId,
    useSimulator,
    setUseSimulator,
    playBeep,
    stopCamera,
    renderSimulatorPortrait,
    setCurrentFrameIndex,
    setCameraList,
    setSessionBtsCaptureTimes,
    sessionVideoUrls,
    setSessionVideoUrls,
    mirror,
    setMirror,
    zoom,
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
  const [, setRetakeIndex] = useState<number | null>(null);
  const [tempCaptured, setTempCaptured] = useState<string[]>([]);
  const [currentCountdownVal, setCurrentCountdownVal] = useState(0);
  const [latestSnappedPhoto, setLatestSnappedPhoto] = useState<string | null>(
    null,
  );
  const [processingMedia, setProcessingMedia] = useState(false);

  const [, setPhotoHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (tempCaptured.length === 0) {
      setPhotoHistory([]);
    }
  }, [tempCaptured]);

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

  const [showGrid, setShowGrid] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeFilter] = useState("none");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordingLoopActiveRef = useRef<boolean>(false);
  const captureResolutionRef = useRef<{ width: number; height: number }>({
    width: 1280,
    height: 720,
  });

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
        renderMedia({
          ctx,
          source: video,
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
          objectFit: "cover",
          mirror: false,
          zoom,
        });
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

    // Get camera native resolution for recording canvas
    const videoEl = videoRef.current;
    const camWidth = videoEl?.videoWidth || 1280;
    const camHeight = videoEl?.videoHeight || 720;
    captureResolutionRef.current = { width: camWidth, height: camHeight };

    if (rawStream) {
      const recCanvas = document.createElement("canvas");
      recCanvas.width = camWidth;
      recCanvas.height = camHeight;
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
      recCanvas.width = camWidth;
      recCanvas.height = camHeight;
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
    const videoEl = videoRef.current;
    const capWidth = videoEl?.videoWidth || 1280;
    const capHeight = videoEl?.videoHeight || 720;
    captureResolutionRef.current = { width: capWidth, height: capHeight };
    const canvas = document.createElement("canvas");
    canvas.width = capWidth;
    canvas.height = capHeight;
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
      }, 1200);
    } else {
      const updatedQueue = [...tempCaptured, capturedPhoto];
      setTempCaptured(updatedQueue);

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
      }, 1200);
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

    // Use camera native resolution for GIF output
    const { width: gifW, height: gifH } = captureResolutionRef.current;

    try {
      const gifshotLib = await loadGifshot();
      const compileOptions = {
        images: finalPhotos,
        interval: 0.45,
        gifWidth: gifW,
        gifHeight: gifH,
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

  if (processingMedia) {
    return (
      <div className="fixed inset-0 z-50 bg-[#004ce5] text-white flex flex-col items-center justify-center space-y-6 p-6 font-['Outfit',sans-serif]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />
        <div className="w-16 h-16 border-4 border-[#bcff00] border-t-transparent rounded-full animate-spin relative z-10 shadow-[0_0_20px_rgba(188,255,0,0.3)]" />
        <div className="text-center space-y-2 max-w-md relative z-10">
          <h2 className="text-2xl font-black uppercase tracking-wider text-[#bcff00] italic">
            Memproses Foto...
          </h2>
          <p className="text-xs text-white/70 uppercase tracking-widest font-mono">
            Mengompilasi animasi GIF & BTS Video Footage...
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 w-screen h-[100dvh] z-40 bg-[#004ce5] text-white flex flex-col overflow-hidden font-sans select-none"
    >
      {/* MATRIX GRID BACKGROUND */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none z-0" />

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

      {/* MAIN CONTAINER */}
      <div className="relative z-10 flex-1 h-full w-full flex flex-col p-4 md:p-6 max-w-7xl mx-auto overflow-hidden">
        {/* HEADER BAR */}
        <header className="flex items-center justify-between py-2 px-1 mb-2 shrink-0 border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#bcff00] animate-pulse" />
            <h1 className="text-sm md:text-base font-black tracking-widest uppercase text-white font-mono">
              SNAPAZZHOT
            </h1>
          </div>
          <div className="px-3.5 py-1 bg-black/40 border border-white/15 rounded-full text-[10px] font-mono tracking-widest uppercase text-[#bcff00]">
            {sessionState === "review_all"
              ? "SESI SELESAI"
              : `FRAME ${currentPhotoIndex + (sessionState === "preview_single" ? 1 : 0)} DARI ${photosToTake}`}
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative">
          {sessionState === "review_all" ? (
            /* REVIEW ALL LAYOUT */
            <div className="w-full h-full flex flex-col items-center justify-between gap-4 py-2">
              <div className="text-center space-y-1 shrink-0">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white ">
                  Tinjau Hasil Foto Sesi
                </h2>
                <p className="text-xs text-white/70 max-w-md mx-auto">
                  Silakan periksa susunan foto. Tekan tombol retake jika ingin
                  mengambil ulang slot tertentu.
                </p>
              </div>

              {/* FRAME CANVAS PREVIEW */}
              <div
                ref={previewContainerRef}
                className="w-full flex-1 min-h-[280px] flex items-center justify-center relative "
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
                  className="shadow-2xl border border-white/20 relative overflow-hidden rounded-md"
                >
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
                          className="overflow-hidden bg-neutral-900 border border-white/10 relative flex items-center justify-center"
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={`Captured Frame ${photoIdx + 1}`}
                              className={`w-full h-full ${
                                el.objectFit === "contain"
                                  ? "object-contain"
                                  : "object-cover"
                              }`}
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-2">
                              <RotateCcw className="w-5 h-5 animate-spin text-[#bcff00]" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-[#bcff00] text-[9px] font-mono tracking-wider uppercase rounded border border-white/10">
                            #{photoIdx + 1}
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
                          className="flex items-center justify-start overflow-hidden select-none"
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
                    }

                    return null;
                  })}
                  {template?.framePng && (
                    <img
                      src={template.framePng}
                      alt="Frame Overlay"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none z-30"
                    />
                  )}
                </div>
              </div>

              {/* ACTIONS & RETAKES BAR */}
              <div className="w-full max-w-xl flex flex-col items-center gap-3 shrink-0">
                <div className="flex flex-wrap justify-center gap-2 w-full">
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
                      className="px-3.5 py-1.5 bg-black/40 hover:bg-[#bcff00] hover:text-black border border-white/20 text-xs font-mono font-bold uppercase text-white rounded-lg transition flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retake #{idx + 1}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 w-full pt-1">
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
                    className="flex-1 py-3 bg-black/40 hover:bg-red-600 border border-white/15 hover:border-transparent text-xs font-mono font-bold uppercase tracking-wider text-white/80 hover:text-white rounded-xl transition cursor-pointer text-center"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => handleCompleteSession(tempCaptured)}
                    className="flex-1 py-3 bg-[#bcff00] hover:bg-white text-black text-xs font-mono font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-xl flex items-center justify-center gap-2"
                  >
                    <span>Lanjut Ke Editor</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* CAMERA LIVE VIEWPORT LAYOUT */
            <div className="w-full h-full flex flex-col items-center justify-between gap-4">
              {/* CAMERA VIEWPORT FRAME */}
              <div className="relative w-full flex-1 max-h-[70vh] aspect-[16/9] bg-neutral-900 border-2 border-white/20 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
                <div
                  className="w-full h-full relative"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center center",
                    filter: `brightness(100%) contrast(100%) ${
                      activeFilter !== "none" ? filterStyles[activeFilter] : ""
                    }`,
                    transition: "transform 0.2s ease-out, filter 0.1s ease-out",
                  }}
                >
                  {useSimulator ? (
                    <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center space-y-3 text-white p-4">
                      <Camera className="w-10 h-10 text-[#bcff00] animate-pulse" />
                      <div className="space-y-1 text-center">
                        <p className="text-xs font-mono uppercase tracking-widest text-[#bcff00]">
                          Simulator Kamera Aktif
                        </p>
                        <p className="text-[10px] text-neutral-400 font-mono">
                          Frame Index #{currentPhotoIndex + 1}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${
                        mirror ? "scale-x-[-1]" : ""
                      }`}
                    />
                  )}
                </div>

                {/* OVERLAY GRID */}
                {showGrid && (
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none z-20">
                    <div className="border-b border-r border-white/20" />
                    <div className="border-b border-r border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-b border-r border-white/20" />
                    <div className="border-b border-r border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-white/20" />
                    <div className="border-r border-white/20" />
                    <div />
                  </div>
                )}

                {/* FLOATING CAMERA TOGGLES */}
                <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-xl border border-white/15">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`p-2 rounded-lg transition cursor-pointer ${
                      showGrid
                        ? "bg-[#bcff00] text-black"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                    title="Grid"
                  >
                    <Grid className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setMirror(!mirror)}
                    className={`p-2 rounded-lg transition cursor-pointer ${
                      mirror
                        ? "bg-[#bcff00] text-black"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                    title="Mirror Image"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-2 rounded-lg transition cursor-pointer ${
                      isMuted
                        ? "bg-red-500/30 text-red-300 border border-red-500/40"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                    title="Sound Effects"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* COUNTDOWN OVERLAY */}
                <AnimatePresence>
                  {(sessionState === "countdown" ||
                    sessionState === "countdown_retake") &&
                    currentCountdownVal > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-30 pointer-events-none"
                      >
                        <motion.span
                          key={currentCountdownVal}
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 1.4, opacity: 0 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="text-8xl md:text-9xl font-black text-[#bcff00] font-mono italic"
                        >
                          {currentCountdownVal}
                        </motion.span>
                      </motion.div>
                    )}
                </AnimatePresence>

                {/* SINGLE SNAPPED REVIEW OVERLAY */}
                <AnimatePresence>
                  {sessionState === "preview_single" && latestSnappedPhoto && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center p-4 z-40"
                    >
                      <div className="relative w-full h-full max-w-2xl max-h-[80%] rounded-xl overflow-hidden border border-white/20 shadow-2xl">
                        <img
                          src={latestSnappedPhoto}
                          alt="Review Shot"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#bcff00]">
                        <span className="w-2 h-2 rounded-full bg-[#bcff00] animate-ping" />
                        <span>Foto Berhasil Diambil</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* TRIGGER BUTTON AREA */}
              <div className="flex flex-col items-center gap-2 shrink-0 pb-2">
                {(sessionState === "ready" ||
                  sessionState === "countdown_retake") && (
                  <button
                    onClick={handleStartCapture}
                    className="w-20 h-20 bg-[#bcff00] hover:bg-white text-black border-4 border-black rounded-full cursor-pointer shadow-[0_0_30px_rgba(188,255,0,0.4)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
                  >
                    <Camera className="w-8 h-8 text-black" />
                  </button>
                )}
                <span className="font-mono text-xs tracking-widest text-[#bcff00] uppercase font-bold">
                  {sessionState === "ready" ? "AMBIL FOTO" : "SESI BERJALAN..."}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
