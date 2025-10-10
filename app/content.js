/**
 * Astro-Natal - Frontend helpers (overlay)
 * Features:
 *  - fetchWithRetry with backoff (handles 429/5xx)
 *  - click throttle to avoid spamming API
 *  - auto timezone normalization ("8" -> "+08:00", "Asia/Taipei" etc.)
 *  - unified error toast in #diagnose box
 */

(() => {
  const $ = (sel) => document.querySelector(sel);
  const diagnose = $("#diagnose") || document.body;

  const log = (msg, data) => {
    console.log("[astro-natal]", msg, data || "");
    if ($("#diagnose_json")) {
      const cur = $("#diagnose_json").textContent || "";
      const out = (typeof data === "object") ? JSON.stringify(data, null, 2) : String(data ?? "");
      $("#diagnose_json").textContent = `${cur}\n${msg}\n${out}`.trim();
    }
  };

  // ---- Backoff & Retry ----
  async function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  async function fetchWithRetry(url, options = {}, times = 5) {
    let lastError;
    for (let i = 0; i < times; i++) {
      try {
        const r = await fetch(url, options);
        if (r.ok) return r;
        // retry on 429 / 5xx
        if (r.status === 429 || (r.status >= 500 && r.status < 600)) {
          const wait = 500 + Math.floor(Math.random() * 2000) + i * 500;
          log(`Upstream ${r.status}, retry in ${wait}ms`);
          await sleep(wait);
          continue;
        }
        // other non-OK -> throw with text
        const t = await r.text();
        const e = new Error(`HTTP ${r.status}: ${t}`);
        e.status = r.status;
        throw e;
      } catch (err) {
        lastError = err;
        const wait = 500 + Math.floor(Math.random() * 2000) + i * 500;
        log(`Network error, retry in ${wait}ms`, err);
        await sleep(wait);
      }
    }
    throw lastError || new Error("fetch failed");
  }

  // ---- Click throttle ----
  function throttlePromise(fn, gap = 1200) {
    let last = 0, pend = Promise.resolve();
    return async (...args) => {
      const now = Date.now();
      if (now - last < gap) {
        const left = gap - (now - last);
        log(`Throttled, wait ${left}ms`);
        await sleep(left);
      }
      last = Date.now();
      pend = Promise.resolve().then(() => fn(...args));
      return pend;
    };
  }

  // ---- Timezone normalization ----
  function normalizeTimezone(input) {
    if (!input) return { tzString: "UTC", tzHours: 0 };
    let str = String(input).trim();
    // Numeric like "8" or "-5.5"
    if (/^[+-]?\d+(\.\d+)?$/.test(str)) {
      const h = parseFloat(str);
      if (!isFinite(h)) return { tzString: "UTC", tzHours: 0 };
      const sign = h >= 0 ? "+" : "-";
      const abs = Math.abs(h);
      const hh = Math.floor(abs);
      const mm = Math.round((abs - hh) * 60);
      const tz = `${sign}${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      return { tzString: tz, tzHours: h };
    }
    // Already like +08:00
    if (/^[+-]\d{2}:\d{2}$/.test(str)) {
      const hh = parseInt(str.slice(1, 3), 10);
      const mm = parseInt(str.slice(4, 6), 10);
      const sign = str[0] === "-" ? -1 : 1;
      const h = sign * (hh + mm / 60);
      return { tzString: str, tzHours: h };
    }
    // IANA like Asia/Taipei -> pass through, hours unknown here
    return { tzString: str, tzHours: undefined };
  }

  function toastError(title, detail) {
    const box = $("#diagnose_box");
    if (!box) return alert(`${title}\n${detail ?? ""}`);
    box.style.display = "block";
    $("#diagnose_title").textContent = title;
    $("#diagnose_json").textContent = typeof detail === "object" ? JSON.stringify(detail, null, 2) : String(detail ?? "");
  }

  // ---- Build payload from form ----
  function buildPayload() {
    // Inputs (adapt names to your HTML)
    const dateStr = $("#birth_date")?.value || $("#date")?.value;
    const timeStr = $("#birth_time")?.value || $("#time")?.value;
    const utcOffsetStr = $("#utc_offset")?.value || $("#timezone")?.value || $("#tz")?.value;
    const lat = parseFloat($("#latitude")?.value ?? "");
    const lon = parseFloat($("#longitude")?.value ?? "");
    const house = $("#house_system")?.value || "placidus";
    const lang = $("#lang")?.value || "zh";

    // Normalize date/time
    const [y, m, d] = String(dateStr || "").replace(/[\/.]/g, "-").split("-").map(Number);
    const [hh, mm] = String(timeStr || "").split(":").map(Number);
    const { tzString, tzHours } = normalizeTimezone(utcOffsetStr);

    return {
      y, m, d, hh, mm,
      lat, lon,
      house_system: house,
      lang,
      tzString, // e.g. "+08:00" or "Asia/Taipei"
      tzHours   // numeric offset if available
    };
  }

  // ---- Call planets ----
  async function callPlanets() {
    $("#planets_error") && ($("#planets_error").textContent = "");
    const p = buildPayload();
    log("payload", p);

    // Validate
    if (!p.y || !p.m || !p.d || !isFinite(p.lat) || !isFinite(p.lon) || !isFinite(p.hh) || !isFinite(p.mm)) {
      toastError("輸入不完整", "請確認日期、時間、經緯度皆已填入");
      return;
    }

    const body = {
      date: `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`,
      time: `${String(p.hh).padStart(2, "0")}:${String(p.mm).padStart(2, "0")}`,
      timezone: p.tzString,     // allow "+08:00" or "Asia/Taipei"
      utc_offset: p.tzHours,    // numeric when available
      latitude: p.lat,
      longitude: p.lon,
      house_system: p.house_system,
      lang: p.lang
    };

    try {
      const r = await fetchWithRetry("/.netlify/functions/freeastro-planets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }, 5);
      const data = await r.json();
      log("planets data", data);
      // Show result (user can adapt to their UI)
      $("#planets_json") && ($("#planets_json").textContent = JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      const msg = (err && err.message) ? err.message : String(err);
      $("#planets_error") && ($("#planets_error").textContent = `Planets 失敗：${msg}`);
      toastError("Planets 失敗", msg);
    }
  }

  // Hook buttons if exist
  const btn = document.getElementById("btn_planets");
  if (btn) btn.addEventListener("click", throttlePromise(callPlanets, 1200));

  // Expose for console debug
  window.__astroNat = { normalizeTimezone, buildPayload, callPlanets };
})();
