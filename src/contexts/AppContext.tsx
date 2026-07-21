import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { AppEvent, PhotoRecord, FrameTemplate } from "../types";
import { supabase } from "../lib/supabaseClient";

// Specific column selects to avoid fetching unnecessary columns
const TEMPLATES_SELECT =
  "id, name, thumbnail, category, preview, canvas_width, canvas_height, photo_count, elements, frame_png, background_image, print_size, status, created_by, created_at, updated_at";
const EVENTS_SELECT =
  "id, name, logo, frame_id, countdown, photo_count, layout_type, theme_color, qr_expired_minutes, email_template, background_image, layout_positions, template_id, enable_video, video_quality, enable_audio, enable_gif, gif_resolution, gif_delay, mirror_enabled";
const PHOTOS_SELECT =
  "id, url, type, event_id, timestamp, views, prints_count, is_public, username, template_name, like_count, mirror_enabled, meta";

// Helper mappers to map snake_case db columns to camelCase TS interfaces
const mapTemplateFromDB = (db: any): FrameTemplate => ({
  id: db.id,
  name: db.name,
  thumbnail: db.thumbnail,
  category: db.category,
  preview: db.preview || undefined,
  canvasWidth: db.canvas_width ?? 600,
  canvasHeight: db.canvas_height ?? 1800,
  photoCount: db.photo_count ?? 4,
  elements: db.elements || [],
  framePng: db.frame_png || undefined,
  backgroundImage: db.background_image || undefined,
  printSize: db.print_size ?? "Strips",
  status: db.status === "draft" ? "draft" : "active",
  createdBy: db.created_by || undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

const mapTemplateToDB = (t: Partial<FrameTemplate>) => {
  const db: any = {};
  if (t.id !== undefined) db.id = t.id;
  if (t.name !== undefined) db.name = t.name;
  if (t.thumbnail !== undefined) db.thumbnail = t.thumbnail;
  if (t.category !== undefined) db.category = t.category;
  if (t.preview !== undefined) db.preview = t.preview;
  if (t.canvasWidth !== undefined) db.canvas_width = t.canvasWidth;
  if (t.canvasHeight !== undefined) db.canvas_height = t.canvasHeight;
  if (t.photoCount !== undefined) db.photo_count = t.photoCount;
  if (t.elements !== undefined) db.elements = t.elements;
  if (t.framePng !== undefined) db.frame_png = t.framePng;
  if (t.backgroundImage !== undefined) db.background_image = t.backgroundImage;
  if (t.printSize !== undefined) db.print_size = t.printSize;
  if (t.status !== undefined) db.status = t.status;
  if (t.createdBy !== undefined) db.created_by = t.createdBy;
  db.updated_at = new Date().toISOString();
  return db;
};

const mapEventFromDB = (db: any): AppEvent => ({
  id: db.id,
  name: db.name,
  logo: db.logo,
  frameId: db.frame_id || "",
  countdown: db.countdown ?? 5,
  photoCount: db.photo_count ?? 4,
  layoutType: db.layout_type || "strip",
  themeColor: db.theme_color || "#db2777",
  qrExpiredMinutes: db.qr_expired_minutes ?? 60,
  emailTemplate: db.email_template || "",
  backgroundImage: db.background_image || undefined,
  layoutPositions: db.layout_positions || [],
  templateId: db.template_id || undefined,
  enableVideo: db.enable_video ?? false,
  videoQuality: db.video_quality || "medium",
  enableAudio: db.enable_audio ?? false,
  enableGif: db.enable_gif ?? false,
  gifResolution: db.gif_resolution ?? 360,
  gifDelay: db.gif_delay ?? 500,
  mirrorEnabled: db.mirror_enabled ?? true,
});

const mapPhotoFromDB = (db: any): PhotoRecord => ({
  id: db.id,
  url: db.url,
  type: db.type || "photo",
  eventId: db.event_id || "",
  timestamp: db.timestamp,
  views: db.views ?? 0,
  printsCount: db.prints_count ?? 0,
  isPublic: db.is_public ?? false,
  username: db.username || "Guest",
  templateName: db.template_name || undefined,
  likeCount: db.like_count ?? 0,
  mirror_enabled: db.mirror_enabled ?? false,
  meta: db.meta || {},
});

interface AppContextType {
  events: AppEvent[];
  photos: PhotoRecord[];
  templates: FrameTemplate[];
  activeEvent: AppEvent | null;
  setActiveEvent: (event: AppEvent | null) => void;
  fetchInitialData: () => Promise<void>;
  fetchTemplates: () => Promise<void>;
  saveTemplate: (
    template: Partial<FrameTemplate>,
  ) => Promise<FrameTemplate | null>;
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

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select(TEMPLATES_SELECT)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setTemplates(data.map(mapTemplateFromDB));
      }
    } catch (err) {
      console.error("Failed to fetch templates", err);
    }
  }, []);

  const saveTemplate = async (template: Partial<FrameTemplate>) => {
    try {
      const dbData = mapTemplateToDB(template);
      const { data, error } = await supabase
        .from("templates")
        .upsert(dbData)
        .select(TEMPLATES_SELECT)
        .single();

      if (error) throw error;
      if (data) {
        // Optimistic local update: update local state directly instead of re-fetching all templates
        const mapped = mapTemplateFromDB(data);
        setTemplates((prev) => {
          const exists = prev.findIndex((t) => t.id === mapped.id);
          if (exists >= 0) {
            const updated = [...prev];
            updated[exists] = mapped;
            return updated;
          }
          return [mapped, ...prev];
        });
        return mapped;
      }
    } catch (err) {
      console.error("Failed to save template", err);
    }
    return null;
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase.from("templates").delete().eq("id", id);

      if (error) throw error;
      // Optimistic local update: remove from local state instead of re-fetching all templates
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      return true;
    } catch (err) {
      console.error("Failed to delete template", err);
    }
    return false;
  };

  // Track if initial fetch has been done to prevent re-fetch on re-mounts
  const initialFetchDoneRef = useRef(false);
  // Allow manual refresh to bypass initial fetch guard
  const manualRefreshRequestedRef = useRef(false);

  const fetchInitialData = useCallback(async (bypassCache = false) => {
    // Skip if already fetched (prevents re-fetch on re-mounts / StrictMode double-fire)
    // unless bypassCache is explicitly true (manual refresh from Dashboard, etc.)
    if (initialFetchDoneRef.current && !bypassCache) return;

    setLoading(true);
    try {
      const [templatesRes, eventsRes, photosRes] = await Promise.allSettled([
        supabase
          .from("templates")
          .select(TEMPLATES_SELECT)
          .order("created_at", { ascending: false }),
        supabase.from("events").select(EVENTS_SELECT),
        supabase
          .from("photos")
          .select(PHOTOS_SELECT)
          .order("timestamp", { ascending: false }),
      ]);

      if (
        templatesRes.status === "fulfilled" &&
        !templatesRes.value.error &&
        templatesRes.value.data
      ) {
        setTemplates(templatesRes.value.data.map(mapTemplateFromDB));
      } else {
        const error =
          templatesRes.status === "fulfilled"
            ? templatesRes.value.error
            : templatesRes.reason;
        console.error("Failed to load templates", error);
      }

      if (
        eventsRes.status === "fulfilled" &&
        !eventsRes.value.error &&
        eventsRes.value.data
      ) {
        const loadedEvents = eventsRes.value.data.map(mapEventFromDB);
        setEvents(loadedEvents);

        // Set first event as active if none is currently selected.
        if (loadedEvents.length > 0 && !activeEvent) {
          const storedEventId = localStorage.getItem(
            "snapazzhot_active_event_id",
          );
          const found = loadedEvents.find(
            (event) => event.id === storedEventId,
          );
          setActiveEvent(found || loadedEvents[0]);
        }
      } else {
        const error =
          eventsRes.status === "fulfilled"
            ? eventsRes.value.error
            : eventsRes.reason;
        console.error("Failed to load events", error);
      }

      if (
        photosRes.status === "fulfilled" &&
        !photosRes.value.error &&
        photosRes.value.data
      ) {
        setPhotos(photosRes.value.data.map(mapPhotoFromDB));
      } else {
        const error =
          photosRes.status === "fulfilled"
            ? photosRes.value.error
            : photosRes.reason;
        console.error("Failed to load gallery", error);
      }

      initialFetchDoneRef.current = true;
    } finally {
      setLoading(false);
    }
  }, []); // Stable reference - only runs once

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

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
