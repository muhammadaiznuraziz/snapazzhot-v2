import React from "react";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import AppRoutes from "./routes";

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="min-h-screen bg-[#0038FF] text-white font-sans selection:bg-[#bcff00] selection:text-black">
          <AppRoutes />
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
