import React, { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { ArrowRight, Menu, X, Shield, Sparkles } from "lucide-react";
import { useApp } from "../contexts/AppContext";

export default function LandingLayout() {
  const { activeEvent } = useApp() as any;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    // PRO UPGRADE: Ubah background dasar ke hitam/biru gelap agar aman untuk Kiosk, dan hilangkan overflow keliru
    <div className="relative min-h-screen bg-[#004ce5] text-[#1a1a1a] font-sans overflow-x-hidden selection:bg-[#1a1a1a] selection:text-white flex flex-col justify-between">
      {/* 
        CORRECTION: 
        Hapus `px-4 sm:px-6 md:px-8 py-8` dan `justify-center`. 
        Elemen main harus benar-benar edge-to-edge (0 padding) agar halaman Gallery biru bisa memenuhi seluruh layar monitor kiosk.
      */}
      <main className="w-full flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
