(function () {
  const TOKEN_KEY = "auth_token";

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
  }
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function isObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  async function safeReadJson(res) {
    const text = await res.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return { message: text }; }
  }

  function extractErrorMessage(data, fallback) {
    if (!data) return fallback;
    if (typeof data === "string") return data;

    if (isObject(data)) {
      if (typeof data.message === "string") return data.message;
      if (typeof data.error === "string") return data.error;

      if (Array.isArray(data.details) && data.details[0]?.message) return data.details[0].message;
      if (Array.isArray(data.errors) && data.errors[0]?.msg) return data.errors[0].msg;
    }
    return fallback;
  }

  async function request(path, method = "GET", body = null, headers = {}) {
    const opts = {
      method,
      headers: { "Content-Type": "application/json", ...headers }
    };

    if (body !== null && method !== "GET" && method !== "HEAD") {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(path, opts);
    const data = await safeReadJson(res);

    if (!res.ok) {
      const fallback = `Request failed: ${res.status} ${res.statusText || ""}`.trim();
      const msg = extractErrorMessage(data, fallback);
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  function api(path, method = "GET", body = null) {
    return request(path, method, body);
  }

  function apiAuth(path, method = "GET", body = null) {
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return request(path, method, body, headers);
  }

  async function loadWeatherAstana() {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=51.1694&longitude=71.4491&current=temperature_2m,wind_speed_10m&timezone=auto";

    try {
      const res = await fetch(url);
      const data = await res.json();
      return {
        temp: data?.current?.temperature_2m,
        wind: data?.current?.wind_speed_10m
      };
    } catch {
      return null;
    }
  }

  async function loadUnsplashRandom(query = "coffee", count = 6) {
    const res = await fetch(`/api/unsplash/random?query=${encodeURIComponent(query)}&count=${count}`);
    const data = await res.json();
    const photos = Array.isArray(data) ? data : (data?.photos || data?.results || []);
    return photos;
  }

 
  async function paintHomePhotos() {
   
    const targets = Array.from(document.querySelectorAll(".ph"));
    if (!targets.length) return;

    try {
      const photos = await loadUnsplashRandom("coffee shop", Math.max(6, targets.length));
      if (!photos.length) return;

      targets.forEach((el, i) => {
        const p = photos[i % photos.length];
        const url = p?.urls?.small || p?.urls?.regular;
        if (!url) return;
        
        el.style.backgroundImage = `url("${url}")`;
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
      });
    } catch {
    }
  }

  window.api = api;
  window.apiAuth = apiAuth;
  window.authStore = { setToken, getToken, clearToken };
  window.externalWidgets = { loadWeatherAstana, paintHomePhotos };
})();