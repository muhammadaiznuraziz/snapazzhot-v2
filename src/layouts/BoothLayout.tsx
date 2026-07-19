import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { PhotoRecord, AppEvent } from "../types";

export interface StickerInstance {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
}

export interface PhotoTransform {
  translateX: number;
  translateY: number;
  scale: number;
  rotation: number;
  mirrorX: boolean;
  mirrorY: boolean;
}

export interface BoothContextType {
  activeEvent: AppEvent;
  capturedFrames: string[];
  setCapturedFrames: React.Dispatch<React.SetStateAction<string[]>>;
  allSnappedPhotos: string[];
  setAllSnappedPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  currentFrameIndex: number;
  setCurrentFrameIndex: React.Dispatch<React.SetStateAction<number>>;
  frameFilters: Record<number, string>;
  setFrameFilters: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  frameStickers: Record<number, StickerInstance[]>;
  setFrameStickers: React.Dispatch<
    React.SetStateAction<Record<number, StickerInstance[]>>
  >;
  photoTransforms: Record<number, PhotoTransform>;
  setPhotoTransforms: React.Dispatch<
    React.SetStateAction<Record<number, PhotoTransform>>
  >;
  selectedFrameId: string;
  setSelectedFrameId: React.Dispatch<React.SetStateAction<string>>;
  compiledPhotoRecord: PhotoRecord | null;
  setCompiledPhotoRecord: React.Dispatch<
    React.SetStateAction<PhotoRecord | null>
  >;
  selectedBgTheme: string;
  setSelectedBgTheme: React.Dispatch<React.SetStateAction<string>>;
  selectedLayoutType: string;
  setSelectedLayoutType: React.Dispatch<React.SetStateAction<string>>;
  selectedCameraId: string;
  setSelectedCameraId: React.Dispatch<React.SetStateAction<string>>;
  useSimulator: boolean;
  setUseSimulator: React.Dispatch<React.SetStateAction<boolean>>;
  cameraList: any[];
  setCameraList: React.Dispatch<React.SetStateAction<any[]>>;
  countdownSeconds: number;
  setCountdownSeconds: React.Dispatch<React.SetStateAction<number>>;
  photosToTake: number;
  setPhotosToTake: React.Dispatch<React.SetStateAction<number>>;
  currentCountdown: number;
  setCurrentCountdown: React.Dispatch<React.SetStateAction<number>>;
  flash: boolean;
  setFlash: React.Dispatch<React.SetStateAction<boolean>>;
  isCapturing: boolean;
  setIsCapturing: React.Dispatch<React.SetStateAction<boolean>>;
  uploading: boolean;
  setUploading: React.Dispatch<React.SetStateAction<boolean>>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  emailSending: boolean;
  setEmailSending: React.Dispatch<React.SetStateAction<boolean>>;
  emailSent: boolean;
  setEmailSent: React.Dispatch<React.SetStateAction<boolean>>;
  printCopies: number;
  setPrintCopies: React.Dispatch<React.SetStateAction<number>>;
  printing: boolean;
  setPrinting: React.Dispatch<React.SetStateAction<boolean>>;
  printSuccess: boolean;
  setPrintSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  sessionGifUrl: string;
  setSessionGifUrl: React.Dispatch<React.SetStateAction<string>>;
  sessionVideoUrl: string;
  setSessionVideoUrl: React.Dispatch<React.SetStateAction<string>>;
  sessionVideoUrls: string[];
  setSessionVideoUrls: React.Dispatch<React.SetStateAction<string[]>>;
  sessionBtsCaptureTimes: number[];
  setSessionBtsCaptureTimes: React.Dispatch<React.SetStateAction<number[]>>;
  mirror: boolean;
  setMirror: React.Dispatch<React.SetStateAction<boolean>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  offscreenCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  playBeep: (freq: number, dur: number) => void;
  stopCamera: () => void;
  renderSimulatorPortrait: (idx: number) => string;
  handleCompileLayout: () => Promise<boolean>;
  handleSendEmail: (e: React.FormEvent) => Promise<void>;
  handleTriggerPrint: () => Promise<void>;
}

export default function BoothLayout() {
  const {
    activeEvent,
    events,
    setActiveEvent,
    fetchInitialData,
    templates,
    loading,
  } = useApp() as any;
  const navigate = useNavigate();
  const location = useLocation();
  const [creatingDefaultEvent, setCreatingDefaultEvent] = useState(false);

  const createDefaultEvent = async () => {
    setCreatingDefaultEvent(true);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Photo Booth Event",
          logo: "SNAPAZZHOT",
          frameId: "minimal-dark",
          countdown: 5,
          photoCount: 3,
          layoutType: "strip",
          themeColor: "#1a1a1a",
          qrExpiredMinutes: 60,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Gagal membuat event.");
      }
      setActiveEvent(data.data);
      await fetchInitialData();
    } catch (error) {
      console.error("Failed to create default booth event", error);
      alert(
        "Konfigurasi default belum bisa dibuat. Pastikan server sedang berjalan.",
      );
    } finally {
      setCreatingDefaultEvent(false);
    }
  };

  // If no active event, fallback to select screen
  useEffect(() => {
    if (!activeEvent && events.length > 0) {
      setActiveEvent(events[0]);
    }
  }, [activeEvent, events, setActiveEvent]);

  // Master Session states
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [allSnappedPhotos, setAllSnappedPhotos] = useState<string[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [frameFilters, setFrameFilters] = useState<Record<number, string>>({});
  const [frameStickers, setFrameStickers] = useState<
    Record<number, StickerInstance[]>
  >({});
  const [photoTransforms, setPhotoTransforms] = useState<
    Record<number, PhotoTransform>
  >({});
  const [selectedFrameId, setSelectedFrameId] = useState(
    activeEvent?.frameId || "minimal-dark",
  );
  const [compiledPhotoRecord, setCompiledPhotoRecord] =
    useState<PhotoRecord | null>(null);
  const [selectedBgTheme, setSelectedBgTheme] = useState("dark");
  const [selectedLayoutType, setSelectedLayoutType] = useState(
    activeEvent?.layoutType || "strip",
  );

  // Hardware states
  const [selectedCameraId, setSelectedCameraId] = useState("webcam-1");
  const [cameraList, setCameraList] = useState<any[]>([]);
  const [useSimulator, setUseSimulator] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(
    activeEvent?.countdown || 5,
  );
  const [photosToTake, setPhotosToTake] = useState(
    activeEvent?.photoCount || 3,
  );
  const [currentCountdown, setCurrentCountdown] = useState(0);
  const [flash, setFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Delivery states
  const [uploading, setUploading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [printCopies, setPrintCopies] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [sessionGifUrl, setSessionGifUrl] = useState<string>("");
  const [sessionVideoUrl, setSessionVideoUrl] = useState<string>("");
  const [sessionVideoUrls, setSessionVideoUrls] = useState<string[]>([]);
  const [sessionBtsCaptureTimes, setSessionBtsCaptureTimes] = useState<
    number[]
  >([]);
  const [mirror, setMirror] = useState(true);
  const [zoom, setZoom] = useState(1.0);

  // Stream Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const lastSyncedEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Sync default config when activeEvent loads for the first time
    if (activeEvent) {
      if (lastSyncedEventIdRef.current !== activeEvent.id) {
        setCountdownSeconds(activeEvent.countdown);
        setSelectedFrameId(activeEvent.frameId);
        setSelectedLayoutType(activeEvent.layoutType || "strip");
        setMirror(
          activeEvent.mirrorEnabled !== undefined
            ? activeEvent.mirrorEnabled
            : true,
        );
        lastSyncedEventIdRef.current = activeEvent.id;
      }
    }
  }, [activeEvent]);

  useEffect(() => {
    if (templates && templates.length > 0 && activeEvent) {
      const activeTpl = templates.find(
        (t: any) =>
          t.id === selectedFrameId ||
          t.id === activeEvent.frameId ||
          t.id === activeEvent.templateId ||
          t.id === `tpl-${selectedFrameId}` ||
          t.id === `tpl-${activeEvent.frameId}` ||
          t.id === `tpl-${activeEvent.templateId}`,
      );
      if (activeTpl) {
        const photoCount =
          activeTpl.elements?.filter((el: any) => el.type === "photo").length ||
          0;
        if (photoCount > 0) {
          setPhotosToTake(photoCount);
        } else {
          setPhotosToTake(activeEvent.photoCount || 3);
        }
      } else {
        setPhotosToTake(activeEvent.photoCount || 3);
      }
    }
  }, [templates, selectedFrameId, activeEvent]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const playBeep = (frequency: number, duration: number) => {
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + duration,
      );
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (_) {}
  };

  // High-quality mockup rendering for camera simulator fallback
  const renderSimulatorPortrait = (index: number): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Vibrant background gradients representing lighting aesthetics
    const gradients = [
      ["#1e1b4b", "#311042", "#0f051d"], // Cosmic Indigo
      ["#064e3b", "#022c22", "#011c14"], // Emerald Forest
      ["#4c0519", "#3b0712", "#1c0005"], // Velvet Wine
      ["#1e293b", "#0f172a", "#020617"], // Deep Slate
    ];
    const gradColors = gradients[index % gradients.length];
    const fillGrad = ctx.createRadialGradient(640, 360, 100, 640, 360, 800);
    fillGrad.addColorStop(0, gradColors[0]);
    fillGrad.addColorStop(0.5, gradColors[1]);
    fillGrad.addColorStop(1, gradColors[2]);
    ctx.fillStyle = fillGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid details
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Render lens blur circles
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(59, 130, 246, ${0.05 + i * 0.02})`;
      ctx.beginPath();
      ctx.arc(
        200 + i * 150,
        150 + Math.sin(i) * 100,
        80 + i * 20,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // Camera feedback outlines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // Crosshair
    ctx.beginPath();
    ctx.moveTo(640, 340);
    ctx.lineTo(640, 380);
    ctx.moveTo(620, 360);
    ctx.lineTo(660, 360);
    ctx.stroke();

    // Human representation placeholder
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("📷 SIMULATOR CAPTURE OK", 640, 320);

    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "14px monospace";
    ctx.fillText(`SNAP FRAME #${index + 1} • DETEKSI DSLR AUTOMATIC`, 640, 360);
    ctx.fillText(`ISO 400 • F/2.8 • 1/125s • sRGB`, 640, 390);

    return canvas.toDataURL("image/png");
  };

  const compileBtsVideoWithFrame = async (
    canvasWidth: number,
    canvasHeight: number,
    template: any,
    photoElements: any[],
    isCustom: boolean,
    positions: any[],
  ): Promise<string> => {
    return new Promise<string>(async (resolveCompile) => {
      try {
        const recordCanvas = document.createElement("canvas");
        recordCanvas.width = canvasWidth;
        recordCanvas.height = canvasHeight;
        const recordCtx = recordCanvas.getContext("2d");
        if (!recordCtx) {
          resolveCompile("");
          return;
        }

        const loadedImages: Record<string, HTMLImageElement> = {};
        const preloadImage = (src: string) => {
          return new Promise<void>((res) => {
            if (!src) return res();
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              loadedImages[src] = img;
              res();
            };
            img.onerror = () => res();
            img.src = src;
          });
        };

        const pList: Promise<void>[] = [];
        if (template) {
          if (template.backgroundImage)
            pList.push(preloadImage(template.backgroundImage));
          if (template.framePng) pList.push(preloadImage(template.framePng));
          (template.elements || []).forEach((el: any) => {
            if (
              (el.type === "logo" || el.type === "decor") &&
              el.textValue &&
              el.textValue.startsWith("data:image")
            ) {
              pList.push(preloadImage(el.textValue));
            }
          });
        } else if (activeEvent?.backgroundImage) {
          pList.push(preloadImage(activeEvent.backgroundImage));
        }

        capturedFrames.forEach((base64) => {
          pList.push(preloadImage(base64));
        });

        await Promise.all(pList);

        const videos: (HTMLVideoElement | null)[] = await Promise.all(
          capturedFrames.map((_, i) => {
            const url = sessionVideoUrls[i] || sessionVideoUrl;
            if (!url) return Promise.resolve(null);
            return new Promise<HTMLVideoElement | null>((res) => {
              const video = document.createElement("video");
              video.src = url;
              video.muted = true;
              video.playsInline = true;
              video.loop = true;
              video.onloadedmetadata = () => {
                video
                  .play()
                  .then(() => res(video))
                  .catch((e) => {
                    console.warn("Autoplay failed:", e);
                    res(video);
                  });
              };
              video.onerror = () => res(null);
            });
          }),
        );

        let stream: MediaStream;
        try {
          stream = (recordCanvas as any).captureStream(30);
        } catch (e) {
          console.warn("captureStream failed on recordCanvas", e);
          resolveCompile("");
          return;
        }

        let options = { mimeType: "video/webm;codecs=vp9" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = "video/webm";
        }
        const recorder = new MediaRecorder(stream, options);
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const objectUrl = URL.createObjectURL(blob);
          resolveCompile(objectUrl);
        };

        recorder.start();

        const startTime = Date.now();
        const duration = 5000;

        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          if (elapsed >= duration) {
            clearInterval(interval);
            try {
              recorder.stop();
            } catch (_) {
              resolveCompile("");
            }
            videos.forEach((v) => {
              if (v) {
                v.pause();
                v.src = "";
                v.load();
              }
            });
            return;
          }

          recordCtx.clearRect(0, 0, recordCanvas.width, recordCanvas.height);

          if (template) {
            if (
              template.backgroundImage &&
              loadedImages[template.backgroundImage]
            ) {
              recordCtx.drawImage(
                loadedImages[template.backgroundImage],
                0,
                0,
                recordCanvas.width,
                recordCanvas.height,
              );
            } else {
              recordCtx.fillStyle = activeEvent.themeColor || "#ffffff";
              recordCtx.fillRect(0, 0, recordCanvas.width, recordCanvas.height);
            }

            const sortedElements = [...(template.elements || [])].sort(
              (a, b) => (a.zIndex || 0) - (b.zIndex || 0),
            );

            const drawEl = (el: any) => {
              const pixelX = (el.x / 100) * recordCanvas.width;
              const pixelY = (el.y / 100) * recordCanvas.height;
              const pixelWidth = (el.width / 100) * recordCanvas.width;
              const pixelHeight = (el.height / 100) * recordCanvas.height;

              recordCtx.save();
              if (el.rotation) {
                const centerX = pixelX + pixelWidth / 2;
                const centerY = pixelY + pixelHeight / 2;
                recordCtx.translate(centerX, centerY);
                recordCtx.rotate((el.rotation * Math.PI) / 180);
                recordCtx.translate(-centerX, -centerY);
              }
              if (el.opacity !== undefined) {
                recordCtx.globalAlpha = el.opacity / 100;
              }

              if (el.type === "photo") {
                const photoIndex = photoElements.findIndex(
                  (pe: any) => pe.id === el.id,
                );
                if (photoIndex !== -1) {
                  const vid = videos[photoIndex];
                  const staticPic = loadedImages[capturedFrames[photoIndex]];
                  if (
                    vid &&
                    vid.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
                  ) {
                    drawMediaOnCanvas(
                      recordCtx,
                      vid,
                      photoIndex,
                      pixelX,
                      pixelY,
                      pixelWidth,
                      pixelHeight,
                    );
                  } else if (staticPic) {
                    drawMediaOnCanvas(
                      recordCtx,
                      staticPic,
                      photoIndex,
                      pixelX,
                      pixelY,
                      pixelWidth,
                      pixelHeight,
                    );
                  }
                }
              } else if (el.type === "text" || el.type === "meta") {
                recordCtx.fillStyle = el.fontColor || "#000000";
                const finalFontSize = el.fontSize
                  ? el.fontSize * (recordCanvas.width / 800)
                  : 24;
                recordCtx.font = `bold ${finalFontSize}px sans-serif`;
                recordCtx.textBaseline = "top";
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
                    text = activeEvent.name;
                  }
                }
                recordCtx.fillText(text, pixelX, pixelY);
              } else if (el.type === "qr") {
                recordCtx.fillStyle = "#ffffff";
                recordCtx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
                recordCtx.strokeStyle = "#000000";
                recordCtx.lineWidth = pixelWidth * 0.08;
                recordCtx.strokeRect(
                  pixelX + recordCtx.lineWidth / 2,
                  pixelY + recordCtx.lineWidth / 2,
                  pixelWidth - recordCtx.lineWidth,
                  pixelHeight - recordCtx.lineWidth,
                );
                const boxSize = pixelWidth * 0.25;
                recordCtx.fillRect(
                  pixelX + recordCtx.lineWidth,
                  pixelY + recordCtx.lineWidth,
                  boxSize,
                  boxSize,
                );
                recordCtx.fillRect(
                  pixelX + pixelWidth - recordCtx.lineWidth - boxSize,
                  pixelY + recordCtx.lineWidth,
                  boxSize,
                  boxSize,
                );
                recordCtx.fillRect(
                  pixelX + recordCtx.lineWidth,
                  pixelY + pixelHeight - recordCtx.lineWidth - boxSize,
                  boxSize,
                  boxSize,
                );
                recordCtx.fillStyle = "#000000";
                recordCtx.font = `bold ${pixelWidth * 0.1}px monospace`;
                recordCtx.textAlign = "center";
                recordCtx.textBaseline = "middle";
                recordCtx.fillText(
                  "SCAN",
                  pixelX + pixelWidth / 2,
                  pixelY + pixelHeight / 2,
                );
              } else if (el.type === "logo" || el.type === "decor") {
                if (
                  el.textValue &&
                  el.textValue.startsWith("data:image") &&
                  loadedImages[el.textValue]
                ) {
                  recordCtx.drawImage(
                    loadedImages[el.textValue],
                    pixelX,
                    pixelY,
                    pixelWidth,
                    pixelHeight,
                  );
                } else {
                  recordCtx.fillStyle = "rgba(0,0,0,0.05)";
                  recordCtx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
                  recordCtx.strokeStyle = "rgba(0,0,0,0.2)";
                  recordCtx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
                  recordCtx.fillStyle = "#000000";
                  recordCtx.font = "11px sans-serif";
                  recordCtx.textAlign = "center";
                  recordCtx.textBaseline = "middle";
                  recordCtx.fillText(
                    el.name,
                    pixelX + pixelWidth / 2,
                    pixelY + pixelHeight / 2,
                  );
                }
              }

              recordCtx.restore();
            };

            sortedElements.forEach((el) => {
              if (!el.hidden && !el.renderOnTop) drawEl(el);
            });

            if (template.framePng && loadedImages[template.framePng]) {
              recordCtx.drawImage(
                loadedImages[template.framePng],
                0,
                0,
                recordCanvas.width,
                recordCanvas.height,
              );
            }

            sortedElements.forEach((el) => {
              if (!el.hidden && el.renderOnTop) drawEl(el);
            });
          } else {
            if (isCustom) {
              if (
                activeEvent.backgroundImage &&
                loadedImages[activeEvent.backgroundImage]
              ) {
                recordCtx.drawImage(
                  loadedImages[activeEvent.backgroundImage],
                  0,
                  0,
                  recordCanvas.width,
                  recordCanvas.height,
                );
              } else {
                recordCtx.fillStyle = activeEvent.themeColor || "#ffffff";
                recordCtx.fillRect(
                  0,
                  0,
                  recordCanvas.width,
                  recordCanvas.height,
                );
              }

              positions.forEach((pos: any, i: number) => {
                const pixelX = (pos.x / 100) * recordCanvas.width;
                const pixelY = (pos.y / 100) * recordCanvas.height;
                const pixelWidth = (pos.width / 100) * recordCanvas.width;
                const pixelHeight = (pos.height / 100) * recordCanvas.height;

                const vid = videos[i];
                const staticPic = loadedImages[capturedFrames[i]];
                if (
                  vid &&
                  vid.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
                ) {
                  drawMediaOnCanvas(
                    recordCtx,
                    vid,
                    i,
                    pixelX,
                    pixelY,
                    pixelWidth,
                    pixelHeight,
                  );
                } else if (staticPic) {
                  drawMediaOnCanvas(
                    recordCtx,
                    staticPic,
                    i,
                    pixelX,
                    pixelY,
                    pixelWidth,
                    pixelHeight,
                  );
                }
              });

              drawBrandingFooter(
                recordCtx,
                recordCanvas.width,
                recordCanvas.height,
                recordCanvas.height - 150,
              );
            } else {
              const isStrip = selectedLayoutType === "strip";
              const isGrid = selectedLayoutType === "grid";
              const isDouble = selectedLayoutType === "double";

              drawThemeBackground(
                recordCtx,
                recordCanvas.width,
                recordCanvas.height,
                selectedBgTheme,
              );

              const drawStandardSlot = (
                i: number,
                x: number,
                y: number,
                w: number,
                h: number,
              ) => {
                const vid = videos[i];
                const staticPic = loadedImages[capturedFrames[i]];
                if (
                  vid &&
                  vid.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
                ) {
                  drawMediaOnCanvas(recordCtx, vid, i, x, y, w, h);
                } else if (staticPic) {
                  drawMediaOnCanvas(recordCtx, staticPic, i, x, y, w, h);
                }
              };

              if (isStrip) {
                const numPhotos = capturedFrames.length;
                if (numPhotos <= 4) {
                  const photoWidth = 520;
                  const photoHeight = 346;
                  const xOffset = 40;
                  const topStart = 50;
                  const gap = 35;
                  for (let i = 0; i < numPhotos; i++) {
                    const yOffset = topStart + i * (photoHeight + gap);
                    drawStandardSlot(
                      i,
                      xOffset,
                      yOffset,
                      photoWidth,
                      photoHeight,
                    );
                  }
                  drawBrandingFooter(
                    recordCtx,
                    recordCanvas.width,
                    recordCanvas.height,
                    1580,
                  );
                } else if (numPhotos <= 6) {
                  const photoWidth = 520;
                  const photoHeight = 230;
                  const xOffset = 40;
                  const topStart = 40;
                  const gap = 20;
                  for (let i = 0; i < numPhotos; i++) {
                    const yOffset = topStart + i * (photoHeight + gap);
                    drawStandardSlot(
                      i,
                      xOffset,
                      yOffset,
                      photoWidth,
                      photoHeight,
                    );
                  }
                  drawBrandingFooter(
                    recordCtx,
                    recordCanvas.width,
                    recordCanvas.height,
                    1550,
                  );
                } else {
                  const photoWidth = 520;
                  const photoHeight = 170;
                  const xOffset = 40;
                  const topStart = 40;
                  const gap = 15;
                  for (let i = 0; i < numPhotos; i++) {
                    const yOffset = topStart + i * (photoHeight + gap);
                    drawStandardSlot(
                      i,
                      xOffset,
                      yOffset,
                      photoWidth,
                      photoHeight,
                    );
                  }
                  drawBrandingFooter(
                    recordCtx,
                    recordCanvas.width,
                    recordCanvas.height,
                    1530,
                  );
                }
              } else if (isGrid) {
                const numPhotos = capturedFrames.length;
                if (numPhotos <= 4) {
                  const photoWidth = 510;
                  const photoHeight = 340;
                  if (capturedFrames.length > 0)
                    drawStandardSlot(0, 60, 50, photoWidth, photoHeight);
                  if (capturedFrames.length > 1)
                    drawStandardSlot(1, 630, 50, photoWidth, photoHeight);
                  if (capturedFrames.length > 2)
                    drawStandardSlot(2, 60, 420, photoWidth, photoHeight);
                  if (capturedFrames.length > 3)
                    drawStandardSlot(3, 630, 420, photoWidth, photoHeight);
                  drawBrandingFooter(
                    recordCtx,
                    recordCanvas.width,
                    recordCanvas.height,
                    780,
                  );
                } else if (numPhotos <= 6) {
                  const photoWidth = 340;
                  const photoHeight = 260;
                  const cols = [60, 430, 800];
                  const rows = [60, 360];
                  let photoIdx = 0;
                  for (let r = 0; r < 2; r++) {
                    for (let c = 0; c < 3; c++) {
                      if (photoIdx < numPhotos) {
                        drawStandardSlot(
                          photoIdx,
                          cols[c],
                          rows[r],
                          photoWidth,
                          photoHeight,
                        );
                        photoIdx++;
                      }
                    }
                  }
                  drawBrandingFooter(
                    recordCtx,
                    recordCanvas.width,
                    recordCanvas.height,
                    670,
                  );
                } else {
                  const photoWidth = 260;
                  const photoHeight = 200;
                  const cols = [40, 320, 600, 880];
                  const rows = [60, 290];
                  let photoIdx = 0;
                  for (let r = 0; r < 2; r++) {
                    for (let c = 0; c < 4; c++) {
                      if (photoIdx < numPhotos) {
                        drawStandardSlot(
                          photoIdx,
                          cols[c],
                          rows[r],
                          photoWidth,
                          photoHeight,
                        );
                        photoIdx++;
                      }
                    }
                  }
                  drawBrandingFooter(
                    recordCtx,
                    recordCanvas.width,
                    recordCanvas.height,
                    530,
                  );
                }
              } else if (isDouble) {
                const photoWidth = 520;
                const photoHeight = 480;
                if (capturedFrames.length > 0)
                  drawStandardSlot(0, 50, 60, photoWidth, photoHeight);
                if (capturedFrames.length > 1)
                  drawStandardSlot(1, 630, 60, photoWidth, photoHeight);
                drawBrandingFooter(
                  recordCtx,
                  recordCanvas.width,
                  recordCanvas.height,
                  640,
                );
              } else {
                const photoWidth = 1040;
                const photoHeight = 650;
                const xMargin = 80;
                const yMargin = 60;
                if (capturedFrames.length > 0) {
                  drawStandardSlot(
                    0,
                    xMargin,
                    yMargin,
                    photoWidth,
                    photoHeight,
                  );
                }
                drawBrandingFooter(
                  recordCtx,
                  recordCanvas.width,
                  recordCanvas.height,
                  750,
                );
              }

              drawFrameOverlayDecoration(
                recordCtx,
                recordCanvas.width,
                recordCanvas.height,
              );
            }
          }
        }, 33);
      } catch (err) {
        console.error("BTS compile error:", err);
        resolveCompile("");
      }
    });
  };

  const handleCompileLayout = async (): Promise<boolean> => {
    if (capturedFrames.length === 0 || !activeEvent) return false;
    setUploading(true);

    const blobToBase64 = async (blobUrl: string): Promise<string> => {
      if (!blobUrl || !blobUrl.startsWith("blob:")) return "";
      try {
        const res = await fetch(blobUrl);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.error("Failed converting blob to base64", err);
        return "";
      }
    };

    let noFrameImageBase64: string | null = null;
    let photoElements: any[] = [];
    let isCustom = false;
    let positions: any[] = [];

    const canvas =
      offscreenCanvasRef.current || document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setUploading(false);
      return;
    }

    const template = templates?.find(
      (t: any) =>
        t.id === selectedFrameId ||
        t.id === activeEvent.templateId ||
        t.id === activeEvent.frameId ||
        t.id === `tpl-${selectedFrameId}` ||
        t.id === `tpl-${activeEvent.templateId}` ||
        t.id === `tpl-${activeEvent.frameId}`,
    );

    if (template) {
      canvas.width = template.canvasWidth || 1200;
      canvas.height = template.canvasHeight || 800;

      // 1. Draw Background Image if any
      if (template.backgroundImage) {
        await new Promise((resolve) => {
          const bgImg = new Image();
          bgImg.onload = () => {
            ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
            resolve(null);
          };
          bgImg.onerror = () => {
            ctx.fillStyle = activeEvent.themeColor || "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            resolve(null);
          };
          bgImg.src = template.backgroundImage;
        });
      } else {
        ctx.fillStyle = activeEvent.themeColor || "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. Sort elements by zIndex
      const sortedElements = [...(template.elements || [])].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0),
      );

      // Filter and sort photo slots by their physical positions (top-to-bottom, left-to-right)
      // so that photo frames map to the correct logical sequence of captured frames.
      // We use a robust grouping-by-row algorithm to avoid non-transitive sort issues that can corrupt JS arrays.
      const rawPhotoElements = [...(template.elements || [])].filter(
        (el) => el.type === "photo",
      );
      const rows: any[][] = [];
      const sortedByY = [...rawPhotoElements].sort((a, b) => a.y - b.y);

      for (const el of sortedByY) {
        let foundRow = false;
        for (const r of rows) {
          const avgY = r.reduce((sum, item) => sum + item.y, 0) / r.length;
          if (Math.abs(avgY - el.y) < 10) {
            // 10% height tolerance is safe for row alignment
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

      photoElements = rows.flat();

      const drawSingleElement = async (el: any) => {
        const pixelX = (el.x / 100) * canvas.width;
        const pixelY = (el.y / 100) * canvas.height;
        const pixelWidth = (el.width / 100) * canvas.width;
        const pixelHeight = (el.height / 100) * canvas.height;

        ctx.save();

        // Handle rotation
        if (el.rotation) {
          const centerX = pixelX + pixelWidth / 2;
          const centerY = pixelY + pixelHeight / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate((el.rotation * Math.PI) / 180);
          ctx.translate(-centerX, -centerY);
        }

        // Handle opacity
        if (el.opacity !== undefined) {
          ctx.globalAlpha = el.opacity / 100;
        }

        if (el.type === "photo") {
          // Find which capture index this photo element corresponds to
          const photoIndex = photoElements.findIndex(
            (pe: any) => pe.id === el.id,
          );
          if (photoIndex !== -1 && capturedFrames[photoIndex]) {
            await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(
                  pixelX,
                  pixelY,
                  pixelWidth,
                  pixelHeight,
                  el.borderRadius || 0,
                );
                ctx.clip();

                const filterId = frameFilters[photoIndex] || "normal";
                applyFilterToCanvas(ctx, filterId);

                const imgRatio = img.width / img.height;
                const targetRatio = pixelWidth / pixelHeight;
                let sx = 0,
                  sy = 0,
                  sWidth = img.width,
                  sHeight = img.height;
                if (imgRatio > targetRatio) {
                  sWidth = img.height * targetRatio;
                  sx = (img.width - sWidth) / 2;
                } else {
                  sHeight = img.width / targetRatio;
                  sy = (img.height - sHeight) / 2;
                }
                ctx.drawImage(
                  img,
                  sx,
                  sy,
                  sWidth,
                  sHeight,
                  pixelX,
                  pixelY,
                  pixelWidth,
                  pixelHeight,
                );
                ctx.filter = "none";

                ctx.restore();
                resolve(null);
              };
              img.onerror = () => resolve(null);
              img.src = capturedFrames[photoIndex];
            });
          } else {
            ctx.fillStyle = "rgba(0,0,0,0.1)";
            ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
            ctx.strokeStyle = "rgba(255,255,255,0.2)";
            ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
          }
        } else if (el.type === "text" || el.type === "meta") {
          ctx.fillStyle = el.fontColor || "#000000";
          const finalFontSize = el.fontSize
            ? el.fontSize * (canvas.width / 800)
            : 24;
          ctx.font = `bold ${finalFontSize}px sans-serif`;
          ctx.textBaseline = "top";

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
              text = activeEvent.name;
            }
          }

          ctx.fillText(text, pixelX, pixelY);
        } else if (el.type === "qr") {
          // Draw a stylized vector QR Code mockup box
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = pixelWidth * 0.08;
          ctx.strokeRect(
            pixelX + ctx.lineWidth / 2,
            pixelY + ctx.lineWidth / 2,
            pixelWidth - ctx.lineWidth,
            pixelHeight - ctx.lineWidth,
          );

          // Draw nested squares inside corners for QR look
          const boxSize = pixelWidth * 0.25;
          ctx.fillRect(
            pixelX + ctx.lineWidth,
            pixelY + ctx.lineWidth,
            boxSize,
            boxSize,
          );
          ctx.fillRect(
            pixelX + pixelWidth - ctx.lineWidth - boxSize,
            pixelY + ctx.lineWidth,
            boxSize,
            boxSize,
          );
          ctx.fillRect(
            pixelX + ctx.lineWidth,
            pixelY + pixelHeight - ctx.lineWidth - boxSize,
            boxSize,
            boxSize,
          );

          ctx.fillStyle = "#000000";
          ctx.font = `bold ${pixelWidth * 0.1}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            "SCAN",
            pixelX + pixelWidth / 2,
            pixelY + pixelHeight / 2,
          );
        } else if (el.type === "logo" || el.type === "decor") {
          if (el.textValue && el.textValue.startsWith("data:image")) {
            await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                ctx.drawImage(img, pixelX, pixelY, pixelWidth, pixelHeight);
                resolve(null);
              };
              img.onerror = () => resolve(null);
              img.src = el.textValue || "";
            });
          } else {
            ctx.fillStyle = "rgba(0,0,0,0.05)";
            ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
            ctx.strokeStyle = "rgba(0,0,0,0.2)";
            ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
            ctx.fillStyle = "#000000";
            ctx.font = "11px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(
              el.name,
              pixelX + pixelWidth / 2,
              pixelY + pixelHeight / 2,
            );
          }
        }

        ctx.restore();
      };

      // 2a. Draw standard elements that do NOT render on top of the frame overlay
      for (const el of sortedElements) {
        if (el.hidden) continue;
        if (el.renderOnTop) continue;
        await drawSingleElement(el);
      }

      // Capture collage without frame
      try {
        noFrameImageBase64 = canvas.toDataURL("image/png");
      } catch (e) {
        console.warn("Canvas export (noFrame) blocked (tainted canvas).", e);
        noFrameImageBase64 = "";
      }

      // 3. Draw overlay Frame PNG template over the entire canvas at the end!
      if (template.framePng) {
        await new Promise((resolve) => {
          const frameImg = new Image();
          frameImg.crossOrigin = "anonymous";
          frameImg.onload = () => {
            ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
            resolve(null);
          };
          frameImg.onerror = () => resolve(null);
          frameImg.src = template.framePng;
        });
      }

      // 2b. Draw premium/custom elements that ARE set to render on top of the frame overlay
      for (const el of sortedElements) {
        if (el.hidden) continue;
        if (!el.renderOnTop) continue;
        await drawSingleElement(el);
      }
    } else {
      isCustom =
        activeEvent.frameId === "custom" &&
        activeEvent.layoutPositions &&
        activeEvent.layoutPositions.length > 0;

      if (isCustom) {
        const isStrip = activeEvent.layoutType === "strip";
        if (isStrip) {
          canvas.width = 600;
          canvas.height = 1800;
        } else if (activeEvent.layoutType === "single") {
          canvas.width = 1200;
          canvas.height = 900;
        } else {
          canvas.width = 1200;
          canvas.height = 800;
        }

        // Draw custom background image or color fallback
        if (activeEvent.backgroundImage) {
          await new Promise((resolve) => {
            const bgImg = new Image();
            bgImg.onload = () => {
              ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
              resolve(null);
            };
            bgImg.onerror = () => {
              ctx.fillStyle = activeEvent.themeColor || "#ffffff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              resolve(null);
            };
            bgImg.src = activeEvent.backgroundImage;
          });
        } else {
          ctx.fillStyle = activeEvent.themeColor || "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw custom slots
        positions = activeEvent.layoutPositions || [];
        for (
          let i = 0;
          i < Math.min(capturedFrames.length, positions.length);
          i++
        ) {
          const pos = positions[i];
          const pixelX = (pos.x / 100) * canvas.width;
          const pixelY = (pos.y / 100) * canvas.height;
          const pixelWidth = (pos.width / 100) * canvas.width;
          const pixelHeight = (pos.height / 100) * canvas.height;
          await drawPhotoOnCanvas(
            ctx,
            capturedFrames[i],
            i,
            pixelX,
            pixelY,
            pixelWidth,
            pixelHeight,
          );
        }

        // Overlay branding footer
        drawBrandingFooter(
          ctx,
          canvas.width,
          canvas.height,
          canvas.height - 150,
        );
      } else {
        const isStrip = selectedLayoutType === "strip";
        const isGrid = selectedLayoutType === "grid";
        const isDouble = selectedLayoutType === "double";

        if (isStrip) {
          canvas.width = 600;
          canvas.height = 1800;
          drawThemeBackground(
            ctx,
            canvas.width,
            canvas.height,
            selectedBgTheme,
          );

          const numPhotos = capturedFrames.length;
          if (numPhotos <= 4) {
            const photoWidth = 520;
            const photoHeight = 346;
            const xOffset = 40;
            const topStart = 50;
            const gap = 35;

            for (let i = 0; i < numPhotos; i++) {
              const yOffset = topStart + i * (photoHeight + gap);
              await drawPhotoOnCanvas(
                ctx,
                capturedFrames[i],
                i,
                xOffset,
                yOffset,
                photoWidth,
                photoHeight,
              );
            }
            drawBrandingFooter(ctx, canvas.width, canvas.height, 1580);
          } else if (numPhotos <= 6) {
            const photoWidth = 520;
            const photoHeight = 230;
            const xOffset = 40;
            const topStart = 40;
            const gap = 20;

            for (let i = 0; i < numPhotos; i++) {
              const yOffset = topStart + i * (photoHeight + gap);
              await drawPhotoOnCanvas(
                ctx,
                capturedFrames[i],
                i,
                xOffset,
                yOffset,
                photoWidth,
                photoHeight,
              );
            }
            drawBrandingFooter(ctx, canvas.width, canvas.height, 1550);
          } else {
            const photoWidth = 520;
            const photoHeight = 170;
            const xOffset = 40;
            const topStart = 40;
            const gap = 15;

            for (let i = 0; i < numPhotos; i++) {
              const yOffset = topStart + i * (photoHeight + gap);
              await drawPhotoOnCanvas(
                ctx,
                capturedFrames[i],
                i,
                xOffset,
                yOffset,
                photoWidth,
                photoHeight,
              );
            }
            drawBrandingFooter(ctx, canvas.width, canvas.height, 1530);
          }
        } else if (isGrid) {
          canvas.width = 1200;
          canvas.height = 900;
          drawThemeBackground(
            ctx,
            canvas.width,
            canvas.height,
            selectedBgTheme,
          );

          const numPhotos = capturedFrames.length;

          if (numPhotos <= 4) {
            const photoWidth = 510;
            const photoHeight = 340;
            if (capturedFrames.length > 0)
              await drawPhotoOnCanvas(
                ctx,
                capturedFrames[0],
                0,
                60,
                50,
                photoWidth,
                photoHeight,
              );
            if (capturedFrames.length > 1)
              await drawPhotoOnCanvas(
                ctx,
                capturedFrames[1],
                1,
                630,
                50,
                photoWidth,
                photoHeight,
              );
            if (capturedFrames.length > 2)
              await drawPhotoOnCanvas(
                ctx,
                capturedFrames[2],
                2,
                60,
                420,
                photoWidth,
                photoHeight,
              );
            if (capturedFrames.length > 3)
              await drawPhotoOnCanvas(
                ctx,
                capturedFrames[3],
                3,
                630,
                420,
                photoWidth,
                photoHeight,
              );
            drawBrandingFooter(ctx, canvas.width, canvas.height, 780);
          } else if (numPhotos <= 6) {
            const photoWidth = 340;
            const photoHeight = 260;
            const cols = [60, 430, 800];
            const rows = [60, 360];
            let photoIdx = 0;
            for (let r = 0; r < 2; r++) {
              for (let c = 0; c < 3; c++) {
                if (photoIdx < numPhotos) {
                  await drawPhotoOnCanvas(
                    ctx,
                    capturedFrames[photoIdx],
                    photoIdx,
                    cols[c],
                    rows[r],
                    photoWidth,
                    photoHeight,
                  );
                  photoIdx++;
                }
              }
            }
            drawBrandingFooter(ctx, canvas.width, canvas.height, 670);
          } else {
            const photoWidth = 260;
            const photoHeight = 200;
            const cols = [40, 320, 600, 880];
            const rows = [60, 290];
            let photoIdx = 0;
            for (let r = 0; r < 2; r++) {
              for (let c = 0; c < 4; c++) {
                if (photoIdx < numPhotos) {
                  await drawPhotoOnCanvas(
                    ctx,
                    capturedFrames[photoIdx],
                    photoIdx,
                    cols[c],
                    rows[r],
                    photoWidth,
                    photoHeight,
                  );
                  photoIdx++;
                }
              }
            }
            drawBrandingFooter(ctx, canvas.width, canvas.height, 530);
          }
        } else if (isDouble) {
          canvas.width = 1200;
          canvas.height = 800;
          drawThemeBackground(
            ctx,
            canvas.width,
            canvas.height,
            selectedBgTheme,
          );

          const photoWidth = 520;
          const photoHeight = 480;

          if (capturedFrames.length > 0)
            await drawPhotoOnCanvas(
              ctx,
              capturedFrames[0],
              0,
              50,
              60,
              photoWidth,
              photoHeight,
            );
          if (capturedFrames.length > 1)
            await drawPhotoOnCanvas(
              ctx,
              capturedFrames[1],
              1,
              630,
              60,
              photoWidth,
              photoHeight,
            );

          drawBrandingFooter(ctx, canvas.width, canvas.height, 640);
        } else {
          canvas.width = 1200;
          canvas.height = 900;
          drawThemeBackground(
            ctx,
            canvas.width,
            canvas.height,
            selectedBgTheme,
          );

          const photoWidth = 1040;
          const photoHeight = 650;
          const xMargin = 80;
          const yMargin = 60;

          if (capturedFrames.length > 0) {
            await drawPhotoOnCanvas(
              ctx,
              capturedFrames[0],
              0,
              xMargin,
              yMargin,
              photoWidth,
              photoHeight,
            );
          }

          drawBrandingFooter(ctx, canvas.width, canvas.height, 750);
        }
      }

      // Capture collage without frame
      noFrameImageBase64 = canvas.toDataURL("image/png");

      drawFrameOverlayDecoration(ctx, canvas.width, canvas.height);
    }
    const finalImageBase64 = canvas.toDataURL("image/png");

    try {
      let videoBase64 = "";
      let compiledBtsUrl = "";
      try {
        compiledBtsUrl = await compileBtsVideoWithFrame(
          canvas.width,
          canvas.height,
          template,
          photoElements,
          isCustom,
          positions,
        );
      } catch (e) {
        console.error("Failed to compile framed BTS video:", e);
      }

      const videoToUpload = compiledBtsUrl || sessionVideoUrl;
      if (videoToUpload && videoToUpload.startsWith("blob:")) {
        try {
          videoBase64 = await blobToBase64(videoToUpload);
        } catch (e) {
          console.error("Failed to convert video blob to base64", e);
        }
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: finalImageBase64,
          type: "photo",
          eventId: activeEvent.id,
          meta: {
            filterApplied: "hybrid",
            stickersCount: 0,
            kioskMode: false,
            browserInfo: navigator.userAgent,
            gifUrl: sessionGifUrl,
            videoFile: videoBase64,
            noFrameFile: noFrameImageBase64,
            rawPhotos:
              allSnappedPhotos.length > 0 ? allSnappedPhotos : capturedFrames,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCompiledPhotoRecord(data.data);
        await fetchInitialData();
        return true;
      } else {
        alert("Gagal mengupload layout foto.");
        return false;
      }
    } catch (err) {
      alert("Kesalahan koneksi saat mengirim data.");
      return false;
    } finally {
      setUploading(false);
    }
  };

  const drawMediaOnCanvas = (
    ctx: CanvasRenderingContext2D,
    source: HTMLImageElement | HTMLVideoElement,
    frameIndex: number,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    if (!source) return;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.clip();

    const filterId = frameFilters[frameIndex] || "normal";
    applyFilterToCanvas(ctx, filterId);

    // Get user transform
    const transform = photoTransforms[frameIndex] || {
      translateX: 0,
      translateY: 0,
      scale: 1,
      rotation: 0,
      mirrorX: false,
      mirrorY: false,
    };

    let sourceWidth = 1280;
    let sourceHeight = 720;
    if (source instanceof HTMLImageElement) {
      sourceWidth = source.naturalWidth || 1280;
      sourceHeight = source.naturalHeight || 720;
    } else if (source instanceof HTMLVideoElement) {
      sourceWidth = source.videoWidth || 1280;
      sourceHeight = source.videoHeight || 720;
    }

    const imgRatio = sourceWidth / sourceHeight;
    const targetRatio = w / h;

    // Base cover dimensions
    let drawW = w;
    let drawH = h;
    if (imgRatio > targetRatio) {
      drawW = h * imgRatio;
    } else {
      drawH = w / imgRatio;
    }

    // Apply scale (zoom) - user scale is >= 1.0
    const finalScale = Math.max(1, transform.scale);
    const scaledW = drawW * finalScale;
    const scaledH = drawH * finalScale;

    // Max allowed translation to keep the slot fully covered
    const maxTx = Math.max(0, (scaledW - w) / 2);
    const maxTy = Math.max(0, (scaledH - h) / 2);

    // Bound translations
    const boundTx = Math.min(maxTx, Math.max(-maxTx, transform.translateX));
    const boundTy = Math.min(maxTy, Math.max(-maxTy, transform.translateY));

    ctx.save();

    // Translate to the center of the slot
    ctx.translate(x + w / 2, y + h / 2);

    // Apply mirroring
    ctx.scale(transform.mirrorX ? -1 : 1, transform.mirrorY ? -1 : 1);

    // Apply rotation
    if (transform.rotation) {
      ctx.rotate((transform.rotation * Math.PI) / 180);
    }

    // Draw source relative to center
    ctx.drawImage(
      source,
      -scaledW / 2 + boundTx,
      -scaledH / 2 + boundTy,
      scaledW,
      scaledH,
    );

    ctx.restore();
    ctx.filter = "none";

    ctx.restore();
  };

  const drawPhotoOnCanvas = (
    ctx: CanvasRenderingContext2D,
    base64Data: string,
    frameIndex: number,
    x: number,
    y: number,
    w: number,
    h: number,
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (!base64Data) {
        resolve();
        return;
      }
      const img = new Image();
      img.onload = () => {
        drawMediaOnCanvas(ctx, img, frameIndex, x, y, w, h);
        resolve();
      };
      img.onerror = () => {
        console.error("Failed to load photo, skipping gracefully");
        resolve();
      };
      img.src = base64Data;
    });
  };

  const applyFilterToCanvas = (
    ctx: CanvasRenderingContext2D,
    filterId: string,
  ) => {
    if (filterId === "vintage")
      ctx.filter = "sepia(0.8) contrast(1.2) brightness(0.95)";
    else if (filterId === "retro")
      ctx.filter = "contrast(1.1) saturate(1.5) hue-rotate(15deg)";
    else if (filterId === "warm")
      ctx.filter = "sepia(0.25) saturate(1.25) hue-rotate(-10deg)";
    else if (filterId === "cool")
      ctx.filter =
        "contrast(1.05) saturate(0.75) hue-rotate(15deg) brightness(1.05)";
    else if (filterId === "cinema")
      ctx.filter = "contrast(1.3) brightness(0.9) saturate(0.5)";
    else if (filterId === "bw") ctx.filter = "grayscale(1) contrast(1.5)";
    else if (filterId === "sepia") ctx.filter = "sepia(1) contrast(1)";
    else ctx.filter = "none";
  };

  const drawThemeBackground = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    themeId: string,
  ) => {
    ctx.save();
    if (themeId === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, width - 10, height - 10);
    } else if (themeId === "dark") {
      ctx.fillStyle = "#121214";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      for (let x = 20; x < width; x += 40) {
        for (let y = 20; y < height; y += 40) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (themeId === "blush") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#fff1f2");
      grad.addColorStop(0.5, "#ffe4e6");
      grad.addColorStop(1, "#fecdd3");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(244, 63, 94, 0.03)";
      ctx.beginPath();
      ctx.arc(width * 0.2, height * 0.2, 180, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width * 0.8, height * 0.7, 240, 0, Math.PI * 2);
      ctx.fill();
    } else if (themeId === "gold") {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#a16207");
      grad.addColorStop(0.3, "#fef08a");
      grad.addColorStop(0.7, "#fde047");
      grad.addColorStop(1, "#713f12");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      for (let i = 0; i < 30; i++) {
        const x = (i * 123) % width;
        const y = (i * 456) % height;
        const r = (i % 3) + 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mint") {
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, "#f0fdf4");
      grad.addColorStop(0.5, "#dcfce7");
      grad.addColorStop(1, "#bbf7d0");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "rgba(34, 197, 94, 0.04)";
      ctx.beginPath();
      ctx.moveTo(40, 40);
      ctx.lineTo(140, 20);
      ctx.lineTo(90, 110);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(width - 50, height - 120);
      ctx.lineTo(width - 150, height - 40);
      ctx.lineTo(width - 40, height - 20);
      ctx.closePath();
      ctx.fill();
    } else if (themeId === "sunset") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#fff7ed");
      grad.addColorStop(0.5, "#ffedd5");
      grad.addColorStop(1, "#fed7aa");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      const sunGrad = ctx.createRadialGradient(
        width * 0.85,
        120,
        20,
        width * 0.85,
        120,
        300,
      );
      sunGrad.addColorStop(0, "rgba(249, 115, 22, 0.12)");
      sunGrad.addColorStop(1, "rgba(249, 115, 22, 0)");
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width * 0.85, 120, 300, 0, Math.PI * 2);
      ctx.fill();
    } else if (themeId === "cyber") {
      ctx.fillStyle = "#090514";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(219, 39, 119, 0.12)";
      ctx.lineWidth = 1.5;
      for (let x = 0; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      const cyberGrad = ctx.createLinearGradient(0, height - 200, 0, height);
      cyberGrad.addColorStop(0, "rgba(147, 51, 234, 0)");
      cyberGrad.addColorStop(1, "rgba(147, 51, 234, 0.2)");
      ctx.fillStyle = cyberGrad;
      ctx.fillRect(0, height - 200, width, 200);
    } else {
      ctx.fillStyle = activeEvent.themeColor || "#0f172a";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  };

  const drawBrandingFooter = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    startY: number,
  ) => {
    if (!activeEvent) return;
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, startY);
    ctx.lineTo(canvasWidth - 40, startY);
    ctx.stroke();

    ctx.fillStyle = "#000000";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(activeEvent.name.toUpperCase(), 50, startY + 45);

    ctx.fillStyle = "#666666";
    ctx.font = "14px monospace";
    ctx.fillText(
      activeEvent.logo || "snapazzhot. premium photo service",
      50,
      startY + 75,
    );

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.font = "italic 11px sans-serif";
    ctx.fillText("crafted with snapazzhot. kiosk system", 50, startY + 105);

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(canvasWidth - 140, startY + 20, 90, 90);
    ctx.fillStyle = "#3b82f6";
    ctx.font = "bold 10px monospace";
    ctx.fillText("SCAN TO", canvasWidth - 132, startY + 55);
    ctx.fillText("DOWNLOAD", canvasWidth - 135, startY + 75);
    ctx.restore();
  };

  const drawFrameOverlayDecoration = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
  ) => {
    if (selectedFrameId === "custom") return;
    ctx.save();
    if (selectedFrameId === "wedding-classic") {
      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 20;
      ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20);
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 2;
      ctx.strokeRect(25, 25, canvasWidth - 50, canvasHeight - 50);
    } else if (selectedFrameId === "grad-gold") {
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 24;
      ctx.strokeRect(12, 12, canvasWidth - 24, canvasHeight - 24);
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 4;
      ctx.strokeRect(28, 28, canvasWidth - 56, canvasHeight - 56);
    } else if (selectedFrameId === "birthday-neon") {
      ctx.strokeStyle = "#ec4899";
      ctx.lineWidth = 16;
      ctx.shadowColor = "#ec4899";
      ctx.shadowBlur = 15;
      ctx.strokeRect(8, 8, canvasWidth - 16, canvasHeight - 16);
    } else {
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, canvasWidth - 12, canvasHeight - 12);
    }
    ctx.restore();
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compiledPhotoRecord || !email) return;
    setEmailSending(true);
    setEmailSent(false);

    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          photoId: compiledPhotoRecord.id,
          downloadUrl: new URL(
            compiledPhotoRecord.url,
            window.location.origin,
          ).toString(),
          gifUrl: compiledPhotoRecord.meta?.gifUrl
            ? new URL(
                compiledPhotoRecord.meta.gifUrl,
                window.location.origin,
              ).toString()
            : undefined,
          videoUrl: compiledPhotoRecord.meta?.videoUrl
            ? new URL(
                compiledPhotoRecord.meta.videoUrl,
                window.location.origin,
              ).toString()
            : undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setEmailSent(true);
        setEmail("");
      }
    } catch (_) {
      alert("Gagal menghubungi SMTP.");
    } finally {
      setEmailSending(false);
    }
  };

  const handleTriggerPrint = async () => {
    if (!compiledPhotoRecord || !activeEvent) return;
    setPrinting(true);
    setPrintSuccess(false);

    try {
      const response = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoId: compiledPhotoRecord.id,
          size: activeEvent.layoutType === "strip" ? "2x6" : "4x6",
          copies: printCopies,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 3000);
      } else {
        alert(data.message || "Printer gagal memproses.");
      }
    } catch (_) {
      alert("Print service offline.");
    } finally {
      setPrinting(false);
    }
  };

  if (!activeEvent) {
    return (
      <div className="w-full min-h-screen h-[100dvh] bg-[#0066ff] bg-grid-pattern relative flex flex-col justify-between p-6">
        {" "}
        {loading ? (
          <div className="text-xs">Memuat konfigurasi event...</div>
        ) : (
          <div className="max-w-sm rounded-2xl border border-[#1a1a1a]/10 bg-white p-7 text-center shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/45">
              Konfigurasi diperlukan
            </p>
            <h1 className="mt-3 font-serif text-2xl italic">
              Belum ada event aktif
            </h1>
            <p className="mt-2 text-xs leading-5 text-[#1a1a1a]/65">
              Buat konfigurasi standar untuk langsung memulai sesi, atau atur
              event dari dashboard.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={createDefaultEvent}
                disabled={creatingDefaultEvent}
                className="rounded-xl bg-[#1a1a1a] px-4 py-3 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60"
              >
                {creatingDefaultEvent
                  ? "Membuat konfigurasi..."
                  : "Gunakan konfigurasi standar"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard/events")}
                className="rounded-xl border border-[#1a1a1a]/15 px-4 py-3 text-xs font-bold"
              >
                Atur event di dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-screen h-[100dvh] bg-[#f8f7f4] text-[#1a1a1a] flex flex-col justify-between overflow-hidden">
      {/* Offscreen Canvas for rendering layout compilation */}
      <canvas ref={offscreenCanvasRef} style={{ display: "none" }} />
      <div className="flex-1 flex flex-col justify-stretch min-h-0 h-full relative overflow-hidden">
        <Outlet
          context={{
            activeEvent,
            capturedFrames,
            setCapturedFrames,
            allSnappedPhotos,
            setAllSnappedPhotos,
            currentFrameIndex,
            setCurrentFrameIndex,
            frameFilters,
            setFrameFilters,
            frameStickers,
            setFrameStickers,
            photoTransforms,
            setPhotoTransforms,
            selectedFrameId,
            setSelectedFrameId,
            compiledPhotoRecord,
            setCompiledPhotoRecord,
            selectedBgTheme,
            setSelectedBgTheme,
            selectedLayoutType,
            setSelectedLayoutType,
            selectedCameraId,
            setSelectedCameraId,
            useSimulator,
            setUseSimulator,
            cameraList,
            setCameraList,
            countdownSeconds,
            setCountdownSeconds,
            photosToTake,
            setPhotosToTake,
            currentCountdown,
            setCurrentCountdown,
            flash,
            setFlash,
            isCapturing,
            setIsCapturing,
            uploading,
            setUploading,
            email,
            setEmail,
            emailSending,
            setEmailSending,
            emailSent,
            setEmailSent,
            printCopies,
            setPrintCopies,
            printing,
            setPrinting,
            printSuccess,
            setPrintSuccess,
            sessionGifUrl,
            setSessionGifUrl,
            sessionVideoUrl,
            setSessionVideoUrl,
            sessionVideoUrls,
            setSessionVideoUrls,
            sessionBtsCaptureTimes,
            setSessionBtsCaptureTimes,
            mirror,
            setMirror,
            zoom,
            setZoom,
            videoRef,
            offscreenCanvasRef,
            playBeep,
            stopCamera,
            renderSimulatorPortrait,
            handleCompileLayout,
            handleSendEmail,
            handleTriggerPrint,
          }}
        />
      </div>
    </div>
  );
}
