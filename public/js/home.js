(function () {
  const q = document.getElementById("q");
  const btn = document.getElementById("searchBtn");

  function cards() {
    return Array.from(document.querySelectorAll(".pCard"));
  }

  function runSearch() {
    const term = (q?.value || "").toLowerCase().trim();
    cards().forEach(c => {
      const name = (c.dataset.name || "").toLowerCase();
      c.style.display = name.includes(term) ? "" : "none";
    });
  }

  if (btn) btn.addEventListener("click", runSearch);
  if (q) q.addEventListener("input", runSearch);

  function setWeatherUI({ temp, wind }) {
    const topbarEl = document.getElementById("weatherInfo");

    const metaEl = document.getElementById("heroWeatherMeta");
    const bigEl = document.getElementById("heroWeatherBig");
    const hintEl = document.getElementById("heroWeatherHint");

    if (typeof temp !== "number") {
      if (topbarEl) topbarEl.textContent = "Astana: weather unavailable";
      if (metaEl) metaEl.textContent = "Weather unavailable";
      if (bigEl) bigEl.textContent = "--°C";
      if (hintEl) hintEl.textContent = "Lets grab a hot drink anyway.";
      return;
    }

    const windText = typeof wind === "number" ? `Wind ${wind} km/h` : "Live forecast";

    if (topbarEl) {
      topbarEl.textContent = `Astana: ${temp}°C${typeof wind === "number" ? `, Wind: ${wind} km/h` : ""}`;
    }
    if (metaEl) metaEl.textContent = windText;
    if (bigEl) bigEl.textContent = `${temp}°C`;

    if (hintEl) {
      const vibe = temp <= 0
        ? "Its cold today. Lets grab a hot drink."
        : temp <= 10
          ? "A bit chilly. A hot drink sounds perfect."
          : "Nice weather. Coffee still wins.";
      hintEl.textContent = vibe;
    }
  }

  async function loadWeather() {
    try {
      const weather = await window.externalWidgets?.loadWeatherAstana?.();
      setWeatherUI(weather || {});
    } catch {
      setWeatherUI({});
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadWeather();

    setTimeout(() => {
      if (window.externalWidgets?.paintHomePhotos) {
        window.externalWidgets.paintHomePhotos();
      }
    }, 500);
  });
})();