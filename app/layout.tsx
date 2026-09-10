import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Video Speed Reader — Video to transcript in 3 minutes",
  description:
    "Upload your video, get a clean, high-accuracy transcript in three minutes. Built for creators, educators, and engineers.",
  openGraph: {
    title: "Video Speed Reader — Video to transcript in 3 minutes",
    description: "Upload your video, get a clean transcript in three minutes.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Same Inter webfont the Vite build loaded — keep it so --font-sans resolves. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
