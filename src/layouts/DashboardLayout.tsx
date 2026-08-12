import React from "react";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#0038FF] text-white font-sans flex flex-col justify-stretch relative overflow-x-hidden selection:bg-[#bcff00] selection:text-black">
      {/* Blueprint Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15] z-0"
        style={{
          backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative z-10 flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}
