// src/lib/supabaseClient.ts

import { createClient } from "@supabase/supabase-js";

// Tambahkan trim() secara aman, pastikan sintaks awal import.meta.env persis agar Vite bisa mem-parsingnya.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const rawUrl = url ? url.trim() : undefined;
const rawKey = key ? key.trim() : undefined;

// Gunakan fallback agar module ini tidak crash dan menyebabkan layar putih (white screen).
// UI akan ditangani oleh guardrail di dalam komponen (misal: Download.tsx)
const supabaseUrl = rawUrl || "https://placeholder-project.supabase.co";
const supabaseAnonKey =
  rawKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyKey";
console.log("=== ENV DEBUG ===");
console.log("MODE:", import.meta.env.MODE);
console.log("URL:", url);
console.log("KEY EXISTS:", !!key);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;
