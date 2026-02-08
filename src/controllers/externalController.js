const { searchUnsplashPhotos } = require("../services/unsplashService");

async function getWeather(req, res, next) {
  try {
    const lat = Number(req.query.lat ?? 51.1694);
    const lon = Number(req.query.lon ?? 71.4491);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return res.status(400).json({ message: "Validation error: lat and lon must be numbers" });
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("current", "temperature_2m,wind_speed_10m");
    url.searchParams.set("timezone", "auto");

    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) {
      return res.status(502).json({ message: "Weather provider error" });
    }

    const current = data?.current || {};
    return res.json({
      location: { lat, lon },
      temperatureC: current.temperature_2m,
      windSpeed: current.wind_speed_10m,
      time: current.time,
    });
    
  } catch (e) {
    console.error("Weather API error:", e);
    return res.status(500).json({ message: "Weather service unavailable" });
  }
}

async function getPhotos(req, res) {  
  try {
    const query = String(req.query.q || "coffee");
    const perPage = Math.min(Math.max(Number(req.query.perPage || 8), 1), 12);

    const items = await searchUnsplashPhotos(query, perPage);
    return res.json({ query, perPage, items });
    
  } catch (e) {
    console.error("Photos error:", e);
    return res.status(500).json({ message: "Failed to fetch photos" });
  }
}

module.exports = { getWeather, getPhotos };