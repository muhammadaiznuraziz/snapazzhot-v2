# Refactor Express → Frontend Vite + Supabase (tanpa server.ts)

## Steps

1. Update `package.json` scripts & remove dependencies: `express`, `@types/express`, `esbuild`.
2. Delete `server.ts` (backend Express) and ensure no scripts reference it.
3. Create `src/lib/supabase.ts` using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
4. Refactor `src/contexts/AppContext.tsx`:
   - Replace `/api/templates`, `/api/events`, `/api/gallery` with Supabase queries.
   - Replace template CRUD with Supabase upsert/delete.
5. Refactor Gallery/Download/Dashboard/Booth pages:
   - Replace all `fetch('/api/...')` usages with Supabase direct access:
     - `events`, `templates`, `photos` (gallery)
     - like/update privacy
     - upload pipeline via Supabase Storage + insert into `photos`
     - settings/logs/printer/camera/email/analytics: use Supabase tables (or safe client-side fallbacks).
6. Ensure no `/api/*` strings remain in `src/`.
7. Run `npm run dev` and `npm run build`.
8. Verify deploy behavior: no `GET /api/events|/api/templates|/api/gallery` 404.
