// Deprecated supabase library removed. Use supabaseClient.ts instead.

const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!url || !anonKey) {
  // Keep module side-effects minimal; fail fast on first usage.
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env vars missing: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY",
  );
}

export const supabase = createClient(url!, anonKey!);
