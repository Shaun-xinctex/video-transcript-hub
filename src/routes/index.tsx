import { Link, createFileRoute } from "@tanstack/react-router";
import { FileText, Zap, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Video Speed Reader — Video to transcript in 3 minutes" },
      {
        name: "description",
        content:
          "Upload your video, get a clean, high-accuracy transcript in three minutes. Built for creators, educators, and engineers.",
      },
      { property: "og:title", content: "Video Speed Reader — Video to transcript in 3 minutes" },
      {
        property: "og:description",
        content:
          "Upload your video, get a clean, high-accuracy transcript in three minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: FileText,
    title: "高準確度逐字稿",
    subtitle: "High-accuracy transcripts",
    body: "Powered by OpenAI Whisper with support for Chinese and English, so your transcripts read clean from the start.",
  },
  {
    icon: Zap,
    title: "三分鐘交付",
    subtitle: "Three-minute turnaround",
    body: "Processing runs in the background. We email you the moment your transcript is ready — no waiting around.",
  },
  {
    icon: BadgeCheck,
    title: "可商用授權",
    subtitle: "Commercial-use ready",
    body: "You own the output. Repurpose it into blog posts, course notes, or searchable archives — however you like.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </span>
            <span className="text-base font-semibold tracking-tight">Video Speed Reader</span>
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Sign in / 登入
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-ambient relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-24 text-center sm:px-6 sm:pt-32">
          <div className="fade-in-up mx-auto max-w-3xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
              Video Speed Reader
            </p>
            <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              上傳影片，三分鐘內拿到逐字稿。
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Upload your video, get a clean transcript in three minutes.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/auth"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground shadow-[0_10px_40px_-10px_var(--primary)] transition-opacity hover:opacity-90 sm:w-auto"
              >
                Sign in / 登入
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Built for content creators, educators, and engineers who record long-form video.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-28 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, i) => (
            <article
              key={feature.title}
              className="glow-card fade-in-up rounded-2xl bg-card p-8"
              style={{ animationDelay: `${i * 120 + 150}ms` }}
            >
              <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
                <feature.icon className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-semibold tracking-tight">{feature.title}</h2>
              <p className="mt-1 text-sm font-medium text-primary">{feature.subtitle}</p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-center px-4 text-sm text-muted-foreground sm:px-6">
          © 2026 Video Speed Reader
        </div>
      </footer>
    </div>
  );
}
