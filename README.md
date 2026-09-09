# Video Transcript Hub

Build a SaaS landing page + authenticated app shell for Video Speed Reader, a product that turns any video into an accurate transcript in three minutes, targeted at content creators, educators, and engineers who record long-form video and need a fast, clean transcript to repurpose into blog posts, course notes, or searchable archives.

The site must include:

1. A public landing page (`/`) with:

   - Hero section: product name "Video Speed Reader" prominently displayed, value prop "上傳影片，三分鐘內拿到逐字稿。" (English subtitle: "Upload your video, get a clean transcript in three minutes."), and a primary CTA button labeled "Sign in / 登入" in the top-right header

   - Features section with exactly 3 feature cards:

     * Card 1: "高準確度逐字稿 (High-accuracy transcripts)" — powered by OpenAI Whisper, supports Chinese and English

     * Card 2: "三分鐘交付 (Three-minute turnaround)" — processed in the background, you get an email when it's ready

     * Card 3: "可商用授權 (Commercial-use ready)" — you own the output, use it however you like

   - Footer with copyright "© 2026 Video Speed Reader"

2. Authentication backed by our own Supabase project (email + password against Supabase's default `auth.users`):

   - Sign Up page with email + password

   - Sign In page with email + password

   - Sign Out functionality

   - Email confirmation can be disabled for simplicity in this v1

3. An authenticated app shell at `/app` that the user lands on after signing in:

   - Greets the signed-in user by email: "Hi {user.email}"

   - A placeholder message: "Your dashboard is coming soon. Upload functionality will be added in the next milestone."

   - A Sign Out button in the header

Design requirements:

- Modern, professional dark theme (purple/violet accent on a near-black background)

- Use Inter or a similar sans-serif font

- Mobile responsive

- Tasteful subtle animations (fade-in on scroll is fine; don't overdo it)

Out of scope for this v1: video upload widget, transcript display, payment, custom database tables (do NOT create a `profiles` or `videos` table — only use Supabase's default `auth.users`). Those come in later milestones. Stick to landing page + auth + placeholder dashboard.

---

## Tech stack

Plain **Vite + React 19 SPA** — no SSR, no server runtime, no edge functions.

| Concern    | Choice                                              |
| ---------- | --------------------------------------------------- |
| Build      | Vite (`vite build` → static `dist/`)                |
| Routing    | React Router (client-side)                           |
| Styling    | Tailwind CSS v4 + shadcn/ui (Radix primitives)       |
| Auth/data  | Supabase JS client (browser only)                    |
| Hosting    | Vercel static hosting                                |

### Routes

| Path        | Screen                                                        |
| ----------- | ------------------------------------------------------------- |
| `/`         | Public landing page                                            |
| `/sign-in`  | Sign in                                                        |
| `/sign-up`  | Sign up                                                        |
| `/auth`     | Redirects to `/sign-in` (legacy path)                          |
| `/app`      | Authenticated dashboard — redirects to `/sign-in` when signed out |
| `*`         | 404                                                            |

## Development

You need Node.js 20+ and npm.

```sh
git clone https://github.com/Shaun-xinctex/video-transcript-hub.git
cd video-transcript-hub
npm install
cp .env.example .env   # fill in your Supabase values
npm run dev            # http://localhost:8080
```

Other scripts: `npm run build` (static build to `dist/`), `npm run preview`
(serve the build locally), `npm run typecheck`, `npm run lint`.

## Environment variables

Both are read at **build time** by Vite and inlined into the bundle, so they
must be present wherever the build runs — locally in `.env`, and in Vercel.

| Variable                        | Description                                          |
| ------------------------------- | ---------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase project URL                                 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_…`), browser-safe and RLS-gated |

> After changing these in Vercel you must **redeploy** — a rebuild is what
> bakes the new values into the JavaScript bundle.

## Deploying to Vercel

1. Vercel → **Add New… → Project** → import this GitHub repository.
2. Vercel reads `vercel.json`, so the framework preset (Vite), build command
   (`npm run build`) and output directory (`dist`) are already correct.
3. Under **Settings → Environment Variables**, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` for Production, Preview and Development.
4. Deploy.

`vercel.json` rewrites every non-file request to `/index.html`, so deep links
such as `/app` and `/sign-up` are resolved by React Router instead of returning
a 404. Vercel checks the filesystem before applying rewrites, so hashed assets
under `/assets/`, `favicon.ico` and `robots.txt` are still served directly.
