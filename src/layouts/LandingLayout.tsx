import React, { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { ArrowRight, Menu, X, Shield, Sparkles } from "lucide-react";
import { useApp } from "../contexts/AppContext";

export default function LandingLayout() {
  const { activeEvent } = useApp() as any;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[#0038FF] text-white font-sans overflow-x-hidden selection:bg-[#bcff00] selection:text-black flex flex-col justify-between">
      {/* Blueprint Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15] z-0"
        style={{
          backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      <main className="w-full flex-1 flex flex-col relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
