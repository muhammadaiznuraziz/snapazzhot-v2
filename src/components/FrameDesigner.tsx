import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Move, Maximize2, RotateCw, Trash2, Copy, Lock, Unlock, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Undo, Redo, HelpCircle, Save, X, Plus, Image as ImageIcon, Type, Calendar, Clock, Hash, QrCode, FileText } from "lucide-react";
import { FrameTemplate, FrameElement } from "../types";
import { useApp } from "../contexts/AppContext";

interface FrameDesignerProps {
  onClose: () => void;
  initialTemplate?: FrameTemplate | null;
}

export default function FrameDesigner({ onClose, initialTemplate }: FrameDesignerProps) {
  const { saveTemplate, showToast } = useApp() as any;

  // Template Canvas Properties
  const [templateName, setTemplateName] = useState("Template Custom Baru");
  const [category, setCategory] = useState("General");
  const [printSize, setPrintSize] = useState("4R");
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(800);
  const [photoCount, setPhotoCount] = useState(4);
  const [backgroundImage, setBackgroundImage] = useState("");
  const [framePng, setFramePng] = useState("");
  const [frameOpacity, setFrameOpacity] = useState(100);
  const [status, setStatus] = useState<'active' | 'draft'>("active");

  // Elements list
  const [elements, setElements] = useState<FrameElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Editor Settings
  const [zoom, setZoom] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(5); // %
  
  // Undo/Redo stacks
  const [history, setHistory] = useState<FrameElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Dragging and Resizing state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elemX: 0, elemY: 0, elemW: 0, elemH: 0 });
  const [resizeDir, setResizeDir] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize from initialTemplate if editing
  useEffect(() => {
    if (initialTemplate) {
      setTemplateName(initialTemplate.name);
      setCategory(initialTemplate.category);
      setPrintSize(initialTemplate.printSize);
      setCanvasWidth(initialTemplate.canvasWidth);
      setCanvasHeight(initialTemplate.canvasHeight);
      setPhotoCount(initialTemplate.photoCount);
      setBackgroundImage(initialTemplate.backgroundImage || "");
      setFramePng(initialTemplate.framePng || "");
      setStatus(initialTemplate.status);
      setElements(initialTemplate.elements || []);
      
      // Initialize history
      setHistory([initialTemplate.elements || []]);
      setHistoryIndex(0);
      
      if (initialTemplate.elements && initialTemplate.elements.length > 0) {
        setSelectedId(initialTemplate.elements[0].id);
      }
    } else {
      // Default initial templates layout (4R Grid with 4 photos default)
      const defaultElements: FrameElement[] = [
        { id: "photo-1", type: "photo", name: "PHOTO_1", x: 10, y: 10, width: 38, height: 35, rotation: 0, borderRadius: 8, opacity: 100, zIndex: 1 },
        { id: "photo-2", type: "photo", name: "PHOTO_2", x: 52, y: 10, width: 38, height: 35, rotation: 0, borderRadius: 8, opacity: 100, zIndex: 2 },
        { id: "photo-3", type: "photo", name: "PHOTO_3", x: 10, y: 50, width: 38, height: 35, rotation: 0, borderRadius: 8, opacity: 100, zIndex: 3 },
        { id: "photo-4", type: "photo", name: "PHOTO_4", x: 52, y: 50, width: 38, height: 35, rotation: 0, borderRadius: 8, opacity: 100, zIndex: 4 },
        { id: "qr-code", type: "qr", name: "QR Code", x: 45, y: 86, width: 10, height: 12, rotation: 0, borderRadius: 0, opacity: 100, zIndex: 5 },
        { id: "txt-title", type: "text", name: "Event Name", x: 10, y: 88, width: 32, height: 8, rotation: 0, borderRadius: 0, opacity: 100, zIndex: 6, textValue: "Nama Event Anda", fontSize: 20, fontColor: "#ffffff" },
        { id: "txt-date", type: "meta", name: "Tanggal", x: 65, y: 88, width: 25, height: 8, rotation: 0, borderRadius: 0, opacity: 100, zIndex: 7, textValue: "DD-MM-YYYY", fontSize: 16, fontColor: "#9ca3af" }
      ];
      setElements(defaultElements);
      setHistory([defaultElements]);
      setHistoryIndex(0);
      setSelectedId("photo-1");
    }
  }, [initialTemplate]);

  // Push state to Undo/Redo history
  const pushToHistory = (newElements: FrameElement[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(JSON.parse(JSON.stringify(newElements)));
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  // Helper: update single element attributes
  const updateElement = (id: string, updates: Partial<FrameElement>, pushHist = true) => {
    const updated = elements.map(el => {
      if (el.id === id) {
        return { ...el, ...updates };
      }
      return el;
    });
    setElements(updated);
    if (pushHist) {
      pushToHistory(updated);
    }
  };

  // Drag and Drop & Resize mechanics on parent Canvas
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!selectedId || (!isDragging && !isResizing)) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentElem = elements.find(el => el.id === selectedId);
    if (!currentElem || currentElem.locked) return;

    // Deltas in pixels
    const dxPx = e.clientX - dragStart.x;
    const dyPx = e.clientY - dragStart.y;

    // Convert to percentage
    const dxPct = (dxPx / rect.width) * 100;
    const dyPct = (dyPx / rect.height) * 100;

    if (isDragging) {
      let newX = dragStart.elemX + dxPct;
      let newY = dragStart.elemY + dyPct;

      if (snapToGrid) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      // Constrain inside canvas boundaries
      newX = Math.max(0, Math.min(100 - currentElem.width, newX));
      newY = Math.max(0, Math.min(100 - currentElem.height, newY));

      updateElement(selectedId, { x: newX, y: newY }, false);
    } else if (isResizing && resizeDir) {
      let newW = currentElem.width;
      let newH = currentElem.height;
      let newX = currentElem.x;
      let newY = currentElem.y;

      if (resizeDir.includes("e")) {
        newW = dragStart.elemW + dxPct;
        if (snapToGrid) newW = Math.round(newW / gridSize) * gridSize;
        newW = Math.max(2, Math.min(100 - currentElem.x, newW));
      }
      if (resizeDir.includes("s")) {
        newH = dragStart.elemH + dyPct;
        if (snapToGrid) newH = Math.round(newH / gridSize) * gridSize;
        newH = Math.max(2, Math.min(100 - currentElem.y, newH));
      }
      if (resizeDir.includes("w")) {
        const potentialW = dragStart.elemW - dxPct;
        const potentialX = dragStart.elemX + dxPct;
        if (potentialX >= 0 && potentialW >= 2) {
          newX = potentialX;
          newW = potentialW;
        }
      }
      if (resizeDir.includes("n")) {
        const potentialH = dragStart.elemH - dyPct;
        const potentialY = dragStart.elemY + dyPct;
        if (potentialY >= 0 && potentialH >= 2) {
          newY = potentialY;
          newH = potentialH;
        }
      }

      updateElement(selectedId, { x: newX, y: newY, width: newW, height: newH }, false);
    }
  };

  const handleMouseUp = () => {
    if (isDragging || isResizing) {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDir(null);
      pushToHistory(elements);
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, elem: FrameElement) => {
    if (elem.locked) return;
    e.stopPropagation();
    setSelectedId(elem.id);
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elemX: elem.x,
      elemY: elem.y,
      elemW: elem.width,
      elemH: elem.height
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, dir: string, elem: FrameElement) => {
    if (elem.locked) return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeDir(dir);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elemX: elem.x,
      elemY: elem.y,
      elemW: elem.width,
      elemH: elem.height
    });
  };

  // Add elements
  const addElement = (type: FrameElement['type'], customName?: string) => {
    const existingCount = elements.filter(el => el.type === type).length;
    let name = "";
    let defaultVal = "";

    switch (type) {
      case "photo":
        const photoNum = elements.filter(el => el.type === "photo").length + 1;
        name = `PHOTO_${photoNum}`;
        break;
      case "logo":
        name = "Logo Sponsor";
        break;
      case "qr":
        name = "QR Code";
        break;
      case "text":
        name = customName || `Text Bebas ${existingCount + 1}`;
        defaultVal = "Double klik untuk edit";
        break;
      case "meta":
        name = customName || "Tanggal/Jam";
        defaultVal = "04-07-2026";
        break;
      case "decor":
        name = "Watermark Decor";
        break;
    }

    const nextZ = elements.reduce((max, el) => Math.max(max, el.zIndex), 0) + 1;

    const newElement: FrameElement = {
      id: `${type}-${Date.now()}`,
      type,
      name,
      x: 35,
      y: 35,
      width: type === "photo" ? 30 : 20,
      height: type === "photo" ? 25 : 10,
      rotation: 0,
      borderRadius: type === "photo" ? 8 : 0,
      opacity: 100,
      zIndex: nextZ,
      textValue: defaultVal,
      fontSize: 14,
      fontColor: "#ffffff"
    };

    const updated = [...elements, newElement];
    setElements(updated);
    setSelectedId(newElement.id);
    pushToHistory(updated);
    showToast(`Ditambahkan elemen: ${name}`);
  };

  // Delete element
  const deleteElement = (id: string) => {
    const updated = elements.filter(el => el.id !== id);
    setElements(updated);
    setSelectedId(updated[0]?.id || null);
    pushToHistory(updated);
    showToast("Elemen berhasil dihapus.");
  };

  // Duplicate element
  const duplicateElement = (elem: FrameElement) => {
    const nextZ = elements.reduce((max, el) => Math.max(max, el.zIndex), 0) + 1;
    const duplicated: FrameElement = {
      ...JSON.parse(JSON.stringify(elem)),
      id: `${elem.type}-${Date.now()}`,
      x: Math.min(90, elem.x + 4),
      y: Math.min(90, elem.y + 4),
      zIndex: nextZ,
      locked: false
    };
    const updated = [...elements, duplicated];
    setElements(updated);
    setSelectedId(duplicated.id);
    pushToHistory(updated);
    showToast(`Duplikasi ${elem.name}`);
  };

  // Upload frame template images
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, isFramePng: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use URL.createObjectURL to update local canvas preview INSTANTLY
    const localUrl = URL.createObjectURL(file);
    if (isFramePng) {
      setFramePng(localUrl);
      
      // Auto-adjust canvas width & height to match the uploaded PNG's original dimensions & aspect ratio
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setCanvasWidth(img.naturalWidth);
          setCanvasHeight(img.naturalHeight);
          showToast(`Ukuran kanvas otomatis disesuaikan dengan bingkai: ${img.naturalWidth} x ${img.naturalHeight}px!`);
        }
      };
      img.src = localUrl;
    } else {
      setBackgroundImage(localUrl);
    }
    showToast("Gambar ditampilkan instan! Sedang menyimpan berkas ke server...");

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const res = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: base64String,
            scope: "template-assets",
            label: isFramePng ? "frame-overlay" : "background"
          })
        });
        const data = await res.json();
        if (data.success) {
          // Replace local blob URL with final secure server-side cloud URL
          if (isFramePng) {
            setFramePng(data.data.url);
          } else {
            setBackgroundImage(data.data.url);
          }
          showToast("Gambar berhasil diunggah & tersimpan di server!");
        } else {
          showToast(data.message || "Gagal mengunggah ke server, namun tetap bisa digunakan sementara.");
        }
      } catch (_) {
        showToast("Kesalahan koneksi saat mengunggah. Gambar lokal tetap aktif.");
      }
    };
    reader.readAsDataURL(file);
  };

  // Save the Frame Template
  const handleSave = async () => {
    if (!templateName.trim()) {
      showToast("Nama template tidak boleh kosong.");
      return;
    }

    // Photo count matches count of placeholders
    const actualPhotoCount = elements.filter(el => el.type === "photo").length;

    const payload: Partial<FrameTemplate> = {
      id: initialTemplate?.id,
      name: templateName,
      thumbnail: `🎨 ${category} Theme`,
      category,
      canvasWidth,
      canvasHeight,
      photoCount: actualPhotoCount,
      elements,
      backgroundImage,
      framePng,
      printSize,
      status
    };

    const res = await saveTemplate(payload);
    if (res) {
      showToast("Template Frame berhasil disimpan!");
      onClose();
    } else {
      showToast("Gagal menyimpan template frame.");
    }
  };

  const selectedElem = elements.find(el => el.id === selectedId);

  // Determine Aspect Ratio class of Canvas Preview
  const getCanvasAspectClass = () => {
    const ratio = canvasWidth / canvasHeight;
    if (ratio > 1.2) return "aspect-[3/2] w-full max-w-[500px]";
    if (ratio < 0.8) return "aspect-[1/3] h-[550px] w-auto max-w-[240px]";
    return "aspect-[4/3] w-full max-w-[450px]";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col overflow-hidden text-zinc-100">
      {/* Header Bar */}
      <header className="h-16 border-b border-zinc-800 px-6 flex justify-between items-center bg-zinc-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/15 text-blue-400 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              Visual Frame Designer (Admin Only)
            </h1>
            <p className="text-[11px] text-zinc-400">Atur tata letak & frame satu kali untuk semua pengunjung</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg flex items-center gap-2 transition shadow-lg shadow-blue-900/20"
          >
            <Save className="w-4 h-4" />
            Simpan Template
          </button>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Control Panel */}
        <aside className="w-80 border-r border-zinc-800 bg-zinc-950 flex flex-col overflow-y-auto shrink-0 select-none">
          {/* Section: Template Meta */}
          <div className="p-4 border-b border-zinc-900 space-y-3.5">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Konfigurasi Canvas</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-semibold block">Nama Template</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-semibold block">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Wedding">Wedding</option>
                  <option value="Graduation">Graduation</option>
                  <option value="Birthday">Birthday</option>
                  <option value="Corporate">Corporate</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-semibold block">Ukuran Cetak</label>
                <select
                  value={printSize}
                  onChange={(e) => setPrintSize(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Strips">Strips (2x6 inch)</option>
                  <option value="4R">4R (4x6 inch)</option>
                  <option value="6R">6R (6x8 inch)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-semibold block">Lebar Canvas (px)</label>
                <input
                  type="number"
                  value={canvasWidth}
                  onChange={(e) => setCanvasWidth(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-semibold block">Tinggi Canvas (px)</label>
                <input
                  type="number"
                  value={canvasHeight}
                  onChange={(e) => setCanvasHeight(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-semibold block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="active">Active / Live</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-semibold block">Kamera Photo Count</label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-center font-bold text-blue-400">
                  {elements.filter(el => el.type === "photo").length} Slot Foto
                </div>
              </div>
            </div>
          </div>

          {/* Section: Upload Base Images */}
          <div className="p-4 border-b border-zinc-900 space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Aset Bingkai</h3>

            {/* PNG Overlay */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1 justify-between">
                <span>PNG Bingkai Transparan (Overlay)</span>
                {framePng && <span className="text-[9px] text-green-400 font-bold">Terunggah</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/png"
                  onChange={(e) => handleUploadImage(e, true)}
                  className="w-full bg-zinc-900 text-xs border border-zinc-850 p-1 rounded cursor-pointer file:mr-2 file:py-1 file:px-2 file:bg-blue-600/10 file:text-blue-400 file:border-0 file:rounded file:text-[10px] hover:file:bg-blue-600/20"
                />
                {framePng && (
                  <button
                    onClick={() => {
                      setFramePng("");
                      setFrameOpacity(100);
                    }}
                    className="p-1.5 bg-red-950/40 text-red-400 border border-red-900/40 rounded hover:bg-red-950 transition cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {framePng && (
                <div className="flex items-center gap-2 mt-1 bg-zinc-900/45 border border-zinc-850/40 p-1.5 rounded-lg">
                  <span className="text-[9px] text-zinc-400 font-medium whitespace-nowrap">Opasitas Frame:</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={frameOpacity}
                    onChange={(e) => setFrameOpacity(Number(e.target.value))}
                    className="flex-1 accent-blue-500 h-1 bg-zinc-800 rounded cursor-pointer"
                  />
                  <span className="text-[9px] font-mono font-bold text-zinc-300 w-7 text-right">{frameOpacity}%</span>
                </div>
              )}
            </div>

            {/* Background Image */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1 justify-between">
                <span>Gambar Latar Belakang (Underlay)</span>
                {backgroundImage && <span className="text-[9px] text-green-400 font-bold">Terunggah</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadImage(e, false)}
                  className="w-full bg-zinc-900 text-xs border border-zinc-850 p-1 rounded cursor-pointer file:mr-2 file:py-1 file:px-2 file:bg-blue-600/10 file:text-blue-400 file:border-0 file:rounded file:text-[10px] hover:file:bg-blue-600/20"
                />
                {backgroundImage && (
                  <button
                    onClick={() => setBackgroundImage("")}
                    className="p-1.5 bg-red-950/40 text-red-400 border border-red-900/40 rounded hover:bg-red-950 transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section: Add Elements Palette */}
          <div className="p-4 space-y-3 flex-1">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tambah Elemen Desain</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => addElement("photo")}
                className="p-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-300 text-[11px] font-semibold rounded-lg flex flex-col items-center gap-1 transition"
              >
                <ImageIcon className="w-4 h-4 text-blue-400" />
                Slot Foto
              </button>

              <button
                onClick={() => addElement("text", "Text Bebas")}
                className="p-2.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 text-purple-300 text-[11px] font-semibold rounded-lg flex flex-col items-center gap-1 transition"
              >
                <Type className="w-4 h-4 text-purple-400" />
                Text Bebas
              </button>

              <button
                onClick={() => addElement("qr")}
                className="p-2.5 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/20 text-orange-300 text-[11px] font-semibold rounded-lg flex flex-col items-center gap-1 transition"
              >
                <QrCode className="w-4 h-4 text-orange-400" />
                QR Code
              </button>

              <button
                onClick={() => addElement("logo")}
                className="p-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold rounded-lg flex flex-col items-center gap-1 transition"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                Logo Sponsor
              </button>

              <button
                onClick={() => addElement("meta", "Tanggal")}
                className="p-2.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-300 text-[11px] font-semibold rounded-lg flex flex-col items-center gap-1 transition"
              >
                <Calendar className="w-4 h-4 text-rose-400" />
                Tanggal Event
              </button>

              <button
                onClick={() => addElement("meta", "Jam")}
                className="p-2.5 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-300 text-[11px] font-semibold rounded-lg flex flex-col items-center gap-1 transition"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                Jam Sesi
              </button>
            </div>

            {/* List layers / items */}
            <div className="pt-4 space-y-2">
              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Layers Panel</h4>
              <div className="bg-zinc-900/50 border border-zinc-850 rounded-lg max-h-48 overflow-y-auto p-1.5 space-y-1">
                {elements.map((el) => (
                  <div
                    key={el.id}
                    onClick={() => setSelectedId(el.id)}
                    className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer transition ${
                      selectedId === el.id ? "bg-blue-600/20 border border-blue-500/40 text-white" : "hover:bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {el.type === "photo" && <ImageIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      {el.type === "text" && <Type className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                      {el.type === "qr" && <QrCode className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                      {el.type === "logo" && <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {el.type === "meta" && <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      <span className="truncate">{el.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }); }}
                        className={`p-0.5 rounded transition ${el.locked ? "text-yellow-500 hover:bg-yellow-950" : "text-zinc-600 hover:text-white"}`}
                      >
                        {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateElement(el.id, { hidden: !el.hidden }); }}
                        className={`p-0.5 rounded transition ${el.hidden ? "text-zinc-600 hover:bg-zinc-850" : "text-zinc-400 hover:text-white"}`}
                      >
                        {el.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Center Canvas Workspace */}
        <main className="flex-1 bg-zinc-900 flex flex-col overflow-hidden relative">
          {/* Top Bar Workspace Controls */}
          <div className="h-12 border-b border-zinc-800 bg-zinc-950 px-6 flex items-center justify-between select-none shrink-0">
            <div className="flex items-center gap-4">
              {/* Undo / Redo */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-sm">
                <button
                  disabled={historyIndex <= 0}
                  onClick={handleUndo}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent rounded transition cursor-pointer"
                  title="Undo"
                >
                  <Undo className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
                <button
                  disabled={historyIndex >= history.length - 1}
                  onClick={handleRedo}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent rounded transition cursor-pointer"
                  title="Redo"
                >
                  <Redo className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Grid Snapping */}
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`px-3 py-1.5 text-xs font-semibold border rounded-lg transition flex items-center gap-2 cursor-pointer ${
                  snapToGrid 
                    ? "bg-blue-600/10 border-blue-500/30 text-blue-400 shadow-sm shadow-blue-500/5" 
                    : "border-zinc-800 text-zinc-400 bg-zinc-900/60 hover:bg-zinc-800"
                }`}
              >
                <span>Snap To Grid</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${snapToGrid ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-950 text-zinc-500'}`}>{gridSize}%</span>
              </button>

              {snapToGrid && (
                <input
                  type="range"
                  min={2}
                  max={20}
                  step={1}
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  className="w-20 accent-blue-500 h-1 bg-zinc-800 rounded cursor-pointer"
                />
              )}
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}
                className="p-1.5 bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono font-bold w-12 text-center text-zinc-400 bg-zinc-900 border border-zinc-850 px-2 py-1 rounded-md">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(Math.min(1.8, zoom + 0.1))}
                className="p-1.5 bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(1.0)}
                className="text-[10px] font-bold text-zinc-400 hover:text-white hover:border-zinc-700 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-lg transition ml-1 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Interactive Workspace Area */}
          <div 
            className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[#0d0d11] select-none relative"
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseDown={() => setSelectedId(null)}
          >
            {/* Outer Wrapper for zoom */}
            <div 
              style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
              className="transition-transform duration-75 relative flex items-center justify-center p-4 bg-zinc-950/40 border border-zinc-800/40 rounded-2xl shadow-2xl shadow-black/90"
              onMouseDown={(e) => e.stopPropagation()} // Prevent clicking outer margin from deselecting if clicked inside this wrapper
            >
              {/* Actual Canvas */}
              <div
                ref={canvasRef}
                style={{
                  width: `${canvasWidth / 2.5}px`,
                  height: `${canvasHeight / 2.5}px`,
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundColor: "#121215"
                }}
                className="relative overflow-hidden select-none shadow-2xl border border-zinc-800/80 rounded-sm"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectedId(null); // Click empty canvas area to deselect
                }}
              >
                {/* Visual grid guide if enabled */}
                {snapToGrid && (
                  <div className="absolute inset-0 pointer-events-none opacity-[0.08]" style={{
                    backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                    backgroundSize: `${gridSize}% ${gridSize}%`
                  }} />
                )}

                {/* Base Layer Elements */}
                {elements
                  .filter(el => !el.hidden)
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map((elem) => {
                    const isSelected = selectedId === elem.id;
                    return (
                      <div
                        key={elem.id}
                        onMouseDown={(e) => handleElementMouseDown(e, elem)}
                        style={{
                          left: `${elem.x}%`,
                          top: `${elem.y}%`,
                          width: `${elem.width}%`,
                          height: `${elem.height}%`,
                          zIndex: elem.renderOnTop ? 50 + elem.zIndex : elem.zIndex,
                          borderRadius: `${elem.borderRadius}px`,
                          opacity: elem.opacity / 100,
                          transform: `rotate(${elem.rotation}deg)`,
                        }}
                        className={`absolute flex items-center justify-center transition-all ${
                          isSelected
                            ? "border-2 border-blue-500 bg-blue-500/10 cursor-move z-50 shadow-lg"
                            : "bg-[#18181c]/90 border border-white/10 hover:border-white/20 hover:bg-[#1f1f25]/95 cursor-pointer shadow"
                        }`}
                      >
                        {/* Rendering different types inside canvas editor */}
                        {elem.type === "photo" && (
                          <div className="text-center p-2 font-bold text-white uppercase flex flex-col items-center justify-center w-full h-full">
                            <ImageIcon className="w-5 h-5 text-blue-400 mb-1.5 opacity-90" />
                            <span className="text-[10px] font-extrabold tracking-wider text-zinc-200 select-none drop-shadow">{elem.name}</span>
                          </div>
                        )}

                        {elem.type === "qr" && (
                          <div className="bg-white p-1.5 rounded-lg aspect-square w-4/5 h-4/5 flex items-center justify-center shadow-md">
                            <QrCode className="w-full h-full text-zinc-905" />
                          </div>
                        )}

                        {elem.type === "logo" && (
                          <div className="text-center p-1 text-[9px] text-emerald-400 font-extrabold tracking-wider uppercase flex flex-col items-center justify-center">
                            <FileText className="w-4 h-4 text-emerald-400 mb-0.5" />
                            <span className="drop-shadow text-zinc-300 truncate max-w-full">{elem.name}</span>
                          </div>
                        )}

                        {elem.type === "text" && (
                          <div className="px-3 py-1 w-full h-full flex items-center justify-center text-center">
                            <span 
                              style={{ fontSize: `${Math.max(8, (elem.fontSize || 14) / 1.5)}px`, color: elem.fontColor || "#ffffff" }}
                              className="font-sans font-bold leading-normal break-all drop-shadow truncate select-none"
                            >
                              {elem.textValue || elem.name}
                            </span>
                          </div>
                        )}

                        {elem.type === "meta" && (
                          <div className="px-3 py-1 w-full h-full flex items-center justify-center text-center">
                            <span 
                              style={{ fontSize: `${Math.max(8, (elem.fontSize || 14) / 1.5)}px`, color: elem.fontColor || "#9ca3af" }}
                              className="font-mono font-extrabold tracking-widest leading-none drop-shadow select-none"
                            >
                              {elem.name === "Tanggal" ? "DD-MM-YYYY" : "HH:MM"}
                            </span>
                          </div>
                        )}

                        {elem.type === "decor" && (
                          <div className="text-[10px] text-zinc-400 italic">Decorative</div>
                        )}

                        {/* Direct Drag/Resize Handles when Selected */}
                        {isSelected && !elem.locked && (
                          <>
                            {/* Directional Resize Handles (8-Point Vector Control) */}
                            {/* N */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "n", elem)}
                              className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize z-50 hover:scale-125 shadow-sm transition-transform"
                              title="Tarik Atas"
                            />
                            {/* S */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "s", elem)}
                              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize z-50 hover:scale-125 shadow-sm transition-transform"
                              title="Tarik Bawah"
                            />
                            {/* E */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "e", elem)}
                              className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize z-50 hover:scale-125 shadow-sm transition-transform"
                              title="Tarik Kanan"
                            />
                            {/* W */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "w", elem)}
                              className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize z-50 hover:scale-125 shadow-sm transition-transform"
                              title="Tarik Kiri"
                            />
                            
                            {/* Corners */}
                            {/* NW */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "nw", elem)}
                              className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nw-resize z-50 hover:scale-125 shadow-md transition-transform"
                            />
                            {/* NE */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "ne", elem)}
                              className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ne-resize z-50 hover:scale-125 shadow-md transition-transform"
                            />
                            {/* SE */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "se", elem)}
                              className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-se-resize z-50 hover:scale-125 shadow-md transition-transform"
                            />
                            {/* SW */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, "sw", elem)}
                              className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-sw-resize z-50 hover:scale-125 shadow-md transition-transform"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}

                {/* Frame transparent overlay image (Placed on top of photo layers) */}
                {framePng && (
                  <img
                    src={framePng}
                    alt="Frame overlay"
                    style={{ opacity: frameOpacity / 100 }}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none z-40 transition-opacity duration-150"
                  />
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Right Element Configuration Panel */}
        <aside className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col overflow-y-auto shrink-0 select-none">
          <div className="p-4 space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-900">
              Pengaturan Elemen
            </h3>

            {selectedElem ? (
              <div className="space-y-4">
                {/* Active Info */}
                <div className="flex justify-between items-center bg-zinc-900 p-2.5 rounded-lg border border-zinc-850">
                  <span className="text-xs font-extrabold text-blue-400 truncate">{selectedElem.name}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => duplicateElement(selectedElem)}
                      className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
                      title="Duplikasi"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteElement(selectedElem.id)}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Coordinates & Size Sliders */}
                <div className="space-y-3 pt-1">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Dimensi (%)</h4>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Posisi X (Kiri):</span>
                      <span className="font-mono text-white">{Math.round(selectedElem.x)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={98}
                      step={1}
                      disabled={selectedElem.locked}
                      value={Math.round(selectedElem.x)}
                      onChange={(e) => updateElement(selectedElem.id, { x: Number(e.target.value) })}
                      className="w-full accent-blue-500 h-1.5 bg-zinc-900 rounded cursor-pointer disabled:opacity-30"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Posisi Y (Atas):</span>
                      <span className="font-mono text-white">{Math.round(selectedElem.y)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={98}
                      step={1}
                      disabled={selectedElem.locked}
                      value={Math.round(selectedElem.y)}
                      onChange={(e) => updateElement(selectedElem.id, { y: Number(e.target.value) })}
                      className="w-full accent-blue-500 h-1.5 bg-zinc-900 rounded cursor-pointer disabled:opacity-30"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Lebar:</span>
                      <span className="font-mono text-white">{Math.round(selectedElem.width)}%</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={100}
                      step={1}
                      disabled={selectedElem.locked}
                      value={Math.round(selectedElem.width)}
                      onChange={(e) => updateElement(selectedElem.id, { width: Number(e.target.value) })}
                      className="w-full accent-blue-500 h-1.5 bg-zinc-900 rounded cursor-pointer disabled:opacity-30"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Tinggi:</span>
                      <span className="font-mono text-white">{Math.round(selectedElem.height)}%</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={100}
                      step={1}
                      disabled={selectedElem.locked}
                      value={Math.round(selectedElem.height)}
                      onChange={(e) => updateElement(selectedElem.id, { height: Number(e.target.value) })}
                      className="w-full accent-blue-500 h-1.5 bg-zinc-900 rounded cursor-pointer disabled:opacity-30"
                    />
                  </div>
                </div>

                {/* Rotation & Styling Sliders */}
                <div className="space-y-3 pt-3 border-t border-zinc-900">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Estetika & Rotasi</h4>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Rotasi (Derajat):</span>
                      <span className="font-mono text-white">{selectedElem.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={5}
                      disabled={selectedElem.locked}
                      value={selectedElem.rotation}
                      onChange={(e) => updateElement(selectedElem.id, { rotation: Number(e.target.value) })}
                      className="w-full accent-blue-500 h-1.5 bg-zinc-900 rounded cursor-pointer disabled:opacity-30"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Sudut Lengkung (Border Radius):</span>
                      <span className="font-mono text-white">{selectedElem.borderRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={1}
                      disabled={selectedElem.locked}
                      value={selectedElem.borderRadius}
                      onChange={(e) => updateElement(selectedElem.id, { borderRadius: Number(e.target.value) })}
                      className="w-full accent-blue-500 h-1.5 bg-zinc-900 rounded cursor-pointer disabled:opacity-30"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-400">
                      <span>Opasitas (Opacity):</span>
                      <span className="font-mono text-white">{selectedElem.opacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      disabled={selectedElem.locked}
                      value={selectedElem.opacity}
                      onChange={(e) => updateElement(selectedElem.id, { opacity: Number(e.target.value) })}
                      className="w-full accent-blue-500 h-1.5 bg-zinc-900 rounded cursor-pointer disabled:opacity-30"
                    />
                  </div>
                </div>

                {/* Render Option above Overlay */}
                {selectedElem.type !== "photo" && (
                  <div className="space-y-2 pt-3 border-t border-zinc-900">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-zinc-400 font-semibold cursor-pointer select-none flex items-center gap-2" htmlFor="renderOnTop-checkbox">
                        <span>Tampil di Atas Bingkai (Overlay)</span>
                      </label>
                      <input
                        id="renderOnTop-checkbox"
                        type="checkbox"
                        checked={!!selectedElem.renderOnTop}
                        onChange={(e) => updateElement(selectedElem.id, { renderOnTop: e.target.checked })}
                        className="w-4.5 h-4.5 rounded text-blue-600 bg-zinc-900 border-zinc-800 focus:ring-blue-500 focus:ring-2 focus:ring-offset-zinc-950 accent-blue-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-[9px] text-zinc-500 leading-normal">
                      Jika diaktifkan, elemen ini akan diposisikan di atas gambar bingkai PNG transparan (overlay) sehingga tidak tertutup.
                    </p>
                  </div>
                )}

                {/* Text Customize option if it's a Text or Meta element */}
                {(selectedElem.type === "text" || selectedElem.type === "meta") && (
                  <div className="space-y-3 pt-3 border-t border-zinc-900">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Kustomisasi Teks</h4>

                    {selectedElem.type === "text" && (
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500">Isi Teks</label>
                        <input
                          type="text"
                          value={selectedElem.textValue || ""}
                          onChange={(e) => updateElement(selectedElem.id, { textValue: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-xs text-white"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500">Ukuran Huruf</label>
                        <input
                          type="number"
                          value={selectedElem.fontSize || 14}
                          onChange={(e) => updateElement(selectedElem.id, { fontSize: Number(e.target.value) })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-1 text-xs text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500">Warna Huruf</label>
                        <input
                          type="color"
                          value={selectedElem.fontColor || "#ffffff"}
                          onChange={(e) => updateElement(selectedElem.id, { fontColor: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded p-0.5 h-7 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Z-Index Order */}
                <div className="space-y-2 pt-3 border-t border-zinc-900">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Z-Index (Urutan Layer)</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateElement(selectedElem.id, { zIndex: Math.max(1, selectedElem.zIndex - 1) })}
                      className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-zinc-300 font-semibold"
                    >
                      Turun Layar
                    </button>
                    <button
                      onClick={() => updateElement(selectedElem.id, { zIndex: selectedElem.zIndex + 1 })}
                      className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-zinc-300 font-semibold"
                    >
                      Naik Layar
                    </button>
                  </div>
                </div>

                {/* Lock Status */}
                <div className="pt-2">
                  <button
                    onClick={() => updateElement(selectedElem.id, { locked: !selectedElem.locked })}
                    className={`w-full py-2 border rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      selectedElem.locked
                        ? "bg-yellow-600/15 border-yellow-500/40 text-yellow-400"
                        : "border-zinc-850 text-zinc-400 hover:bg-zinc-900"
                    }`}
                  >
                    {selectedElem.locked ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Elemen Terkunci
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        Kunci Posisi Elemen
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-500 text-xs">
                Silakan pilih salah satu elemen di canvas untuk melakukan konfigurasi detail.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
