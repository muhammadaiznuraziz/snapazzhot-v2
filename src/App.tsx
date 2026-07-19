import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import AppRoutes from "./routes";

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] font-sans selection:bg-[#1a1a1a] selection:text-white">
          <AppRoutes />
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
