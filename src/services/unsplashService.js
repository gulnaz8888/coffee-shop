const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

async function searchUnsplashPhotos(query = "coffee", perPage = 8) {
  if (!UNSPLASH_ACCESS_KEY) {
    const err = new Error("UNSPLASH_ACCESS_KEY is missing in .env");
    err.status = 500;
    throw err;
  }

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("orientation", "landscape");

  const res = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      "Accept-Version": "v1",
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.errors?.[0] || data?.message || `Unsplash error: ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return (data.results || []).map((p) => ({
    id: p.id,
    alt: p.alt_description || p.description || "Coffee photo",
    small: p.urls?.small,
    regular: p.urls?.regular,
    link: p.links?.html,
    author: p.user?.name,
  }));
}

module.exports = { searchUnsplashPhotos };