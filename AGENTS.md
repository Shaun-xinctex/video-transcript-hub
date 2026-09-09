# Working in this repo

This is a **plain Vite + React single-page app**. It builds to a static `dist/`
folder and is hosted on Vercel — there is no SSR, no server runtime, no edge
functions, and no Cloudflare/wrangler config. Please keep it that way:

- Routing is **React Router**, wired up in `src/App.tsx`. Add screens as
  components under `src/pages/` and register them there.
- Anything that needs a Supabase *service role* key belongs in a backend you
  control (e.g. a Supabase Edge Function), never in this bundle — everything
  here ships to the browser.
- Supabase config comes from `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` only. Never hardcode a project URL or key.
- Vite inlines env vars at build time, so changing them in Vercel requires a
  redeploy.
- `vercel.json` provides the SPA fallback that makes deep links like `/app`
  work. Don't remove it.

## Layout

```
index.html               Vite entry document
src/main.tsx             React root: providers + BrowserRouter
src/App.tsx              Route table
src/pages/               One component per screen
src/components/          ProtectedRoute, error boundary
src/components/ui/       shadcn/ui primitives
src/integrations/supabase/client.ts   The single Supabase client
src/styles.css           Tailwind v4 theme + design tokens
vercel.json              Static build + SPA rewrite
```

## Checks before pushing

```sh
npm run typecheck
npm run lint
npm run build
```
