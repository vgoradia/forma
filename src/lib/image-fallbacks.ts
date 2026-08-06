export async function findWikipediaImage(query: string): Promise<string | undefined> {
  const trimmed = query.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", trimmed);
    url.searchParams.set("gsrlimit", "5");
    url.searchParams.set("prop", "pageimages");
    url.searchParams.set("format", "json");
    url.searchParams.set("pithumbsize", "800");
    url.searchParams.set("origin", "*");

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return undefined;

    const data = (await response.json()) as {
      query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
    };

    for (const page of Object.values(data.query?.pages ?? {})) {
      const source = page.thumbnail?.source?.trim();
      if (source) return source;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function findOpenGraphImage(pageUrl: string): Promise<string | undefined> {
  try {
    const parsed = new URL(pageUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return undefined;

    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FormaBot/1.0; +https://forma.app)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return undefined;

    const html = await response.text();
    const patterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      const raw = match?.[1]?.trim();
      if (!raw) continue;
      try {
        const imageUrl = new URL(raw, pageUrl).toString();
        if (imageUrl.startsWith("http")) return imageUrl;
      } catch {
        continue;
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function resolveImageWithFallbacks(
  query: string,
  serperLookup?: () => Promise<string | undefined>
): Promise<string | undefined> {
  const trimmed = query.trim();
  if (!trimmed) return undefined;

  if (serperLookup) {
    const fromSerper = await serperLookup();
    if (fromSerper) return fromSerper;
  }

  return findWikipediaImage(trimmed);
}
