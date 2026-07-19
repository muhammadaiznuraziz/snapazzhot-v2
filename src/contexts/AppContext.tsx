import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AppEvent, PhotoRecord, FrameTemplate } from "../types";

interface AppContextType {
  events: AppEvent[];
  photos: PhotoRecord[];
  templates: FrameTemplate[];
  activeEvent: AppEvent | null;
  setActiveEvent: (event: AppEvent | null) => void;
  fetchInitialData: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  saveTemplate: (template: Partial<FrameTemplate>) => Promise<FrameTemplate | null>;
  deleteTemplate: (id: string) => Promise<boolean>;
  loading: boolean;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [templates, setTemplates] = useState<FrameTemplate[]>([]);
  const [activeEvent, setActiveEvent] = useState<AppEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      const d = await res.json();
      if (d.success) {
        setTemplates(d.data);
      }
    } catch (err) {
      console.error("Failed to fetch templates", err);
    }
  };

  const saveTemplate = async (template: Partial<FrameTemplate>) => {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template)
      });
      const d = await res.json();
      if (d.success) {
        await fetchTemplates();
        return d.data as FrameTemplate;
      }
    } catch (err) {
      console.error("Failed to save template", err);
    }
    return null;
  };

  const deleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "DELETE"
      });
      const d = await res.json();
      if (d.success) {
        await fetchTemplates();
        return true;
      }
    } catch (err) {
      console.error("Failed to delete template", err);
    }
    return false;
  };

  const fetchInitialData = async () => {
    const fetchJson = async (url: string) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`${url} returned ${response.status}`);
        return await response.json();
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    try {
      // Each resource is optional for startup. A failed gallery/template request
      // must not prevent the booth from receiving its event configuration.
      const [templatesResult, eventsResult, photosResult] = await Promise.allSettled([
        fetchJson("/api/templates"),
        fetchJson("/api/events"),
        fetchJson("/api/gallery"),
      ]);

      if (templatesResult.status === "fulfilled" && templatesResult.value.success) {
        setTemplates(templatesResult.value.data);
      } else if (templatesResult.status === "rejected") {
        console.error("Failed to load templates", templatesResult.reason);
      }

      if (eventsResult.status === "fulfilled" && eventsResult.value.success) {
        const loadedEvents = eventsResult.value.data as AppEvent[];
        setEvents(loadedEvents);
        // Set first event as active if none is currently selected.
        if (loadedEvents.length > 0 && !activeEvent) {
          const storedEventId = localStorage.getItem("snapazzhot_active_event_id");
          const found = loadedEvents.find((event) => event.id === storedEventId);
          setActiveEvent(found || loadedEvents[0]);
        }
      } else if (eventsResult.status === "rejected") {
        console.error("Failed to load events", eventsResult.reason);
      }

      if (photosResult.status === "fulfilled" && photosResult.value.success) {
        setPhotos(photosResult.value.data);
      } else if (photosResult.status === "rejected") {
        console.error("Failed to load gallery", photosResult.reason);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSetActiveEvent = (event: AppEvent | null) => {
    setActiveEvent(event);
    if (event) {
      localStorage.setItem("snapazzhot_active_event_id", event.id);
    } else {
      localStorage.removeItem("snapazzhot_active_event_id");
    }
  };

  return (
    <AppContext.Provider
      value={{
        events,
        photos,
        templates,
        activeEvent,
        setActiveEvent: handleSetActiveEvent,
        fetchInitialData,
        fetchTemplates,
        saveTemplate,
        deleteTemplate,
        loading,
        showToast,
      }}
    >
      {children}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-white/10 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {toastMessage}
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
