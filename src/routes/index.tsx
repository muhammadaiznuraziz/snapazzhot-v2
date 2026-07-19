import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import LandingLayout from "../layouts/LandingLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import BoothLayout from "../layouts/BoothLayout";

// Landing Pages
import LandingIndex from "../pages/Landing/index";
import Gallery from "../pages/Landing/Gallery";
import DownloadPortal from "../pages/Landing/Download";

// Booth Pages
import BoothIndex from "../pages/Booth/index";
import BoothCamera from "../pages/Booth/Camera";
import BoothEditor from "../pages/Booth/Editor";
import BoothPrint from "../pages/Booth/Print";
import BoothSuccess from "../pages/Booth/Success";

// Kiosk Page (unattended standalone mode)
import KioskIndex from "../pages/Kiosk/index";

// Dashboard Pages
import AdminDashboard from "../pages/Dashboard/index";

// Loading Fallback Component
const Loader = () => (
  <div className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] flex items-center justify-center font-mono text-[10px] uppercase tracking-widest animate-pulse">
    Memuat halaman snapazzhot...
  </div>
);

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* / redirects to /landing */}
        <Route path="/" element={<Navigate to="/landing" replace />} />

        {/* Public Visitor Routes */}
        <Route element={<LandingLayout />}>
          <Route path="/landing" element={<LandingIndex
            events={[]}
            activeEvent={null}
            setActiveEvent={() => {}}
            onStartKiosk={() => {}}
            onOpenAdmin={() => {}}
            onOpenGallery={() => {}}
          />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/download/:id" element={<DownloadPortal />} />
        </Route>

        {/* Dedicated Photo Booth Wizard Flow */}
        <Route path="/booth" element={<BoothLayout />}>
          <Route index element={<BoothIndex />} />
          <Route path="camera" element={<BoothCamera />} />
          <Route path="editor" element={<BoothEditor />} />
          <Route path="print" element={<BoothPrint />} />
          <Route path="success" element={<BoothSuccess />} />
        </Route>

        {/* Standalone Kiosk Mode */}
        <Route path="/kiosk" element={<KioskIndex />} />

        {/* Protected Admin & Operator Dashboard Console */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminDashboard />} />
          <Route path="events" element={<AdminDashboard />} />
          <Route path="templates" element={<AdminDashboard />} />
          <Route path="gallery" element={<AdminDashboard />} />
          <Route path="printer" element={<AdminDashboard />} />
          <Route path="camera" element={<AdminDashboard />} />
          <Route path="logs" element={<AdminDashboard />} />
          <Route path="settings" element={<AdminDashboard />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </Suspense>
  );
}
