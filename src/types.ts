export interface AppEvent {
  id: string;
  name: string;
  logo: string;
  frameId: string; // wedding-classic, grad-gold, corp-minimal, retro-fun, birthday-neon, custom, or templateId
  countdown: number; // seconds
  photoCount: number; // 1, 2, 4, 6, 9
  layoutType: 'strip' | 'grid' | 'single';
  themeColor: string;
  qrExpiredMinutes: number;
  emailTemplate: string;
  backgroundImage?: string;
  layoutPositions?: Array<{ x: number; y: number; width: number; height: number }>;
  templateId?: string; // Optional reference to custom template
  enableVideo?: boolean;
  videoQuality?: 'low' | 'medium' | 'high';
  enableAudio?: boolean;
  enableGif?: boolean;
  gifResolution?: number;
  gifDelay?: number;
  mirrorEnabled?: boolean;
}

export interface FrameElement {
  id: string;
  type: 'photo' | 'logo' | 'qr' | 'text' | 'decor' | 'meta'; // meta: tanggal, jam, nomor foto, dll
  name: string; // PHOTO_1, Logo, QR Code, Event Name, Sponsor, Watermark, Tanggal, Jam, Nomor Foto, Text Bebas
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number; // percentage
  height: number; // percentage
  rotation: number; // 0 to 360 degrees
  borderRadius: number; // px
  opacity: number; // 0 to 100
  cropMode?: 'cover' | 'contain' | 'fill';
  objectFit?: 'cover' | 'contain' | 'fill';
  zIndex: number;
  locked?: boolean;
  hidden?: boolean;
  textValue?: string;
  fontSize?: number;
  fontColor?: string;
  renderOnTop?: boolean;
}

export interface FrameTemplate {
  id: string;
  name: string;
  thumbnail: string;
  category: string;
  preview?: string;
  canvasWidth: number; // e.g. 600 or 1200
  canvasHeight: number; // e.g. 1800 or 900
  photoCount: number;
  elements: FrameElement[];
  framePng?: string; // high-res PNG frame overlay base64 or URL
  backgroundImage?: string; // background image base64 or URL
  printSize: string; // "4R" | "Strips" | "6R"
  status: 'active' | 'draft';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoRecord {
  id: string;
  url: string;
  type: 'photo' | 'gif' | 'video';
  eventId: string;
  timestamp: string;
  views: number;
  printsCount: number;
  isPublic?: boolean;
  username?: string;
  templateName?: string;
  likeCount?: number;
  mirror_enabled?: boolean;
  meta?: {
    filterApplied?: string;
    stickersCount?: number;
    kioskMode?: boolean;
    browserInfo?: string;
    gifUrl?: string;
    videoUrl?: string;
    videoSize?: string;
    gifSize?: string;
    videoDuration?: string;
  };
}

export interface PrinterStatus {
  name: string;
  status: 'Online' | 'Offline' | 'Busy' | 'Paper Empty' | 'Ink Low';
  paperRemaining: number;
  inkLevel: number;
  totalPrints: number;
  connectionType: string;
}

export interface CameraStatus {
  name: string;
  status: 'Connected' | 'Disconnected' | 'Busy';
  batteryLevel: number;
  lens: string;
  shutterSpeed: string;
  aperture: string;
  iso: string;
  resolution: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'system' | 'camera' | 'printer' | 'gallery' | 'event' | 'email' | 'auth';
  message: string;
}

export interface PrintJobLog {
  id: string;
  photoId: string;
  timestamp: string;
  size: string;
  copies: number;
  status: string;
  printerName: string;
}

export interface EmailLog {
  id: string;
  email: string;
  photoId: string;
  downloadUrl: string;
  timestamp: string;
  status: string;
}

export interface SystemSettings {
  theme: 'light' | 'dark';
  logo: string;
  primaryColor: string;
  smtpHost: string;
  smtpUser: string;
  cloudStorageEnabled: boolean;
  autoDeleteDays: number;
  timezone: string;
  language: 'id' | 'en';
}

export interface AnalyticsSummary {
  photosCount: number;
  gifsCount: number;
  videosCount: number;
  totalPrints: number;
  totalEmails: number;
  totalEvents: number;
  visitorCount: number;
}

export interface ChartData {
  name: string;
  Foto: number;
  GIF: number;
  Cetak: number;
}



