import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { Camera, RefreshCw, Sliders, ChevronLeft, ChevronRight, Check, Printer, Mail, Share2, Download, Trash, Heart, Sparkles, QrCode } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppEvent, PhotoRecord } from "../../types";

const AVAILABLE_FILTERS = [
  { id: "normal", name: "Normal", class: "" },
  { id: "vintage", name: "Vintage", class: "sepia contrast-125 brightness-95 saturate-75" },
  { id: "retro", name: "Retro", class: "contrast-110 saturate-150 brightness-90 hue-rotate-15" },
  { id: "warm", name: "Warm", class: "sepia-[0.25] saturate-125 hue-rotate-[-10deg]" },
  { id: "cool", name: "Cool", class: "contrast-105 saturate-75 hue-rotate-[15deg] brightness-105" },
  { id: "cinema", name: "Cinema", class: "contrast-130 brightness-90 saturate-50" },
  { id: "bw", name: "Black & White", class: "grayscale contrast-150" },
  { id: "sepia", name: "Sepia", class: "sepia contrast-100 saturate-100" },
];

export default function PhotoBoothKiosk() {
  const { activeEvent, events, setActiveEvent, fetchInitialData } = useApp();
  const navigate = useNavigate();

  const onRefreshGallery = fetchInitialData;
  const onClose = () => navigate("/landing");

  // If no active event is configured yet, render a beautiful selection screen
  if (!activeEvent) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] flex flex-col items-center justify-center p-6 text-center selection:bg-[#1a1a1a] selection:text-white font-sans">
        <div className="max-w-md space-y-6">
          <div className="h-12 w-12 bg-[#1a1a1a]/5 border border-[#1a1a1a]/[0.08] text-[#1a1a1a] rounded flex items-center justify-center mx-auto animate-pulse">
            <Camera className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-serif italic text-[#1a1a1a]">Kiosk Photo Booth</h3>
            <p className="text-xs text-[#1a1a1a]/60 leading-relaxed">
              Silakan pilih salah satu event aktif berikut untuk memulai sesi pemotretan interaktif.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            {events.length === 0 ? (
              <p className="text-xs text-[#1a1a1a]/40 italic font-mono uppercase tracking-widest">Belum ada event yang aktif. Silakan tambahkan lewat Dashboard Admin.</p>
            ) : (
              events.map(evt => (
                <button
                  key={evt.id}
                  onClick={() => setActiveEvent(evt)}
                  className="w-full p-4 bg-white hover:bg-[#1a1a1a]/5 border border-[#1a1a1a]/[0.08] rounded transition text-left flex justify-between items-center group cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-bold text-[#1a1a1a] group-hover:underline transition-colors">{evt.name}</p>
                    <p className="text-[9px] text-[#1a1a1a]/40 uppercase font-mono tracking-widest mt-1">{evt.layoutType} layout • {evt.photoCount} snaps</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#1a1a1a]/40 group-hover:text-[#1a1a1a] transition-colors" />
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => navigate("/landing")}
            className="text-xs text-[#1a1a1a]/50 hover:text-[#1a1a1a] underline transition font-mono uppercase tracking-widest"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // Navigation states: 'setup' | 'live' | 'captured' | 'edit' | 'compiled'
  const [step, setStep] = useState<'setup' | 'live' | 'captured' | 'edit' | 'compiled'>('setup');
  
  // Photo capturing configurations
  const [photosToTake, setPhotosToTake] = useState(activeEvent.photoCount);
  const [countdownSeconds, setCountdownSeconds] = useState(activeEvent.countdown);
  const [currentCountdown, setCurrentCountdown] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  
  // Camera state
  const [selectedCameraId, setSelectedCameraId] = useState("webcam-1");
  const [cameraList, setCameraList] = useState<any[]>([]);
  const [useSimulator, setUseSimulator] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState(false);
  
  // Photo Booth content states
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0); // for editing
  const [frameFilters, setFrameFilters] = useState<Record<number, string>>({}); // frameIndex -> filterId
  
  // Layout Frame choice
  const [selectedFrameId, setSelectedFrameId] = useState(activeEvent.frameId);

  // Compiled photo URL from server
  const [uploading, setUploading] = useState(false);
  const [compiledPhotoRecord, setCompiledPhotoRecord] = useState<PhotoRecord | null>(null);
  
  // Output utilities
  const [email, setEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [printCopies, setPrintCopies] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  // Video and Canvas references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load camera list and request permission
  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn("Video play interrupted:", e));
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === "videoinput");
        setCameraList(videoDevices);
        setCameraPermissionError(false);
        setUseSimulator(false);
      } catch (err) {
        console.warn("Failed to open real camera, fallback to high-quality Simulator camera stream.", err);
        setCameraPermissionError(true);
        setUseSimulator(true);
      }
    }

    if (step === 'live') {
      initCamera();
    }

    return () => {
      stopCamera();
    };
  }, [step]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Web Audio Synthesizer Beep for countdown ticks
  const playBeep = (frequency: number, duration: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (_) {}
  };

  // Start the automated photo capture loop
  const handleStartCaptureSequence = async () => {
    setCapturedFrames([]);
    setIsCapturing(true);
    setStep('live');

    const tempCaptured: string[] = [];

    for (let count = 0; count < photosToTake; count++) {
      // Countdown
      for (let seconds = countdownSeconds; seconds > 0; seconds--) {
        setCurrentCountdown(seconds);
        playBeep(880, 0.1); // Short high beep
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Capture snapshot
      setCurrentCountdown(0);
      playBeep(1470, 0.35); // Loud shutter beep
      setFlash(true);
      setTimeout(() => setFlash(false), 200);

      // Extract image frame from video stream or generate a beautiful customized simulator mockup
      let snapshotData = "";
      if (!useSimulator && videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
        try {
          const canvas = offscreenCanvasRef.current || document.createElement("canvas");
          canvas.width = videoRef.current.videoWidth || 1280;
          canvas.height = videoRef.current.videoHeight || 720;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            // Draw normally to capture the original photographic perspective (un-mirrored)
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            snapshotData = canvas.toDataURL("image/png");
          }
        } catch (err) {
          console.error("Failed capturing hardware frame, backing up to high-quality rendering", err);
        }
      }

      // If hardware capture failed or using simulator, render a highly stylized retro simulator portrait
      if (!snapshotData) {
        snapshotData = renderSimulatorPortrait(count);
      }

      tempCaptured.push(snapshotData);
      setCapturedFrames([...tempCaptured]);

      // Pause briefly for user feedback before next photo countdown
      if (count < photosToTake - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    setIsCapturing(false);
    stopCamera();
    setCurrentFrameIndex(0);
    const initialFilters: Record<number, string> = {};
    tempCaptured.forEach((_, idx) => {
      initialFilters[idx] = "normal";
    });
    setFrameFilters(initialFilters);
    setStep('edit');
  };

  // Generate mock images for camera simulator with elegant dynamic graphics
  const renderSimulatorPortrait = (index: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Background gradient
      const gradient = ctx.createRadialGradient(640, 360, 50, 640, 360, 600);
      const colors = [
        ["#0f172a", "#1e1b4b"], // Deep Indigo
        ["#0f172a", "#311042"], // Deep Violet
        ["#1c1917", "#441515"], // Crimson shadow
        ["#022c22", "#06130e"]  // Emerald slate
      ];
      const activeColorSet = colors[index % colors.length];
      gradient.addColorStop(0, activeColorSet[1]);
      gradient.addColorStop(1, activeColorSet[0]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Aesthetic backdrop pattern
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      // Simulated human silhouettes / portrait frame
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.arc(640, 420, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(640, 650, 260, 180, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sparkles and event branding overlay inside simulator
      ctx.fillStyle = "#3b82f6";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("✦ DSLR SIMULATOR PORTRAIT", 60, 80);

      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "14px monospace";
      ctx.fillText(`SNAP #${index + 1} OF ${photosToTake}`, 60, 110);
      ctx.fillText(`Event ID: ${activeEvent.id}`, 60, 130);
      ctx.fillText(`UTC: ${new Date().toISOString()}`, 60, 150);

      // Draw aesthetic geometric neon loops
      ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

      // Dynamic smiling emoji icon representing user in center
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "120px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("📸", 640, 360);
      ctx.textAlign = "left";
    }
    return canvas.toDataURL("image/png");
  };

  // Filter application helper
  const applyFilterToCanvas = (ctx: CanvasRenderingContext2D, filterId: string, width: number, height: number) => {
    // Canvas context filters (works on modern browsers, fallback gracefully)
    switch (filterId) {
      case "vintage":
        ctx.filter = "sepia(0.6) contrast(1.1) brightness(0.95)";
        break;
      case "retro":
        ctx.filter = "contrast(1.2) saturate(1.4) hue-rotate(15deg)";
        break;
      case "warm":
        ctx.filter = "sepia(0.2) saturate(1.3) brightness(0.95)";
        break;
      case "cool":
        ctx.filter = "saturate(0.8) hue-rotate(15deg) brightness(1.05)";
        break;
      case "cinema":
        ctx.filter = "contrast(1.3) brightness(0.9) saturate(0.6)";
        break;
      case "bw":
        ctx.filter = "grayscale(1) contrast(1.4)";
        break;
      case "sepia":
        ctx.filter = "sepia(0.9) contrast(1.0)";
        break;
      default:
        ctx.filter = "none";
    }
  };



  // COMPILATION ENGINE
  const handleCompileLayout = async () => {
    setStep('captured');
    setUploading(true);

    // Create target canvas representing physical photo paper layout ratios
    const canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");

    if (!ctx) {
      setUploading(false);
      return;
    }

    // Layout configuration sizing
    const layout = activeEvent.layoutType; // 'strip' (2x6), 'grid' (4x6), 'single' (4x6 single)
    
    if (layout === "strip") {
      // Classic Photo Strip (2x6 inches) -> 600 x 1800 px
      canvas.width = 600;
      canvas.height = 1800;
      
      // Paint glossy white or black card backing
      ctx.fillStyle = selectedFrameId === "retro-fun" ? "#1e1b4b" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const numPhotos = capturedFrames.length;
      if (numPhotos <= 4) {
        const photoHeight = 346;
        const photoWidth = 520;
        const xMargin = 40;
        const ySpacing = 35;
        const startY = 50;

        for (let i = 0; i < numPhotos; i++) {
          const yPos = startY + i * (photoHeight + ySpacing);
          await drawPhotoOnCanvas(ctx, capturedFrames[i], i, xMargin, yPos, photoWidth, photoHeight);
        }
        drawBrandingFooter(ctx, canvas.width, canvas.height, 1580);
      } else if (numPhotos <= 6) {
        const photoHeight = 230;
        const photoWidth = 520;
        const xMargin = 40;
        const ySpacing = 20;
        const startY = 40;

        for (let i = 0; i < numPhotos; i++) {
          const yPos = startY + i * (photoHeight + ySpacing);
          await drawPhotoOnCanvas(ctx, capturedFrames[i], i, xMargin, yPos, photoWidth, photoHeight);
        }
        drawBrandingFooter(ctx, canvas.width, canvas.height, 1550);
      } else {
        const photoHeight = 170;
        const photoWidth = 520;
        const xMargin = 40;
        const ySpacing = 15;
        const startY = 40;

        for (let i = 0; i < numPhotos; i++) {
          const yPos = startY + i * (photoHeight + ySpacing);
          await drawPhotoOnCanvas(ctx, capturedFrames[i], i, xMargin, yPos, photoWidth, photoHeight);
        }
        drawBrandingFooter(ctx, canvas.width, canvas.height, 1530);
      }

    } else if (layout === "grid") {
      // Grid Card (4x6 inches) -> 1200 x 1800 px portrait
      canvas.width = 1200;
      canvas.height = 1800;
      ctx.fillStyle = selectedFrameId === "retro-fun" ? "#1e1b4b" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const numPhotos = capturedFrames.length;
      
      if (numPhotos <= 4) {
        // 2 Columns x 2 Rows
        const photoWidth = 520;
        const photoHeight = 480;
        const cols = [60, 620];
        const rows = [100, 720];

        let photoIdx = 0;
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            if (photoIdx < numPhotos) {
              await drawPhotoOnCanvas(ctx, capturedFrames[photoIdx], photoIdx, cols[c], rows[r], photoWidth, photoHeight);
              photoIdx++;
            }
          }
        }
        drawBrandingFooter(ctx, canvas.width, canvas.height, 1420);
      } else if (numPhotos <= 6) {
        // 2 Columns x 3 Rows
        const photoWidth = 520;
        const photoHeight = 390;
        const cols = [60, 620];
        const rows = [100, 540, 980];

        let photoIdx = 0;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 2; c++) {
            if (photoIdx < numPhotos) {
              await drawPhotoOnCanvas(ctx, capturedFrames[photoIdx], photoIdx, cols[c], rows[r], photoWidth, photoHeight);
              photoIdx++;
            }
          }
        }
        drawBrandingFooter(ctx, canvas.width, canvas.height, 1480);
      } else {
        // 2 Columns x 4 Rows (for 7 or 8 photos)
        const photoWidth = 520;
        const photoHeight = 330;
        const cols = [60, 620];
        const rows = [80, 450, 820, 1190];

        let photoIdx = 0;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 2; c++) {
            if (photoIdx < numPhotos) {
              await drawPhotoOnCanvas(ctx, capturedFrames[photoIdx], photoIdx, cols[c], rows[r], photoWidth, photoHeight);
              photoIdx++;
            }
          }
        }
        drawBrandingFooter(ctx, canvas.width, canvas.height, 1580);
      }

    } else {
      // Single Large Portrait/Landscape layout -> 1200 x 900 px
      canvas.width = 1200;
      canvas.height = 900;
      ctx.fillStyle = "#0f172a"; // Minimal dark backdrop
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Single centered photo
      const photoWidth = 1040;
      const photoHeight = 650;
      const xMargin = 80;
      const yMargin = 60;

      if (capturedFrames.length > 0) {
        await drawPhotoOnCanvas(ctx, capturedFrames[0], 0, xMargin, yMargin, photoWidth, photoHeight);
      }

      drawBrandingFooter(ctx, canvas.width, canvas.height, 750);
    }

    // Apply transparent PNG overlay frame borders around the borders
    drawFrameOverlayDecoration(ctx, canvas.width, canvas.height);

    // Render local canvas to base64 image
    const finalImageBase64 = canvas.toDataURL("image/png");

    // Upload finalized layout photo to Server API
    try {
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
            kioskMode: true,
            browserInfo: navigator.userAgent,
            rawPhotos: capturedFrames
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setCompiledPhotoRecord(data.data);
        onRefreshGallery();
        setStep('compiled');
      } else {
        alert("Gagal mengupload layout foto.");
      }
    } catch (err) {
      alert("Kesalahan koneksi saat mengirim data.");
    } finally {
      setUploading(false);
    }
  };

  // Draw photo, filters, and placed stickers onto compilation canvas
  const drawPhotoOnCanvas = (
    ctx: CanvasRenderingContext2D,
    base64Data: string,
    frameIndex: number,
    x: number,
    y: number,
    w: number,
    h: number
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (!base64Data) {
        resolve();
        return;
      }
      const img = new Image();
      img.onload = () => {
        ctx.save();
        
        // Draw photo frame clipping region with soft rounded corners
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 12);
        ctx.clip();

        // Set canvas-level context filter before drawing
        const filterId = frameFilters[frameIndex] || "normal";
        applyFilterToCanvas(ctx, filterId, w, h);

        // Draw image stretched cleanly to target box
        ctx.drawImage(img, x, y, w, h);

        // Reset filter
        ctx.filter = "none";

        ctx.restore();
        resolve();
      };
      img.onerror = () => {
        console.error("Failed to draw image on canvas, continuing gracefully");
        resolve();
      };
      img.src = base64Data;
    });
  };

  // Draw text branding, sponsorships, logos, event dates in the blank layout margin
  const drawBrandingFooter = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, startY: number) => {
    ctx.save();

    // Divider line
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, startY);
    ctx.lineTo(canvasWidth - 40, startY);
    ctx.stroke();

    // Event Title
    ctx.fillStyle = "#000000";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(activeEvent.name.toUpperCase(), 50, startY + 45);

    // Event Subheading logo/sponsor label
    ctx.fillStyle = "#666666";
    ctx.font = "14px monospace";
    ctx.fillText(activeEvent.logo || "snapazzhot. premium photo service", 50, startY + 75);

    // Watermark watermark logo
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.font = "italic 11px sans-serif";
    ctx.fillText("crafted with snapazzhot. kiosk system", 50, startY + 105);

    // Render decorative QR Code outline block placeholder or text
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(canvasWidth - 140, startY + 20, 90, 90);
    ctx.fillStyle = "#3b82f6";
    ctx.font = "bold 10px monospace";
    ctx.fillText("SCAN TO", canvasWidth - 132, startY + 55);
    ctx.fillText("DOWNLOAD", canvasWidth - 135, startY + 75);

    ctx.restore();
  };

  // Draw colorful beautiful overlay borders simulating high-quality PNG layout frames
  const drawFrameOverlayDecoration = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => {
    ctx.save();
    
    // Customize border decorations based on chosen frame ID
    if (selectedFrameId === "wedding-classic") {
      // Golden elegant borders
      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 20;
      ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20);

      // Gold nested inner border
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 2;
      ctx.strokeRect(25, 25, canvasWidth - 50, canvasHeight - 50);

      // Draw beautiful gold rings circles in corner
      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(60, 60, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(75, 60, 20, 0, Math.PI * 2);
      ctx.stroke();
    } else if (selectedFrameId === "grad-gold") {
      // Academic black and gold
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 24;
      ctx.strokeRect(12, 12, canvasWidth - 24, canvasHeight - 24);

      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 4;
      ctx.strokeRect(28, 28, canvasWidth - 56, canvasHeight - 56);
    } else if (selectedFrameId === "birthday-neon") {
      // Hot Pink neon overlay
      ctx.strokeStyle = "#ec4899";
      ctx.lineWidth = 16;
      ctx.shadowColor = "#ec4899";
      ctx.shadowBlur = 15;
      ctx.strokeRect(8, 8, canvasWidth - 16, canvasHeight - 16);
    } else {
      // Minimal elegant thin border
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, canvasWidth - 12, canvasHeight - 12);
    }

    ctx.restore();
  };

  // Submit email delivery to server
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
          downloadUrl: new URL(compiledPhotoRecord.url, window.location.origin).toString()
        })
      });

      const data = await response.json();
      if (data.success) {
        setEmailSent(true);
        setEmail("");
      }
    } catch (_) {
      alert("Gagal menghubungi layanan SMTP.");
    } finally {
      setEmailSending(false);
    }
  };

  // Submit automatic silent print task to backend printer queue
  const handleTriggerPrint = async () => {
    if (!compiledPhotoRecord) return;
    setPrinting(true);
    setPrintSuccess(false);

    try {
      const response = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoId: compiledPhotoRecord.id,
          size: activeEvent.layoutType === "strip" ? "2x6" : "4x6",
          copies: printCopies
        })
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

  return (
    <div className="fixed inset-0 z-40 bg-[#050505] text-white flex flex-col font-sans overflow-hidden">
      {/* Top action header bar */}
      <header className="h-16 px-6 bg-[#0c0c0c] border-b border-white/10 flex justify-between items-center shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="text-lg font-bold italic tracking-tighter">
            snapazzhot<span className="text-blue-500">.</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Active Session</span>
            <span className="text-xs font-bold text-white tracking-tight">{activeEvent.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {step !== "compiled" && (
            <button
              onClick={onClose}
              disabled={isCapturing}
              className="px-4 py-2 text-xs font-semibold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition"
            >
              Cancel
            </button>
          )}
        </div>
      </header>

      {/* Main interactive screen stages */}
      <main className="flex-1 flex flex-col lg:flex-row items-stretch p-4 md:p-6 gap-4 md:gap-6 overflow-hidden min-h-0">
        
        {/* Left Side: Setup config or Active Capture Stream */}
        <div className="flex-1 bg-[#0c0c0c] rounded-3xl border border-white/10 p-4 md:p-6 flex flex-col justify-center items-center relative min-h-0 overflow-hidden h-full">
          
          {/* CAMERA FLASH ANIMATION OVERLAY */}
          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 bg-white z-50 pointer-events-none rounded-3xl"
              />
            )}
          </AnimatePresence>

          {step === 'setup' && (
            <div className="max-w-md w-full space-y-6 text-center">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Sliders className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">Konfigurasi Sesi Foto</h3>
                <p className="text-xs text-white/40 mt-1">Sesuaikan durasi countdown dan template frames sebelum mengaktifkan kamera.</p>
              </div>

              <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/10 text-left">
                {/* Total photos selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider block">Jumlah Capture</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 4, 6, 8].map((num) => (
                      <button
                        key={num}
                        onClick={() => setPhotosToTake(num)}
                        className={`py-2 text-xs font-bold rounded-xl border transition ${
                          photosToTake === num
                            ? "bg-blue-600 border-blue-500 text-white"
                            : "bg-white/[0.02] border-white/10 hover:border-white/20 text-white/70"
                        }`}
                      >
                        {num} Foto
                      </button>
                    ))}
                  </div>
                </div>

                {/* Countdown duration */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider block">Countdown Timer</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 5, 10].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setCountdownSeconds(sec)}
                        className={`py-2 text-xs font-bold rounded-xl border transition ${
                          countdownSeconds === sec
                            ? "bg-blue-600 border-blue-500 text-white"
                            : "bg-white/[0.02] border-white/10 hover:border-white/20 text-white/70"
                        }`}
                      >
                        {sec} Detik
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme layout template choices */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider block">Template Frame Layout</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedFrameId("wedding-classic")}
                      className={`p-2.5 rounded-xl border text-left text-xs transition ${
                        selectedFrameId === "wedding-classic"
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : "border-white/10 hover:border-white/20 text-white/50"
                      }`}
                    >
                      💍 Classic Wedding
                    </button>
                    <button
                      onClick={() => setSelectedFrameId("grad-gold")}
                      className={`p-2.5 rounded-xl border text-left text-xs transition ${
                        selectedFrameId === "grad-gold"
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : "border-white/10 hover:border-white/20 text-white/50"
                      }`}
                    >
                      🎓 Grad Gold
                    </button>
                    <button
                      onClick={() => setSelectedFrameId("birthday-neon")}
                      className={`p-2.5 rounded-xl border text-left text-xs transition ${
                        selectedFrameId === "birthday-neon"
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : "border-white/10 hover:border-white/20 text-white/50"
                      }`}
                    >
                      🎈 Birthday Neon
                    </button>
                    <button
                      onClick={() => setSelectedFrameId("retro-fun")}
                      className={`p-2.5 rounded-xl border text-left text-xs transition ${
                        selectedFrameId === "retro-fun"
                          ? "border-blue-500 bg-blue-500/10 text-white"
                          : "border-white/10 hover:border-white/20 text-white/50"
                      }`}
                    >
                      🍿 Pop-Art Retro
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('live')}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase tracking-widest text-white rounded-2xl shadow-xl shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-95 transition cursor-pointer"
              >
                Aktifkan Kamera Live
              </button>
            </div>
          )}

          {step === 'live' && (
            <div className="relative w-full h-full flex flex-col justify-between items-center">
              
              {/* Live stream view frame */}
              <div className="w-full max-w-2xl aspect-[16/9] bg-[#050505] rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl flex items-center justify-center">
                
                {useSimulator ? (
                  /* HIGH FIDELITY CAMERA SIMULATOR DISPLAY */
                  <div className="absolute inset-0 flex flex-col justify-between p-6 bg-gradient-to-tr from-black via-[#08080c] to-[#0c0c16]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">DSLR-STUDIO-SIMULATOR_OK</span>
                      </div>
                      <span className="text-[10px] font-mono bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-zinc-400">
                        Lens: 18-135mm @ f/4.5
                      </span>
                    </div>

                    <div className="text-center space-y-2">
                      <Camera className="w-14 h-14 text-zinc-700 mx-auto animate-pulse" />
                      <p className="text-xs text-zinc-400 font-medium">Auto-Focusing Studio Camera Sensor...</p>
                      {isCapturing && (
                        <p className="text-[10px] text-blue-400 font-mono">Beeper Active • Shutter ready</p>
                      )}
                    </div>

                    <div className="flex justify-between text-zinc-500 font-mono text-[10px]">
                      <span>Shutter: 1/125s</span>
                      <span>ISO: 800</span>
                    </div>
                  </div>
                ) : (
                  /* HARDWARE WEBCAM VIDEO STREAM */
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                )}

                {/* Big Countdown graphic overlays */}
                <AnimatePresence>
                  {currentCountdown > 0 && (
                    <motion.div
                      key={currentCountdown}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1.2 }}
                      exit={{ opacity: 0, scale: 1.8 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] z-20 pointer-events-none"
                    >
                      <span className="text-8xl md:text-9xl font-extrabold text-blue-500 drop-shadow-[0_4px_12px_rgba(59,130,246,0.6)]">
                        {currentCountdown}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Live View Controls bar */}
              <div className="w-full max-w-2xl mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-zinc-400 text-xs flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${useSimulator ? "bg-amber-500" : "bg-emerald-500"}`} />
                  {useSimulator ? "Menggunakan DSLR Simulator" : "Webcam Hardware Aktif"}
                </div>

                <div className="flex items-center gap-2">
                  {!isCapturing ? (
                    <>
                      <button
                        onClick={() => {
                          stopCamera();
                          setStep('setup');
                        }}
                        className="px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 rounded-xl transition"
                      >
                        Kembali Ke Setelan
                      </button>
                      <button
                        onClick={handleStartCaptureSequence}
                        className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/10 transition cursor-pointer"
                      >
                        Mulai Ambil Foto ({photosToTake} snaps)
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-2 text-xs font-semibold bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl animate-pulse">
                      Sedang memproses pemotretan beruntun... Jangan berpindah tempat!
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {step === 'captured' && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Menyatukan Layout Frame...</p>
                <p className="text-xs text-zinc-500 mt-1">Menggabungkan filter warna dan mengunggah ke cloud.</p>
              </div>
            </div>
          )}

          {step === 'edit' && (
            <div className="w-full h-full flex flex-col justify-between items-center">
              
              {/* Photo Display under active editing */}
              <div className="relative w-full max-w-md aspect-[4/3] bg-black/40 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
                <div className="relative w-full h-full select-none">
                  <img
                    src={capturedFrames[currentFrameIndex]}
                    alt="Active editing"
                    className={`w-full h-full object-cover ${
                      AVAILABLE_FILTERS.find(f => f.id === (frameFilters[currentFrameIndex] || "normal"))?.class || ""
                    }`}
                  />
                </div>
              </div>

              {/* Sub-pagination navigation between taken shots */}
              <div className="flex items-center gap-4 mt-4 bg-black/60 px-4 py-2 border border-white/10 rounded-2xl">
                <button
                  disabled={currentFrameIndex === 0}
                  onClick={() => setCurrentFrameIndex(prev => prev - 1)}
                  className="p-1 text-white/50 hover:text-white disabled:opacity-30 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-mono font-bold text-white/85">
                  FOTO {currentFrameIndex + 1} DARI {capturedFrames.length}
                </span>
                <button
                  disabled={currentFrameIndex === capturedFrames.length - 1}
                  onClick={() => setCurrentFrameIndex(prev => prev + 1)}
                  className="p-1 text-white/50 hover:text-white disabled:opacity-30 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

            </div>
          )}

          {step === 'compiled' && compiledPhotoRecord && (
            <div className="w-full h-full flex flex-col justify-center items-center">
              <div className="max-w-xs w-full aspect-[2/3] bg-black/40 rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
                <img
                  src={compiledPhotoRecord.url}
                  alt="Compiled Print Template Layout"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xs text-white/40 font-mono mt-3">File ID: {compiledPhotoRecord.id}</span>
            </div>
          )}

        </div>

        {/* Right Side: Filters, Sticker choice, Download/Send Email Controls */}
        <div className="w-full lg:w-96 bg-[#0c0c0c] rounded-3xl border border-white/10 p-4 md:p-6 flex flex-col justify-between backdrop-blur-md overflow-y-auto max-h-full scrollbar-thin shrink-0 min-h-0 h-full">
          
          {step === 'setup' && (
            <div className="space-y-6 flex-1">
              <div>
                <h4 className="text-sm font-bold text-white">Event Detail</h4>
                <p className="text-xs text-white/40 mt-1">Konfigurasi tema yang ditetapkan operator admin.</p>
              </div>

              <div className="space-y-3 bg-black/40 p-4 border border-white/10 rounded-2xl">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Event Name:</span>
                  <span className="text-white/80 font-bold truncate max-w-[180px]">{activeEvent.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Logo text:</span>
                  <span className="text-white/85 font-mono">{activeEvent.logo || "-"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Default countdown:</span>
                  <span className="text-white/85 font-bold">{activeEvent.countdown}s</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Printer Template:</span>
                  <span className="text-white/85 font-bold text-blue-400 capitalize">{activeEvent.layoutType}</span>
                </div>
              </div>

              <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-xs text-white/45 leading-relaxed space-y-1">
                <div className="font-bold text-blue-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Kiosk Mode Active
                </div>
                <p>Klik tombol di bawah preview kamera untuk memulai. Hubungkan printer di panel admin untuk pencetakan fisik instan.</p>
              </div>
            </div>
          )}

          {step === 'live' && (
            <div className="space-y-6 flex-1">
              <div>
                <h4 className="text-sm font-bold text-white">Status Perangkat Keras</h4>
                <p className="text-xs text-white/40 mt-1">Layanan kamera pendukung snapazzhot.</p>
              </div>

              <div className="space-y-3 bg-black/40 p-4 border border-white/10 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 block">PILIH SENSOR KAMERA</label>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => setSelectedCameraId(e.target.value)}
                    className="w-full bg-[#050505] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500"
                  >
                    <option value="webcam-1">📸 Integrated FaceTime HD Cam</option>
                    <option value="dslr-mock">🎒 DSLR Camera Simulator (Canon EOS)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3">
                <h5 className="text-xs font-bold text-white/70">PETUNJUK GAYA</h5>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Posisikan wajah Anda tepat di tengah frame. Kamera simulator DSLR akan mengambil gambar dengan ketajaman bokeh maksimal.
                </p>
              </div>
            </div>
          )}

          {step === 'edit' && (
            <div className="space-y-6 flex-1 overflow-y-auto pr-1">
              {/* Photo Filter selector */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-white/45 uppercase tracking-wider">
                  Filter Warna (Foto #{currentFrameIndex + 1})
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() =>
                        setFrameFilters({
                          ...frameFilters,
                          [currentFrameIndex]: f.id
                        })
                      }
                      className={`p-2 rounded-xl text-left text-xs border transition cursor-pointer ${
                        (frameFilters[currentFrameIndex] || "normal") === f.id
                          ? "border-blue-500 bg-blue-500/10 text-white font-bold"
                          : "border-white/10 hover:border-white/20 text-white/50"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirm compiler trigger */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <button
                  onClick={handleCompileLayout}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase tracking-widest text-white rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Selesai & Cetak Layout
                </button>
                <button
                  onClick={() => {
                    if (confirm("Ulangi pengambilan gambar? Seluruh foto saat ini akan terhapus.")) {
                      setStep('live');
                    }
                  }}
                  className="w-full py-2 bg-black text-white/40 hover:text-white border border-white/10 rounded-xl text-xs transition cursor-pointer"
                >
                  Ulangi Ambil Foto
                </button>
              </div>
            </div>
          )}

          {step === 'compiled' && compiledPhotoRecord && (
            <div className="space-y-6 flex-1 overflow-y-auto pr-1">
              {/* Dynamic QR Download block */}
              <div className="bg-black/40 p-4 border border-white/10 rounded-2xl text-center space-y-3">
                <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest block">Scan QR untuk Unduhan</span>
                
                <div className="w-36 h-36 bg-white p-2 rounded-xl mx-auto flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                      new URL(compiledPhotoRecord.url, window.location.origin).toString()
                    )}`}
                    alt="Scan QR code download"
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-white/80 font-bold">Unduhan Langsung Aktif</p>
                  <p className="text-[10px] text-white/40">Scan melalui camera handphone untuk menyimpan file kualitas HD.</p>
                </div>

                <div className="pt-2">
                  <a
                    href={compiledPhotoRecord.url}
                    download={`snapazzhot-${compiledPhotoRecord.id}.png`}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh ke Browser lokal
                  </a>
                </div>
              </div>

              {/* Send Email Block */}
              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest block flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  Kirim Ke Email
                </span>

                {emailSent ? (
                  <div className="p-2.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4" /> Email terkirim ke antrean!
                  </div>
                ) : (
                  <form onSubmit={handleSendEmail} className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="alamat@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={emailSending}
                      className="px-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer"
                    >
                      Kirim
                    </button>
                  </form>
                )}
              </div>

              {/* Direct print simulated action */}
              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest block flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  Auto-Print Simulator (Kiosk)
                </span>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/45">Jumlah Cetak (copies):</span>
                  <div className="flex items-center gap-2 bg-black border border-white/10 rounded-lg px-2 py-1">
                    <button
                      type="button"
                      onClick={() => setPrintCopies(prev => Math.max(1, prev - 1))}
                      className="text-white/40 hover:text-white px-1 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-bold text-white min-w-4 text-center">{printCopies}</span>
                    <button
                      type="button"
                      onClick={() => setPrintCopies(prev => prev + 1)}
                      className="text-white/40 hover:text-white px-1 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleTriggerPrint}
                  disabled={printing}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  {printing ? "Sedang Mencetak..." : "Cetak Sekarang"}
                </button>

                {printSuccess && (
                  <p className="text-[10px] text-center text-emerald-400 animate-bounce">
                    ✓ Print job dikirim! Cek Printer Log di Admin Dashboard.
                  </p>
                )}
              </div>

              {/* Exit button */}
              <button
                onClick={onClose}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white border border-white/10 rounded-xl transition cursor-pointer"
              >
                Selesai & Keluar Sesi
              </button>
            </div>
          )}

          {/* Copyright/footer note */}
          <div className="pt-4 border-t border-white/5 text-center text-[9px] uppercase tracking-wider text-white/20">
            snapazzhot kiosk system
          </div>

        </div>

      </main>

      {/* Bottom Status Bar - Immersive UI HUD compliant */}
      <footer className="h-10 bg-[#0c0c0c] border-t border-white/10 flex items-center justify-between px-6 text-[9px] uppercase tracking-widest text-white/30 shrink-0">
        <div className="flex gap-6">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
            <span>DSLR: SONY ALPHA 7R IV</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
            <span>PRINTER: DNP DS620</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span>LOCAL PRINT QUEUE: ONLINE</span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <span>EVENT KIOSK SESSION ACTIVE</span>
          <span className="text-white/60">Ver 4.0.0-Stable</span>
        </div>
      </footer>
    </div>
  );
}
