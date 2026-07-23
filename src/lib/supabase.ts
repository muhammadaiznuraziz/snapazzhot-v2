// Deprecated supabase library removed. Use supabaseClient.ts instead.
import { createClient } from "@supabase/supabase-js";

const _url = import.meta.env.VITE_SUPABASE_URL;
const _key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const url = _url ? _url.trim() : undefined;
const anonKey = _key ? _key.trim() : undefined;

if (!url || !anonKey) {
  // Keep module side-effects minimal; fail fast on first usage.
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env vars missing: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY",
  );
}

const safeUrl = url || "https://placeholder-project.supabase.co";
const safeKey = anonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyKey";

export const supabase = createClient(safeUrl, safeKey);
