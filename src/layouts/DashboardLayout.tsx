import React from "react";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] font-sans flex flex-col justify-stretch selection:bg-[#1a1a1a] selection:text-white">
      <Outlet />
    </div>
  );
}
