import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import {
  LayoutGrid,
  Users,
  Calendar,
  Printer,
  Camera,
  FileText,
  Settings,
  Plus,
  Trash,
  Edit,
  RefreshCw,
  Sparkles,
  Check,
  Play,
  Mail,
  AlertTriangle,
  Battery,
  Database,
  Download,
  Copy,
  Image as ImageIcon,
  Type,
  QrCode,
  Clock,
} from "lucide-react";
import {
  AppEvent,
  PhotoRecord,
  PrinterStatus,
  CameraStatus,
  ActivityLog,
  SystemSettings,
  AnalyticsSummary,
  ChartData,
  FrameTemplate,
} from "../../types";
import FrameDesigner from "../../components/FrameDesigner";

const getDefaultPositions = (
  count: number,
  type: "strip" | "grid" | "single",
) => {
  const positions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> = [];
  if (type === "strip") {
    const height = Math.floor(75 / count);
    const gap = Math.floor(15 / (count + 1));
    for (let i = 0; i < count; i++) {
      positions.push({
        x: 10,
        y: 5 + i * (height + gap),
        width: 80,
        height: height,
      });
    }
  } else if (type === "single") {
    positions.push({
      x: 10,
      y: 10,
      width: 80,
      height: 70,
    });
  } else {
    if (count === 1) {
      positions.push({ x: 15, y: 15, width: 70, height: 65 });
    } else if (count === 2) {
      positions.push({ x: 8, y: 20, width: 40, height: 55 });
      positions.push({ x: 52, y: 20, width: 40, height: 55 });
    } else if (count <= 4) {
      positions.push({ x: 8, y: 8, width: 40, height: 38 });
      positions.push({ x: 52, y: 8, width: 40, height: 38 });
      positions.push({ x: 8, y: 52, width: 40, height: 38 });
      positions.push({ x: 52, y: 52, width: 40, height: 38 });
    } else if (count <= 6) {
      positions.push({ x: 5, y: 8, width: 28, height: 38 });
      positions.push({ x: 36, y: 8, width: 28, height: 38 });
      positions.push({ x: 67, y: 8, width: 28, height: 38 });
      positions.push({ x: 5, y: 52, width: 28, height: 38 });
      positions.push({ x: 36, y: 52, width: 28, height: 38 });
      positions.push({ x: 67, y: 52, width: 28, height: 38 });
    } else {
      // 8 photo grid layout (4 columns, 2 rows)
      const colWidth = 20;
      const colGap = 4;
      const rowHeight = 38;
      for (let r = 0; r < 2; r++) {
        const y = r === 0 ? 8 : 52;
        for (let c = 0; c < 4; c++) {
          positions.push({
            x: 4 + c * (colWidth + colGap),
            y: y,
            width: colWidth,
            height: rowHeight,
          });
        }
      }
    }
  }
  return positions;
};

export default function AdminDashboard() {
  const {
    events,
    photos,
    templates,
    deleteTemplate,
    saveTemplate,
    fetchInitialData,
  } = useApp() as any;
  const navigate = useNavigate();
  const location = useLocation();

  // Designer overlays state
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [designerTemplate, setDesignerTemplate] =
    useState<FrameTemplate | null>(null);

  // Determine active tab based on pathname
  let activeTab:
    | "overview"
    | "events"
    | "templates"
    | "gallery"
    | "printer"
    | "camera"
    | "logs"
    | "settings" = "overview";
  if (location.pathname.includes("/dashboard/events")) {
    activeTab = "events";
  } else if (location.pathname.includes("/dashboard/templates")) {
    activeTab = "templates";
  } else if (location.pathname.includes("/dashboard/gallery")) {
    activeTab = "gallery";
  } else if (location.pathname.includes("/dashboard/settings")) {
    activeTab = "settings";
  } else if (location.pathname.includes("/dashboard/printer")) {
    activeTab = "printer";
  } else if (location.pathname.includes("/dashboard/camera")) {
    activeTab = "camera";
  } else if (location.pathname.includes("/dashboard/logs")) {
    activeTab = "logs";
  }

  const setActiveTab = (tab: string) => {
    if (tab === "overview") {
      navigate("/dashboard");
    } else {
      navigate(`/dashboard/${tab}`);
    }
  };

  const onRefreshEvents = fetchInitialData;
  const onRefreshGallery = fetchInitialData;
  const onClose = () => {
    navigate("/landing");
  };

  // Database / State holders
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    photosCount: 0,
    gifsCount: 0,
    videosCount: 0,
    totalPrints: 0,
    totalEmails: 0,
    totalEvents: 0,
    visitorCount: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [systemLogs, setSystemLogs] = useState<ActivityLog[]>([]);
  const [printer, setPrinter] = useState<PrinterStatus | null>(null);
  const [camera, setCamera] = useState<CameraStatus | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Editing forms state
  const [editingEvent, setEditingEvent] = useState<Partial<AppEvent> | null>(
    null,
  );
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  } | null>(null);

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: { confirmText?: string; cancelText?: string; isDanger?: boolean },
  ) => {
    setConfirmModal({
      title,
      message,
      onConfirm: async () => {
        await onConfirm();
        setConfirmModal(null);
      },
      confirmText: options?.confirmText || "Ya, Lanjutkan",
      cancelText: options?.cancelText || "Batal",
      isDanger: options?.isDanger !== false,
    });
  };

  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState({
    x: 0,
    y: 0,
    slotX: 0,
    slotY: 0,
  });

  useEffect(() => {
    if (editingEvent && eventFormOpen) {
      const currentCount = editingEvent.photoCount || 4;
      const currentType = editingEvent.layoutType || "strip";
      const currentPositions = editingEvent.layoutPositions || [];
      const expectedPositions = getDefaultPositions(currentCount, currentType);

      if (currentPositions.length !== expectedPositions.length) {
        setEditingEvent((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            layoutPositions: expectedPositions,
          };
        });
      }
    }
  }, [editingEvent?.photoCount, editingEvent?.layoutType, eventFormOpen]);

  const handleUploadBackground = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        showToast("Mengunggah latar belakang...");
        const res = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: base64String,
            scope: editingEvent?.id || "event-assets",
            label: "background",
          }),
        });
        const data = await res.json();
        if (data.success) {
          setEditingEvent((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              backgroundImage: data.data.url,
            };
          });
          showToast("Latar belakang berhasil diunggah!");
        } else {
          showToast(data.message || "Gagal mengunggah latar belakang.");
        }
      } catch (_) {
        showToast("Kesalahan koneksi saat mengunggah.");
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [photos, events]);

  const fetchDashboardData = async () => {
    try {
      // Analytics
      const resAnal = await fetch("/api/analytics");
      const dAnal = await resAnal.json();
      if (dAnal.success) {
        setAnalytics(dAnal.summary);
        setChartData(dAnal.activityData);
      }

      // Printer
      const resPrint = await fetch("/api/print/status");
      const dPrint = await resPrint.json();
      if (dPrint.success) setPrinter(dPrint.data);

      // Camera
      const resCam = await fetch("/api/camera/status");
      const dCam = await resCam.json();
      if (dCam.success) setCamera(dCam.data);

      // Settings
      const resSet = await fetch("/api/settings");
      const dSet = await resSet.json();
      if (dSet.success) setSettings(dSet.data);

      // Logs
      const resLogs = await fetch("/api/logs");
      const dLogs = await resLogs.json();
      if (dLogs.success) setSystemLogs(dLogs.data);
    } catch (err) {
      console.error("Error loading admin stats", err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Create or Edit Event Action
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEvent),
      });
      const data = await response.json();
      if (data.success) {
        onRefreshEvents();
        setEventFormOpen(false);
        setEditingEvent(null);
        showToast("Event berhasil disimpan!");
      }
    } catch (_) {
      showToast("Gagal menyimpan event.");
    }
  };

  const handleDeleteEvent = (id: string) => {
    requestConfirm(
      "Hapus Event Preset?",
      "Apakah Anda yakin ingin menghapus event ini? Seluruh setelan layout terkait akan direset.",
      async () => {
        try {
          const response = await fetch(`/api/events/${id}`, {
            method: "DELETE",
          });
          const data = await response.json();
          if (data.success) {
            onRefreshEvents();
            showToast("Event berhasil dihapus.");
          }
        } catch (_) {
          showToast("Gagal menghapus.");
        }
      },
      { confirmText: "Ya, Hapus", isDanger: true },
    );
  };

  // Delete Captured Photo
  const handleDeletePhoto = (id: string) => {
    requestConfirm(
      "Hapus Media Permanen?",
      "Apakah Anda yakin ingin menghapus file foto ini secara permanen dari server? Tindakan ini tidak dapat dibatalkan.",
      async () => {
        try {
          const response = await fetch(`/api/gallery/${id}`, {
            method: "DELETE",
          });
          const data = await response.json();
          if (data.success) {
            onRefreshGallery();
            showToast("Media berhasil dihapus.");
          }
        } catch (_) {
          showToast("Gagal menghapus media.");
        }
      },
      { confirmText: "Ya, Hapus", isDanger: true },
    );
  };

  // Reprint Photo
  const handleReprintPhoto = async (id: string) => {
    try {
      const response = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: id, size: "4x6", copies: 1 }),
      });
      const data = await response.json();
      if (data.success) {
        showToast("Reprint job sukses dikirim ke printer lokal!");
        fetchDashboardData();
      }
    } catch (_) {
      showToast("Printer offline.");
    }
  };

  // Update Printer Simulator levels
  const handleCalibratePrinter = async (
    refillPaper: boolean,
    refillInk: boolean,
  ) => {
    if (!printer) return;
    const update: any = {};
    if (refillPaper) update.paperRemaining = 150;
    if (refillInk) update.inkLevel = 100;
    update.status = "Online";

    try {
      const res = await fetch("/api/print/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await res.json();
      if (data.success) {
        setPrinter(data.data);
        showToast("Printer berhasil dikalibrasi!");
      }
    } catch (_) {}
  };

  // Camera Settings Simulator update
  const handleUpdateCameraDial = async (key: string, value: string) => {
    if (!camera) return;
    try {
      const res = await fetch("/api/camera/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (data.success) {
        setCamera(data.data);
        showToast(`DSLR Dial ${key.toUpperCase()} disesuaikan ke ${value}`);
      }
    } catch (_) {}
  };

  const handleCameraTestCapture = async () => {
    try {
      const res = await fetch("/api/camera/capture", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("DSLR Shutter Triggered! Deteksi Sensor: OK");
      }
    } catch (_) {
      showToast("Gagal memicu DSLR.");
    }
  };

  // Settings Save
  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Setelan sistem berhasil diperbarui!");
      }
    } catch (_) {
      showToast("Gagal menyimpan.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] font-sans flex flex-col selection:bg-[#1a1a1a] selection:text-white">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 bg-[#1a1a1a] text-white border border-[#1a1a1a] rounded shadow-2xl text-[10px] font-mono uppercase tracking-widest font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white" />
          {toastMessage}
        </div>
      )}

      {/* Header section */}
      <header className="p-4 bg-white border-b border-[#1a1a1a]/[0.08] flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#1a1a1a]/5 text-[#1a1a1a] rounded">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-serif italic text-[#1a1a1a] tracking-tight pr-2">
              snapazzhot
            </span>
            <span className="text-[10px] text-[#1a1a1a]/40 font-mono inline-block border-l border-[#1a1a1a]/[0.08] pl-2">
              Admin Console
            </span>
            <span className="text-[8px] text-[#1a1a1a]/30 font-mono block">
              Operator Port: 3000 • Database Connected
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 bg-transparent hover:bg-[#1a1a1a]/5 border border-[#1a1a1a]/[0.08] text-[#1a1a1a]/70 font-mono text-[9px] font-bold uppercase tracking-widest rounded transition cursor-pointer"
        >
          Keluar Dashboard
        </button>
      </header>

      {/* Main Panel grid layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-white border-r border-[#1a1a1a]/[0.08] p-4 space-y-2 shrink-0">
          <span className="text-[9px] font-bold text-[#1a1a1a]/40 uppercase tracking-widest px-3 block mb-4 font-mono">
            NAVIGASI KONTROL
          </span>

          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest rounded transition ${
              activeTab === "overview"
                ? "bg-[#1a1a1a] text-white shadow-sm"
                : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Overview & Analytics
          </button>

          <button
            onClick={() => setActiveTab("events")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest rounded transition ${
              activeTab === "events"
                ? "bg-[#1a1a1a] text-white shadow-sm"
                : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Event Management
          </button>

          <button
            onClick={() => setActiveTab("templates")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest rounded transition ${
              activeTab === "templates"
                ? "bg-[#1a1a1a] text-white shadow-sm"
                : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Frame Templates
          </button>

          <button
            onClick={() => setActiveTab("gallery")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest rounded transition ${
              activeTab === "gallery"
                ? "bg-[#1a1a1a] text-white shadow-sm"
                : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5"
            }`}
          >
            <FileText className="w-4 h-4" />
            Live Event Gallery
          </button>

          <button
            onClick={() => setActiveTab("printer")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest rounded transition ${
              activeTab === "printer"
                ? "bg-[#1a1a1a] text-white shadow-sm"
                : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5"
            }`}
          >
            <Printer className="w-4 h-4" />
            Local Print Service
          </button>

          <button
            onClick={() => setActiveTab("camera")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest rounded transition ${
              activeTab === "camera"
                ? "bg-[#1a1a1a] text-white shadow-sm"
                : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5"
            }`}
          >
            <Camera className="w-4 h-4" />
            DSLR Camera Service
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest rounded transition ${
              activeTab === "logs"
                ? "bg-[#1a1a1a] text-white shadow-sm"
                : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5"
            }`}
          >
            <Database className="w-4 h-4" />
            Sistem Logs & Antrean
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest rounded transition ${
              activeTab === "settings"
                ? "bg-[#1a1a1a] text-white shadow-sm"
                : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5"
            }`}
          >
            <Settings className="w-4 h-4" />
            Sistem Settings
          </button>
        </aside>

        {/* Content Viewer */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-serif text-[#1a1a1a] italic">
                  Overview Dashboard
                </h3>
                <p className="text-xs text-[#1a1a1a]/60 mt-1">
                  Pantau statistik pengambilan gambar, volume cetak, dan status
                  sinkronisasi perangkat keras.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white border border-[#1a1a1a]/[0.08] rounded shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                  <span className="text-[9px] font-bold text-[#1a1a1a]/40 uppercase tracking-widest font-mono">
                    TOTAL CAPTURES
                  </span>
                  <p className="text-2xl font-serif text-[#1a1a1a] italic mt-1">
                    {analytics.photosCount} Foto
                  </p>
                  <span className="text-[9px] text-[#1a1a1a]/30 font-mono block mt-1">
                    Realtime uploads
                  </span>
                </div>
                <div className="p-4 bg-white border border-[#1a1a1a]/[0.08] rounded shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                  <span className="text-[9px] font-bold text-[#1a1a1a]/40 uppercase tracking-widest font-mono">
                    PRINTED LAYOUTS
                  </span>
                  <p className="text-2xl font-serif text-[#1a1a1a] italic mt-1">
                    {analytics.totalPrints} Pcs
                  </p>
                  <span className="text-[9px] text-[#1a1a1a]/30 font-mono block mt-1">
                    Thermal & Dye-Sub
                  </span>
                </div>
                <div className="p-4 bg-white border border-[#1a1a1a]/[0.08] rounded shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                  <span className="text-[9px] font-bold text-[#1a1a1a]/40 uppercase tracking-widest font-mono">
                    EMAIL QUEUE
                  </span>
                  <p className="text-2xl font-serif text-[#1a1a1a] italic mt-1">
                    {analytics.totalEmails} Sent
                  </p>
                  <span className="text-[9px] text-[#1a1a1a]/30 font-mono block mt-1">
                    SMTP Relay Logs
                  </span>
                </div>
                <div className="p-4 bg-white border border-[#1a1a1a]/[0.08] rounded shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                  <span className="text-[9px] font-bold text-[#1a1a1a]/40 uppercase tracking-widest font-mono">
                    EVENT VISITOR
                  </span>
                  <p className="text-2xl font-serif text-[#1a1a1a] italic mt-1">
                    ~{analytics.visitorCount}
                  </p>
                  <span className="text-[9px] text-[#1a1a1a]/30 font-mono block mt-1">
                    Active scanned QR
                  </span>
                </div>
              </div>

              {/* GORGEOUS SVG ANALYTICAL CHART */}
              <div className="p-5 bg-white border border-[#1a1a1a]/[0.08] rounded shadow-[0_4px_20px_rgba(0,0,0,0.01)] space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-serif italic text-[#1a1a1a]">
                      Grafik Aktivitas Mingguan
                    </h4>
                    <p className="text-[10px] text-[#1a1a1a]/50 mt-0.5">
                      Analisis harian untuk total Foto, Cetak, dan GIF.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-[#1a1a1a]/5 border border-[#1a1a1a]/[0.08] text-[9px] text-[#1a1a1a]/60 font-mono font-bold uppercase tracking-widest rounded">
                    Real-Time Chart
                  </span>
                </div>

                {/* Custom SVG line chart engine */}
                <div className="h-64 w-full relative flex items-end">
                  {/* Y-axis helper labels */}
                  <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[8px] font-mono text-[#1a1a1a]/40 pr-2">
                    <span>12 -</span>
                    <span>9 -</span>
                    <span>6 -</span>
                    <span>3 -</span>
                    <span>0 -</span>
                  </div>

                  {/* Chart plot box */}
                  <div className="flex-1 h-full ml-8 relative border-b border-l border-[#1a1a1a]/[0.08] flex items-end justify-between px-6 pt-6">
                    {/* Horizontal background helper gridlines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      <div className="border-t border-[#1a1a1a]/5 w-full h-0" />
                      <div className="border-t border-[#1a1a1a]/5 w-full h-0" />
                      <div className="border-t border-[#1a1a1a]/5 w-full h-0" />
                      <div className="border-t border-[#1a1a1a]/5 w-full h-0" />
                      <div className="w-full h-0" />
                    </div>

                    {/* Chart columns bars representing data */}
                    {chartData.map((day, idx) => {
                      const maxVal = 12;
                      const fotoHeight = Math.min(
                        100,
                        (day.Foto / maxVal) * 100,
                      );
                      const printHeight = Math.min(
                        100,
                        (day.Cetak / maxVal) * 100,
                      );

                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center gap-1 z-10 w-12 group"
                        >
                          {/* Data Tooltip overlay on hover */}
                          <div className="opacity-0 group-hover:opacity-100 absolute bottom-16 bg-[#1a1a1a] border border-[#1a1a1a] px-2 py-1.5 rounded text-[8px] font-mono space-y-1 shadow-2xl transition z-50 pointer-events-none text-white">
                            <p className="font-bold text-white mb-0.5">
                              {day.name}
                            </p>
                            <p className="text-white/90">📸 Foto: {day.Foto}</p>
                            <p className="text-white/60">
                              🖨️ Cetak: {day.Cetak}
                            </p>
                          </div>

                          <div className="h-40 w-full flex items-end justify-center gap-1.5">
                            {/* Dark slate bar for Photo count */}
                            <div
                              style={{ height: `${fotoHeight}%` }}
                              className="w-3 bg-gradient-to-t from-[#1a1a1a] to-[#1a1a1a]/80 rounded-t-sm shadow-sm"
                            />
                            {/* Faded slate bar for Print count */}
                            <div
                              style={{ height: `${printHeight}%` }}
                              className="w-3 bg-gradient-to-t from-[#1a1a1a]/40 to-[#1a1a1a]/20 rounded-t-sm shadow-sm"
                            />
                          </div>

                          <span className="text-[9px] font-mono text-[#1a1a1a]/40 mt-2">
                            {day.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-6 text-[8px] font-mono font-bold uppercase tracking-widest text-[#1a1a1a]/40 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#1a1a1a] rounded-sm" />
                    Total Foto Booth
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#1a1a1a]/40 rounded-sm" />
                    Total Layout Cetak
                  </div>
                </div>
              </div>

              {/* Status block summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-[#1a1a1a]/[0.08] rounded shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex items-center justify-between">
                  <div className="space-y-1">
                    <h5 className="text-[9px] font-bold text-[#1a1a1a]/40 font-mono uppercase tracking-widest">
                      STATUS PRINTER LOKAL
                    </h5>
                    <p className="text-sm font-serif italic text-[#1a1a1a] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      {printer?.name || "No Printer connected"} (
                      {printer?.status})
                    </p>
                    <p className="text-[10px] text-[#1a1a1a]/50 font-sans">
                      Kertas tersisa: {printer?.paperRemaining} lbr • Ink level:{" "}
                      {printer?.inkLevel}%
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("printer")}
                    className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-black text-white rounded font-mono text-[9px] uppercase tracking-widest transition cursor-pointer"
                  >
                    Atur
                  </button>
                </div>

                <div className="p-4 bg-white border border-[#1a1a1a]/[0.08] rounded shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex items-center justify-between">
                  <div className="space-y-1">
                    <h5 className="text-[9px] font-bold text-[#1a1a1a]/40 font-mono uppercase tracking-widest">
                      DSLR KAMERA UTAMA
                    </h5>
                    <p className="text-sm font-serif italic text-[#1a1a1a] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      {camera?.name}
                    </p>
                    <p className="text-[10px] text-[#1a1a1a]/50 font-sans">
                      Resolusi: {camera?.resolution} • ISO {camera?.iso} •
                      Battery {camera?.batteryLevel}%
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("camera")}
                    className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-black text-white rounded font-mono text-[9px] uppercase tracking-widest transition cursor-pointer"
                  >
                    Atur
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EVENT MANAGEMENT */}
          {activeTab === "events" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white">
                    Event Template Management
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Konfigurasi, buat, dan edit preset tema untuk photo booth.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingEvent({
                      name: "",
                      logo: "",
                      frameId: "wedding-classic",
                      countdown: 5,
                      photoCount: 4,
                      layoutType: "strip",
                      themeColor: "#3b82f6",
                      qrExpiredMinutes: 60,
                      emailTemplate: "",
                      backgroundImage: "",
                      layoutPositions: getDefaultPositions(4, "strip"),
                      enableVideo: true,
                      videoQuality: "medium",
                      enableAudio: false,
                      enableGif: true,
                      gifResolution: 640,
                      gifDelay: 500,
                    });
                    setEventFormOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Event Baru
                </button>
              </div>

              {/* New/Edit Event Form Card Overlay */}
              {eventFormOpen && editingEvent && (
                <form
                  onSubmit={handleSaveEvent}
                  className="p-6 bg-zinc-900 border border-blue-500/30 rounded-2xl space-y-4"
                >
                  <h4 className="text-sm font-bold text-white flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    {editingEvent.id
                      ? "Edit Event Preset"
                      : "Buat Event Template Baru"}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">
                        Nama Event / Acara
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Class convocation 2026"
                        value={editingEvent.name || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            name: e.target.value,
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">
                        Logo Subheading Text
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Sarah & Dave, 4 Juli 2026"
                        value={editingEvent.logo || ""}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            logo: e.target.value,
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">
                        Jumlah Snaps per Sesi
                      </label>
                      <select
                        value={editingEvent.photoCount || 4}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            photoCount: Number(e.target.value),
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                      >
                        <option value={1}>1 Capture (Portrait Layout)</option>
                        <option value={2}>2 Captures (Double Grid)</option>
                        <option value={4}>
                          4 Captures (Classic 2x6 Strip)
                        </option>
                        <option value={6}>6 Captures (Grid 2x3 layout)</option>
                        <option value={8}>8 Captures (Grid 2x4 layout)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">
                        Layout Format Paper
                      </label>
                      <select
                        value={editingEvent.layoutType || "strip"}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            layoutType: e.target.value as any,
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="strip">2x6 Photo Strip (Stacked)</option>
                        <option value="grid">4x6 Photo Card (Grid)</option>
                        <option value="single">
                          4x6 Large Single Snapshot
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">
                        Countdown Timer (seconds)
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={15}
                        value={editingEvent.countdown || 5}
                        onChange={(e) =>
                          setEditingEvent({
                            ...editingEvent,
                            countdown: Number(e.target.value),
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                      />
                      <div className="space-y-1.5 md:col-span-2 pt-2 border-t border-zinc-800">
                        <label className="text-xs text-zinc-400 font-bold">
                          Jenis Bingkai (Frame Theme / Template)
                        </label>
                        <select
                          value={editingEvent.frameId || "wedding-classic"}
                          onChange={(e) => {
                            const val = e.target.value;
                            const selectedTpl = templates?.find(
                              (t: any) => t.id === val,
                            );
                            if (selectedTpl) {
                              setEditingEvent({
                                ...editingEvent,
                                frameId: val,
                                templateId: val,
                                photoCount: selectedTpl.photoCount,
                                layoutType:
                                  selectedTpl.printSize === "Strips"
                                    ? "strip"
                                    : selectedTpl.photoCount === 1
                                      ? "single"
                                      : "grid",
                                backgroundImage:
                                  selectedTpl.backgroundImage || "",
                                layoutPositions: undefined,
                              });
                            } else {
                              setEditingEvent({
                                ...editingEvent,
                                frameId: val,
                                templateId: undefined,
                                backgroundImage:
                                  val === "custom"
                                    ? editingEvent.backgroundImage || ""
                                    : "",
                                layoutPositions:
                                  val === "custom"
                                    ? editingEvent.layoutPositions ||
                                      getDefaultPositions(
                                        editingEvent.photoCount || 4,
                                        editingEvent.layoutType || "strip",
                                      )
                                    : undefined,
                              });
                            }
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white"
                        >
                          <optgroup label="Tema Bawaan (Built-in Themes)">
                            <option value="wedding-classic">
                              💍 Wedding Classic (Gold Elegant Frame)
                            </option>
                            <option value="grad-gold">
                              🎓 Graduation Gold (Dark Gold Borders)
                            </option>
                            <option value="corp-minimal">
                              🚀 Corporate Minimalist (Slick Frame)
                            </option>
                            <option value="birthday-neon">
                              🥳 Birthday Neon (Glowing Pink Overlay)
                            </option>
                          </optgroup>

                          {templates && templates.length > 0 && (
                            <optgroup label="Desain Template Kustom (Visual Frame Designer)">
                              {templates.map((tpl: any) => (
                                <option key={tpl.id} value={tpl.id}>
                                  🎨 {tpl.name} ({tpl.printSize} •{" "}
                                  {tpl.photoCount} Foto)
                                </option>
                              ))}
                            </optgroup>
                          )}

                          <optgroup label="Atur Manual (Legacy Kustom)">
                            <option value="custom">
                              🛠️ KUSTOM MANUAL (Upload Background & Atur Layout
                              di Sini)
                            </option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Media Booth Settings card */}
                      <div className="md:col-span-2 border border-zinc-800 bg-zinc-950/40 rounded-xl p-4 space-y-4">
                        <h5 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          Pengaturan Otomatis (GIF Booth & Behind The Scene
                          Video)
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Video settings */}
                          <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-850 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">
                                Behind The Scene Video
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingEvent.enableVideo ?? true}
                                  onChange={(e) =>
                                    setEditingEvent({
                                      ...editingEvent,
                                      enableVideo: e.target.checked,
                                    })
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                              </label>
                            </div>

                            {(editingEvent.enableVideo ?? true) && (
                              <div className="space-y-2 pt-1">
                                <div className="space-y-1">
                                  <label className="text-[10px] text-zinc-400">
                                    Kualitas Rekaman Video
                                  </label>
                                  <select
                                    value={
                                      editingEvent.videoQuality || "medium"
                                    }
                                    onChange={(e) =>
                                      setEditingEvent({
                                        ...editingEvent,
                                        videoQuality: e.target.value as any,
                                      })
                                    }
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 text-[11px] text-white"
                                  >
                                    <option value="low">
                                      Low (480p, 30 FPS)
                                    </option>
                                    <option value="medium">
                                      Medium (720p, 30 FPS)
                                    </option>
                                    <option value="high">
                                      High (1080p, 30/60 FPS)
                                    </option>
                                  </select>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[10px] text-zinc-400">
                                    Input Audio (Mikrofon)
                                  </span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={
                                        editingEvent.enableAudio ?? false
                                      }
                                      onChange={(e) =>
                                        setEditingEvent({
                                          ...editingEvent,
                                          enableAudio: e.target.checked,
                                        })
                                      }
                                      className="sr-only peer"
                                    />
                                    <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* GIF settings */}
                          <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-850 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">
                                GIF Booth Loop
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingEvent.enableGif ?? true}
                                  onChange={(e) =>
                                    setEditingEvent({
                                      ...editingEvent,
                                      enableGif: e.target.checked,
                                    })
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                              </label>
                            </div>

                            {(editingEvent.enableGif ?? true) && (
                              <div className="space-y-2 pt-1">
                                <div className="space-y-1">
                                  <label className="text-[10px] text-zinc-400">
                                    Resolusi Output GIF
                                  </label>
                                  <select
                                    value={editingEvent.gifResolution || 640}
                                    onChange={(e) =>
                                      setEditingEvent({
                                        ...editingEvent,
                                        gifResolution: Number(e.target.value),
                                      })
                                    }
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 text-[11px] text-white"
                                  >
                                    <option value={400}>
                                      400x400 px (Kotak Ringan)
                                    </option>
                                    <option value={640}>
                                      640x640 px (Kotak Standar HD)
                                    </option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] text-zinc-400">
                                    Durasi Pergantian Frame (Looping Speed)
                                  </label>
                                  <select
                                    value={editingEvent.gifDelay || 500}
                                    onChange={(e) =>
                                      setEditingEvent({
                                        ...editingEvent,
                                        gifDelay: Number(e.target.value),
                                      })
                                    }
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 text-[11px] text-white"
                                  >
                                    <option value={300}>
                                      Cepat (0.3 Detik)
                                    </option>
                                    <option value={500}>
                                      Sedang (0.5 Detik)
                                    </option>
                                    <option value={800}>
                                      Lambat (0.8 Detik)
                                    </option>
                                    <option value={1000}>
                                      Sangat Lambat (1.0 Detik)
                                    </option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {editingEvent.frameId === "custom" && (
                      <div className="border border-zinc-800 bg-zinc-950/40 rounded-xl p-4 space-y-4 md:col-span-2">
                        <h5 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                          <Sparkles className="w-4 h-4 text-yellow-400" />
                          Desain Bingkai & Tata Letak Foto Kustom
                        </h5>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          {/* Left controls side */}
                          <div className="lg:col-span-5 space-y-4">
                            {/* File Uploader */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                Unggah Latar Belakang Gambar
                              </label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleUploadBackground}
                                  className="text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-blue-600/15 file:text-blue-400 hover:file:bg-blue-600/25 cursor-pointer"
                                />
                                {editingEvent.backgroundImage && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingEvent({
                                        ...editingEvent,
                                        backgroundImage: "",
                                      })
                                    }
                                    className="px-2 py-1 bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 text-[10px] rounded"
                                  >
                                    Hapus
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-500 leading-relaxed">
                                Unggah gambar frame / background. Posisi foto
                                nanti diletakkan di atas background ini.
                              </p>
                            </div>

                            {/* List of Photo Slot positions & Sliders */}
                            <div className="space-y-3 pt-2">
                              <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                  Tata Letak Slot Foto (
                                  {editingEvent.photoCount} Slot)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    requestConfirm(
                                      "Reset Tata Letak?",
                                      "Apakah Anda yakin ingin mereset seluruh posisi slot foto ke susunan default?",
                                      () => {
                                        setEditingEvent({
                                          ...editingEvent,
                                          layoutPositions: getDefaultPositions(
                                            editingEvent.photoCount || 4,
                                            editingEvent.layoutType || "strip",
                                          ),
                                        });
                                      },
                                      {
                                        confirmText: "Ya, Reset",
                                        isDanger: true,
                                      },
                                    );
                                  }}
                                  className="text-[9px] font-bold text-blue-400 hover:text-blue-300 bg-blue-600/10 px-2 py-0.5 rounded transition"
                                >
                                  Reset ke Default
                                </button>
                              </div>

                              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {(editingEvent.layoutPositions || []).map(
                                  (pos, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-lg space-y-2"
                                    >
                                      <span className="text-[10px] font-extrabold text-blue-400 block">
                                        Slot Foto #{idx + 1}
                                      </span>
                                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                                        <div className="space-y-0.5">
                                          <div className="flex justify-between text-zinc-400">
                                            <span>X (Kiri):</span>
                                            <span className="font-mono text-white">
                                              {Math.round(pos.x)}%
                                            </span>
                                          </div>
                                          <input
                                            type="range"
                                            min={0}
                                            max={95}
                                            value={Math.round(pos.x)}
                                            onChange={(e) => {
                                              const newPos = [
                                                ...(editingEvent.layoutPositions ||
                                                  []),
                                              ];
                                              if (newPos[idx]) {
                                                newPos[idx] = {
                                                  ...newPos[idx],
                                                  x: Number(e.target.value),
                                                };
                                                setEditingEvent({
                                                  ...editingEvent,
                                                  layoutPositions: newPos,
                                                });
                                              }
                                            }}
                                            className="w-full accent-blue-500 h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer"
                                          />
                                        </div>
                                        <div className="space-y-0.5">
                                          <div className="flex justify-between text-zinc-400">
                                            <span>Y (Atas):</span>
                                            <span className="font-mono text-white">
                                              {Math.round(pos.y)}%
                                            </span>
                                          </div>
                                          <input
                                            type="range"
                                            min={0}
                                            max={95}
                                            value={Math.round(pos.y)}
                                            onChange={(e) => {
                                              const newPos = [
                                                ...(editingEvent.layoutPositions ||
                                                  []),
                                              ];
                                              if (newPos[idx]) {
                                                newPos[idx] = {
                                                  ...newPos[idx],
                                                  y: Number(e.target.value),
                                                };
                                                setEditingEvent({
                                                  ...editingEvent,
                                                  layoutPositions: newPos,
                                                });
                                              }
                                            }}
                                            className="w-full accent-blue-500 h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer"
                                          />
                                        </div>
                                        <div className="space-y-0.5">
                                          <div className="flex justify-between text-zinc-400">
                                            <span>Lebar:</span>
                                            <span className="font-mono text-white">
                                              {Math.round(pos.width)}%
                                            </span>
                                          </div>
                                          <input
                                            type="range"
                                            min={5}
                                            max={100}
                                            value={Math.round(pos.width)}
                                            onChange={(e) => {
                                              const newPos = [
                                                ...(editingEvent.layoutPositions ||
                                                  []),
                                              ];
                                              if (newPos[idx]) {
                                                newPos[idx] = {
                                                  ...newPos[idx],
                                                  width: Number(e.target.value),
                                                };
                                                setEditingEvent({
                                                  ...editingEvent,
                                                  layoutPositions: newPos,
                                                });
                                              }
                                            }}
                                            className="w-full accent-blue-500 h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer"
                                          />
                                        </div>
                                        <div className="space-y-0.5">
                                          <div className="flex justify-between text-zinc-400">
                                            <span>Tinggi:</span>
                                            <span className="font-mono text-white">
                                              {Math.round(pos.height)}%
                                            </span>
                                          </div>
                                          <input
                                            type="range"
                                            min={5}
                                            max={100}
                                            value={Math.round(pos.height)}
                                            onChange={(e) => {
                                              const newPos = [
                                                ...(editingEvent.layoutPositions ||
                                                  []),
                                              ];
                                              if (newPos[idx]) {
                                                newPos[idx] = {
                                                  ...newPos[idx],
                                                  height: Number(
                                                    e.target.value,
                                                  ),
                                                };
                                                setEditingEvent({
                                                  ...editingEvent,
                                                  layoutPositions: newPos,
                                                });
                                              }
                                            }}
                                            className="w-full accent-blue-500 h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right interactive Canvas editor preview */}
                          <div className="lg:col-span-7 flex flex-col items-center justify-center p-3 bg-zinc-950 border border-zinc-850 rounded-xl min-h-[300px]">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                              Live Canvas Editor (Klik & Geser untuk Memindahkan
                              Letak)
                            </span>

                            <div
                              style={{
                                backgroundImage: editingEvent.backgroundImage
                                  ? `url(${editingEvent.backgroundImage})`
                                  : "none",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                              className={`relative border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900 shadow-inner flex items-center justify-center select-none w-full max-w-[280px] ${
                                editingEvent.layoutType === "strip"
                                  ? "aspect-[1/3]"
                                  : editingEvent.layoutType === "single"
                                    ? "aspect-[4/3] max-w-[380px]"
                                    : "aspect-[3/2] max-w-[380px]"
                              }`}
                              onMouseMove={(e) => {
                                if (draggingSlot === null) return;
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                const dx =
                                  ((e.clientX - dragStart.x) / rect.width) *
                                  100;
                                const dy =
                                  ((e.clientY - dragStart.y) / rect.height) *
                                  100;

                                const newPos = [
                                  ...(editingEvent.layoutPositions || []),
                                ];
                                if (newPos[draggingSlot]) {
                                  newPos[draggingSlot] = {
                                    ...newPos[draggingSlot],
                                    x: Math.max(
                                      0,
                                      Math.min(
                                        100 -
                                          (newPos[draggingSlot]?.width || 20),
                                        dragStart.slotX + dx,
                                      ),
                                    ),
                                    y: Math.max(
                                      0,
                                      Math.min(
                                        100 -
                                          (newPos[draggingSlot]?.height || 20),
                                        dragStart.slotY + dy,
                                      ),
                                    ),
                                  };
                                  setEditingEvent({
                                    ...editingEvent,
                                    layoutPositions: newPos,
                                  });
                                }
                              }}
                              onMouseUp={() => setDraggingSlot(null)}
                              onMouseLeave={() => setDraggingSlot(null)}
                            >
                              {/* Grid pattern helper */}
                              {!editingEvent.backgroundImage && (
                                <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 opacity-10 pointer-events-none">
                                  {Array.from({ length: 144 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className="border border-white"
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Overlays */}
                              {(editingEvent.layoutPositions || []).map(
                                (pos, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      left: `${pos.x}%`,
                                      top: `${pos.y}%`,
                                      width: `${pos.width}%`,
                                      height: `${pos.height}%`,
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setDraggingSlot(idx);
                                      setDragStart({
                                        x: e.clientX,
                                        y: e.clientY,
                                        slotX: pos.x,
                                        slotY: pos.y,
                                      });
                                    }}
                                    className={`absolute border bg-blue-600/35 border-blue-400 hover:bg-blue-500/45 hover:border-blue-300 rounded-lg flex flex-col items-center justify-center cursor-move shadow-md transition-colors ${
                                      draggingSlot === idx
                                        ? "border-yellow-400 bg-yellow-500/35 ring-2 ring-yellow-400/20"
                                        : ""
                                    }`}
                                  >
                                    <span className="text-[10px] font-extrabold text-white drop-shadow-md">
                                      FOTO {idx + 1}
                                    </span>
                                    <span className="text-[8px] text-blue-200 font-mono scale-90 drop-shadow-md">
                                      {Math.round(pos.width)}x
                                      {Math.round(pos.height)}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                            <p className="text-[9px] text-zinc-500 mt-2 text-center">
                              Tekan & geser kotak slot biru di atas untuk
                              menyusun letak foto.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">
                      Email Template Message Text
                    </label>
                    <textarea
                      placeholder="Masukkan kata sambutan terima kasih atas kehadiran mereka..."
                      value={editingEvent.emailTemplate || ""}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          emailTemplate: e.target.value,
                        })
                      }
                      className="w-full h-16 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEventFormOpen(false)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-lg cursor-pointer"
                    >
                      Simpan Preset
                    </button>
                  </div>
                </form>
              )}

              {/* Event Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-5 bg-zinc-900 border border-zinc-850 rounded-2xl flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-mono bg-zinc-950 px-2 py-0.5 border border-zinc-800 text-blue-400 rounded-md">
                          ID: {evt.id}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              setEditingEvent({
                                ...evt,
                                layoutPositions:
                                  evt.layoutPositions ||
                                  getDefaultPositions(
                                    evt.photoCount || 4,
                                    evt.layoutType || "strip",
                                  ),
                              });
                              setEventFormOpen(true);
                            }}
                            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(evt.id)}
                            className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-md transition"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-white tracking-tight">
                        {evt.name}
                      </h4>
                      <p className="text-[10px] text-zinc-500">
                        Logo: &quot;{evt.logo}&quot;
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-850 grid grid-cols-3 gap-2 text-center text-[10px] text-zinc-400">
                      <div>
                        <span className="text-[8px] text-zinc-500 block uppercase">
                          COUNTDOWN
                        </span>
                        <span className="font-bold text-zinc-200">
                          {evt.countdown}s
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-zinc-500 block uppercase">
                          CAPTURES
                        </span>
                        <span className="font-bold text-zinc-200">
                          {evt.photoCount} foto
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] text-zinc-500 block uppercase">
                          LAYOUT
                        </span>
                        <span className="font-bold text-blue-400 capitalize">
                          {evt.layoutType}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: FRAME TEMPLATES */}
          {activeTab === "templates" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-2xl border border-zinc-900">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    Visual Frame Templates
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Atur tata letak foto, teks event, sponsor, dan QR code
                    sekali saja untuk seluruh pengunjung stan.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setDesignerTemplate(null);
                    setIsDesignerOpen(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-white shadow-lg shadow-blue-600/15 hover:shadow-blue-600/25 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Buat Template Baru
                </button>
              </div>

              {templates.length === 0 ? (
                <div className="p-16 text-center bg-zinc-900/50 border border-zinc-850 rounded-2xl text-zinc-500 text-xs flex flex-col items-center justify-center space-y-3">
                  <div className="p-3.5 bg-zinc-950 rounded-full border border-zinc-850 text-zinc-600">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <span>
                    Belum ada template kustom yang dibuat. Klik tombol di atas
                    untuk masuk ke Frame Designer!
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {templates.map((tpl) => {
                    const photoSlots =
                      tpl.elements?.filter((el: any) => el.type === "photo") ||
                      [];
                    const otherElements =
                      tpl.elements?.filter((el: any) => el.type !== "photo") ||
                      [];

                    return (
                      <div
                        key={tpl.id}
                        className="p-5 bg-zinc-900 border border-zinc-850 rounded-2xl flex flex-col justify-between space-y-4 hover:border-zinc-700/60 transition-all group"
                      >
                        <div className="space-y-3.5">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-mono bg-zinc-950 px-2 py-0.5 border border-zinc-800 text-blue-400 rounded-md">
                              ID: {tpl.id}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                tpl.status === "active"
                                  ? "bg-green-600/10 text-green-400 border border-green-500/20"
                                  : "bg-yellow-600/10 text-yellow-400 border border-yellow-500/20"
                              }`}
                            >
                              {tpl.status === "active"
                                ? "ACTIVE / LIVE"
                                : "DRAFT"}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                              {tpl.name}
                            </h4>
                            <p className="text-[10px] text-zinc-500 mt-0.5">
                              Kategori:{" "}
                              <span className="text-zinc-300 font-semibold">
                                {tpl.category}
                              </span>
                            </p>
                          </div>

                          {/* Live Miniature Mock Canvas */}
                          <div className="h-44 w-full bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden flex items-center justify-center p-2 relative shadow-inner group-hover:border-zinc-700/80 transition-colors">
                            <div
                              style={{
                                aspectRatio: `${tpl.canvasWidth || 1200} / ${tpl.canvasHeight || 800}`,
                                backgroundColor: "#121215",
                              }}
                              className="relative h-full max-w-full shadow-2xl overflow-hidden rounded-md border border-zinc-850 flex-shrink-0"
                            >
                              {/* Actual designed Background Image */}
                              {tpl.backgroundImage ? (
                                <img
                                  src={tpl.backgroundImage}
                                  className="absolute inset-0 w-full h-full object-cover opacity-100"
                                  alt="bg"
                                />
                              ) : (
                                <div className="absolute inset-0 bg-blue-600/5 opacity-20" />
                              )}

                              {/* Render miniatur elements */}
                              <div className="absolute inset-0 pointer-events-none select-none z-20">
                                {tpl.elements?.map((el: any) => {
                                  if (el.hidden) return null;
                                  return (
                                    <div
                                      key={el.id}
                                      style={{
                                        left: `${el.x}%`,
                                        top: `${el.y}%`,
                                        width: `${el.width}%`,
                                        height: `${el.height}%`,
                                        borderRadius: `${Math.max(1, (el.borderRadius || 0) / 4)}px`,
                                        transform: `rotate(${el.rotation || 0}deg)`,
                                      }}
                                      className={`absolute flex flex-col items-center justify-center text-[5px] font-extrabold ${
                                        el.type === "photo"
                                          ? "bg-blue-600/30 border border-blue-400/50 text-blue-200 shadow-sm"
                                          : el.type === "qr"
                                            ? "bg-white text-zinc-900 border border-zinc-400 shadow-md p-[1px]"
                                            : el.type === "logo"
                                              ? "bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 p-0.5"
                                              : "bg-zinc-900/90 text-zinc-300 border border-zinc-750"
                                      }`}
                                    >
                                      {el.type === "photo" && (
                                        <div className="flex flex-col items-center justify-center scale-75 sm:scale-90 origin-center text-center">
                                          <ImageIcon className="w-2.5 h-2.5 text-blue-400 mb-0.5" />
                                          <span className="text-[4px] font-extrabold tracking-tight text-white">
                                            {el.name.replace("PHOTO_", "")}
                                          </span>
                                        </div>
                                      )}

                                      {el.type === "qr" && (
                                        <QrCode className="w-full h-full text-zinc-900" />
                                      )}

                                      {el.type === "logo" && (
                                        <div className="flex flex-col items-center justify-center scale-75 origin-center text-center">
                                          <FileText className="w-2 h-2 text-emerald-400 mb-0.5" />
                                          <span className="text-[3px] text-zinc-300 truncate max-w-full leading-none">
                                            {el.name}
                                          </span>
                                        </div>
                                      )}

                                      {el.type === "text" && (
                                        <span
                                          style={{
                                            fontSize: `${Math.max(3, (el.fontSize || 14) / 10)}px`,
                                            color: el.fontColor || "#ffffff",
                                          }}
                                          className="font-sans font-bold leading-none break-all drop-shadow truncate max-w-full px-0.5 text-center"
                                        >
                                          {el.textValue || el.name}
                                        </span>
                                      )}

                                      {el.type === "meta" && (
                                        <span
                                          style={{
                                            fontSize: `${Math.max(3, (el.fontSize || 14) / 10)}px`,
                                            color: el.fontColor || "#9ca3af",
                                          }}
                                          className="font-mono font-extrabold tracking-tight leading-none drop-shadow truncate max-w-full px-0.5 text-center"
                                        >
                                          {el.name === "Tanggal"
                                            ? "DD-MM"
                                            : "12:00"}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Frame PNG Overlay placed exactly on top with full cover matching canvas */}
                              {tpl.framePng && (
                                <img
                                  src={tpl.framePng}
                                  className="absolute inset-0 w-full h-full object-cover z-30 pointer-events-none opacity-100"
                                  alt="overlay"
                                />
                              )}
                            </div>

                            {/* Corner size badge */}
                            <div className="absolute bottom-3 right-3 z-30">
                              <span className="inline-block text-[8px] font-mono font-bold bg-zinc-950/90 text-zinc-400 border border-zinc-800 px-1.5 py-0.5 rounded leading-none shadow-md">
                                {tpl.canvasWidth}x{tpl.canvasHeight} px
                              </span>
                            </div>
                          </div>

                          {/* Elements checklist badges */}
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">
                              Daftar Elemen Layar
                            </span>
                            <div className="flex flex-wrap gap-1">
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-950/40 border border-blue-900/30 text-blue-300 flex items-center gap-1">
                                <ImageIcon className="w-2.5 h-2.5 text-blue-400" />
                                {photoSlots.length} Kamera Slot
                              </span>
                              {otherElements.map((el: any) => (
                                <span
                                  key={el.id}
                                  className="text-[9px] px-2 py-0.5 rounded bg-zinc-950 border border-zinc-850 text-zinc-400 flex items-center gap-1"
                                >
                                  {el.type === "text" && (
                                    <Type className="w-2.5 h-2.5 text-purple-400" />
                                  )}
                                  {el.type === "qr" && (
                                    <QrCode className="w-2.5 h-2.5 text-orange-400" />
                                  )}
                                  {el.type === "logo" && (
                                    <FileText className="w-2.5 h-2.5 text-emerald-400" />
                                  )}
                                  {el.type === "meta" && (
                                    <Clock className="w-2.5 h-2.5 text-rose-400" />
                                  )}
                                  {el.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-zinc-850/60 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-400">
                            Ukuran Cetak:{" "}
                            <span className="font-mono text-blue-400 bg-blue-950/20 px-1.5 py-0.5 rounded border border-blue-900/10">
                              {tpl.printSize}
                            </span>
                          </span>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setDesignerTemplate(tpl);
                                setIsDesignerOpen(true);
                              }}
                              className="px-3 py-1.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Edit Tata Letak"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Edit
                            </button>

                            <button
                              onClick={() => {
                                requestConfirm(
                                  "Duplikasi Template?",
                                  `Apakah Anda yakin ingin menduplikasi template "${tpl.name}"?`,
                                  async () => {
                                    const dup: Partial<FrameTemplate> = {
                                      name: `${tpl.name} (Copy)`,
                                      category: tpl.category,
                                      canvasWidth: tpl.canvasWidth,
                                      canvasHeight: tpl.canvasHeight,
                                      photoCount: tpl.photoCount,
                                      elements: tpl.elements,
                                      backgroundImage: tpl.backgroundImage,
                                      framePng: tpl.framePng,
                                      printSize: tpl.printSize,
                                      status: "draft",
                                    };
                                    await saveTemplate(dup);
                                    showToast(
                                      "Template berhasil diduplikasi sebagai draft!",
                                    );
                                  },
                                  { confirmText: "Duplikasi", isDanger: false },
                                );
                              }}
                              className="p-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white border border-zinc-700/50 rounded-lg cursor-pointer"
                              title="Duplikasi"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                requestConfirm(
                                  "Hapus Template?",
                                  `Apakah Anda yakin ingin menghapus template "${tpl.name}" secara permanen?`,
                                  async () => {
                                    const success = await deleteTemplate(
                                      tpl.id,
                                    );
                                    if (success) {
                                      showToast("Template dihapus.");
                                    }
                                  },
                                  { confirmText: "Hapus", isDanger: true },
                                );
                              }}
                              className="p-1.5 bg-red-950/20 hover:bg-red-950 text-red-400 hover:text-red-300 border border-red-900/40 rounded-lg cursor-pointer"
                              title="Hapus"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GALLERY */}
          {activeTab === "gallery" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">
                  Live Event Photo Gallery
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Daftar media layout yang berhasil disimpan. Anda dapat memicu
                  reprint atau menghapus foto.
                </p>
              </div>

              {photos.length === 0 ? (
                <div className="p-12 text-center bg-zinc-900 border border-zinc-850 rounded-2xl text-zinc-500 text-xs">
                  Belum ada foto yang diambil hari ini.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="bg-zinc-900 border border-zinc-850 rounded-2xl overflow-hidden flex flex-col justify-between group shadow-xl"
                    >
                      <div className="relative aspect-[2/3] bg-black">
                        <img
                          src={photo.url}
                          alt="Layout captured"
                          className="w-full h-full object-contain"
                        />
                        {/* Overlay quick hover actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col justify-end p-3 space-y-2">
                          <button
                            onClick={() => handleReprintPhoto(photo.id)}
                            className="w-full py-1.5 bg-emerald-600 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 text-white"
                          >
                            <Printer className="w-3 h-3" /> Reprint Sim
                          </button>
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="w-full py-1.5 bg-red-600 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 text-white"
                          >
                            <Trash className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-zinc-950 text-[10px] text-zinc-500 font-mono space-y-1">
                        <p className="font-bold text-zinc-400 truncate">
                          Event: {photo.eventId}
                        </p>
                        <p>Prints: {photo.printsCount || 0} copies</p>
                        <p>
                          Date: {new Date(photo.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PRINTER MANAGEMENT */}
          {activeTab === "printer" && printer && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">
                  Local Print Service
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Status driver pendeteksi printer fisik local. Melakukan test
                  cetak dan pemantauan level tinta.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Printer Details card */}
                <div className="p-6 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                    Koneksi Hardware
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      {printer.name}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">
                      Koneksi: {printer.connectionType}
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Status Driver:</span>
                      <span
                        className={`font-bold ${printer.status === "Online" ? "text-emerald-400" : "text-amber-500"}`}
                      >
                        ● {printer.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Kertas Tersisa:</span>
                      <span className="font-bold text-white">
                        {printer.paperRemaining} lembar
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Ink/Ribbon Level:</span>
                      <span className="font-bold text-white">
                        {printer.inkLevel}%
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Total Cetak:</span>
                      <span className="font-bold text-zinc-400">
                        {printer.totalPrints} pcs
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calibration Controls */}
                <div className="p-6 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                      Kalibrasi & Refill
                    </span>
                    <p className="text-xs text-zinc-400">
                      Lakukan simulasi pengisian ulang kertas (Dye-Sub 4R / 2x6
                      Strip) dan cartridge ribbon tinta printer.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleCalibratePrinter(true, false)}
                      className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-800 rounded-xl transition"
                    >
                      Isi Ulang Kertas (Refill Paper to 150)
                    </button>
                    <button
                      onClick={() => handleCalibratePrinter(false, true)}
                      className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-800 rounded-xl transition"
                    >
                      Ganti Cartridge Ribbon Tinta (Refill Ink)
                    </button>
                    <button
                      onClick={() => handleCalibratePrinter(true, true)}
                      className="w-full py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-xs font-bold text-emerald-400 border border-emerald-500/20 rounded-xl transition"
                    >
                      Kalibrasi Penuh (Refill Kertas + Tinta)
                    </button>
                  </div>
                </div>

                {/* Print test */}
                <div className="p-6 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                      Cetak Uji Coba
                    </span>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Kirim sinyal &quot;Test Print&quot; warna standar CMYK
                      untuk mendeteksi keselarasan nosel printhead lokal.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      showToast("Memulai test print CMYK...");
                      handleCalibratePrinter(false, false);
                    }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl shadow transition"
                  >
                    Test Print CMYK Align
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CAMERA MANAGEMENT */}
          {activeTab === "camera" && camera && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">
                  DSLR Camera Controller
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Sesuaikan pengaturan exposure, shutter speed, dan ISO kamera
                  DSLR Canon / Sony Anda melalui jaringan lokal.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Dial Controls (8 cols) */}
                <div className="md:col-span-8 p-6 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-6">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                    DSLR Dial exposure
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Shutter Speed Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">
                        Shutter Speed
                      </label>
                      <select
                        value={camera.shutterSpeed}
                        onChange={(e) =>
                          handleUpdateCameraDial("shutterSpeed", e.target.value)
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="1/60">1/60s</option>
                        <option value="1/125">1/125s</option>
                        <option value="1/160">1/160s</option>
                        <option value="1/250">1/250s</option>
                      </select>
                    </div>

                    {/* Aperture Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">
                        Aperture (Diafragma)
                      </label>
                      <select
                        value={camera.aperture}
                        onChange={(e) =>
                          handleUpdateCameraDial("aperture", e.target.value)
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="f/2.8">f/2.8</option>
                        <option value="f/4.0">f/4.0</option>
                        <option value="f/4.5">f/4.5</option>
                        <option value="f/5.6">f/5.6</option>
                        <option value="f/8.0">f/8.0</option>
                      </select>
                    </div>

                    {/* ISO Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">
                        ISO Sensitivity
                      </label>
                      <select
                        value={camera.iso}
                        onChange={(e) =>
                          handleUpdateCameraDial("iso", e.target.value)
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="100">ISO 100</option>
                        <option value="200">ISO 200</option>
                        <option value="400">ISO 400</option>
                        <option value="800">ISO 800</option>
                        <option value="1600">ISO 1600</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                    <h5 className="text-xs font-bold text-zinc-400">
                      INFORMASI LENSA
                    </h5>
                    <p className="text-[11px] text-zinc-500">
                      Lensa Terdeteksi:{" "}
                      <span className="text-zinc-300 font-mono font-bold">
                        {camera.lens}
                      </span>
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Resolusi Maksimal Sensor:{" "}
                      <span className="text-zinc-300 font-mono font-bold">
                        {camera.resolution}
                      </span>
                    </p>
                  </div>
                </div>

                {/* DSLR Status Dials (4 cols) */}
                <div className="md:col-span-4 p-6 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                      Status DSLR Body
                    </span>

                    <div className="space-y-3 bg-zinc-950 p-4 border border-zinc-800 rounded-xl">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Body Status:</span>
                        <span className="text-blue-400 font-bold">
                          ● {camera.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Battery Level:</span>
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <Battery className="w-4 h-4 text-emerald-400" />{" "}
                          {camera.batteryLevel}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCameraTestCapture}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl shadow transition"
                  >
                    Minta Trigger Shutter DSLR (Test Capture)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">
                  Sistem Activity Logs & Antrean
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Log sistem lengkap mendeteksi koneksi printer, email SMTP log,
                  dan trigger shutter kamera.
                </p>
              </div>

              <div className="p-4 bg-zinc-900 border border-zinc-850 rounded-2xl overflow-x-auto">
                <table className="w-full text-xs text-left text-zinc-400">
                  <thead className="text-[10px] uppercase font-mono border-b border-zinc-800 text-zinc-500">
                    <tr>
                      <th className="pb-2">WAKTU (LOG)</th>
                      <th className="pb-2">KATEGORI</th>
                      <th className="pb-2">PESAN SYSTEM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {systemLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-950/40">
                        <td className="py-2.5 font-mono text-zinc-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] uppercase ${
                              log.type === "system"
                                ? "bg-zinc-800 text-zinc-400"
                                : log.type === "camera"
                                  ? "bg-blue-950 text-blue-400"
                                  : log.type === "printer"
                                    ? "bg-emerald-950 text-emerald-400"
                                    : log.type === "gallery"
                                      ? "bg-purple-950 text-purple-400"
                                      : "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {log.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-zinc-300">{log.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS */}
          {activeTab === "settings" && settings && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-white">
                  Sistem Settings & SMTP
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Konfigurasi SMTP server untuk email, skema durasi auto-delete,
                  dan bahasa.
                </p>
              </div>

              <form
                onSubmit={handleSaveSystemSettings}
                className="p-6 bg-zinc-900 border border-zinc-850 rounded-2xl space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* SMTP Relay Host */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">
                      SMTP Host Server
                    </label>
                    <input
                      type="text"
                      value={settings.smtpHost}
                      onChange={(e) =>
                        setSettings({ ...settings, smtpHost: e.target.value })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  {/* SMTP Credentials user */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={settings.smtpUser}
                      onChange={(e) =>
                        setSettings({ ...settings, smtpUser: e.target.value })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  {/* Auto delete duration */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">
                      Auto Delete Kadaluarsa Data (Hari)
                    </label>
                    <input
                      type="number"
                      value={settings.autoDeleteDays}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          autoDeleteDays: Number(e.target.value),
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  {/* Language choice */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">
                      Bahasa Utama Kiosk
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          language: e.target.value as any,
                        })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English (US)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl transition cursor-pointer"
                  >
                    Simpan Perubahan Setelan
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {isDesignerOpen && (
        <FrameDesigner
          initialTemplate={designerTemplate}
          onClose={() => {
            setIsDesignerOpen(false);
            setDesignerTemplate(null);
            fetchInitialData();
          }}
        />
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5 shadow-2xl relative overflow-hidden">
            <div
              className={`absolute top-0 left-0 right-0 h-1 ${confirmModal.isDanger ? "bg-red-500" : "bg-blue-500"}`}
            />

            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                {confirmModal.isDanger ? (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                )}
                {confirmModal.title}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
              >
                {confirmModal.cancelText || "Batal"}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                }}
                className={`px-4 py-2 font-bold text-[11px] rounded-lg transition-colors cursor-pointer text-white ${
                  confirmModal.isDanger
                    ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/15"
                    : "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/15"
                }`}
              >
                {confirmModal.confirmText || "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
