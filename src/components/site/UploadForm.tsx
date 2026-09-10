"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const [videoSourceUrl, setVideoSourceUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("zh");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_source_url: videoSourceUrl,
          topic: topic || null,
          language,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(payload?.error ?? `Request failed (${res.status})`);
        return;
      }

      setVideoSourceUrl("");
      setTopic("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fade-in-up rounded-2xl border border-border bg-card p-8 shadow-2xl"
    >
      <h2 className="text-lg font-semibold tracking-tight">Transcribe a video</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        YouTube links are not supported in this milestone — use a direct media URL.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="video_source_url" className="mb-1.5 block text-sm font-medium">
            Video URL
          </label>
          <input
            id="video_source_url"
            name="video_source_url"
            type="url"
            required
            value={videoSourceUrl}
            onChange={(e) => setVideoSourceUrl(e.target.value)}
            placeholder="Direct mp4 / mp3 URL (e.g. CloudFront, Vimeo, Internet Archive)"
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
          />
        </div>

        <div>
          <label htmlFor="topic" className="mb-1.5 block text-sm font-medium">
            Topic <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="topic"
            name="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Tech podcast — useful context for the model"
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
          />
        </div>

        <div>
          <label htmlFor="language" className="mb-1.5 block text-sm font-medium">
            Language
          </label>
          <select
            id="language"
            name="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring"
          >
            <option value="zh">zh</option>
            <option value="en">en</option>
            <option value="ja">ja</option>
          </select>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Transcribe"}
        </button>
      </div>
    </form>
  );
}
