import { useEffect } from "react";

type PageMeta = {
  title: string;
  description: string;
};

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

/**
 * Per-route <title> and meta tags. Replaces TanStack Router's `head()` option
 * now that the app renders entirely on the client.
 */
export function usePageMeta({ title, description }: PageMeta) {
  useEffect(() => {
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", "website");
  }, [title, description]);
}
