// index.js — 前端邏輯（請放在與 index.html 同層）
// 需求重點：freeastro-planets 的 payload 要用 { year, month, day, hour, min, lat, lon, tzone, lang, house_system, name? }

const $ = (sel) => document.querySelector(sel);
const log = (msg, type = "info") => {
  const box = $("#diag");
  const time = new Date().toLocaleTimeString();
  const line =
    type === "error"
      ? `❌ [${time}] ${msg}`
      : type === "ok"
      ? `✅ [${time}] ${msg}`
      : `•  [${time}] ${msg}`;
  box.textContent = `${box.textContent === "等待動作…" ? "" : box.textContent + "\n"}${line}`;
  box.scrollTop = box.scrollHeight;
};

// 解析 24h "HH:MM" → { hour, min }
function parseTimeToHourMin(str) {
  // 允許 "20:50" 或 "2050" 或 "20：50"
  const clean = String(str || "").replace(/[：]/g, ":").trim();
  let hour = 0;
  let min = 0;
  if (/^\d{1,2}:\d{1,2}$/.test(clean)) {
    const [h, m] = clean.split(":");
    hour = Number(h);
    min = Number(m);
  } else if (/^\d{3,4}$/.test(clean)) {
    const h = clean.slice(0, clean.length - 2);
    const m = clean.slice(-2);
    hour = Number(h);
    min = Number(m);
  } else {
    throw new Error("時間格式錯誤，請輸入 HH:MM，例如 20:50");
  }
  if (hour < 0 || hour > 23 || min < 0 || min > 59) {
    throw new Error("時間超出範圍（0–23:0–59）");
  }
  return { hour, min };
}

// 組裝 planets API 所需 payload（**關鍵：用 min，不是 minute**）
function buildPlanetsPayload() {
  const dateStr = $("#date").value.trim(); // "YYYY-MM-DD"
  const timeStr = $("#time").value.trim();
  const { hour, min } = parseTimeToHourMin(timeStr);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("日期請輸入 YYYY-MM-DD，例如 1990-01-01");
  }
  const [year, month, day] = dateStr.split("-").map((n) => Number(n));

  const tzone = Number($("#tzone").value || 0);
  const lat = Number($("#lat").value);
  const lon = Number($("#lon").value);
  const lang = $("#lang").value || "zh";
  const house_system = $("#house_system").value || "placidus";
  const name = ($("#name").value || "").trim();

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    throw new Error("經緯度不可為空，請先查經緯度或手動輸入。");
  }

  // 這就是 FreeAstrologyAPI 的西洋 planets 參數（我們的 Netlify Functions 會轉送並附上 header 授權）
  const payload = {
    year,
    month,
    day,
    hour,
    min,                 // 重要：使用 min（分鐘）
    lat,
    lon,
    tzone,               // 時區（例：8）
    lang,                // zh / en …
    house_system,        // placidus / whole-sign / koch …
  };

  if (name) payload.name = name; // 可選

  return payload;
}

// 呼叫 Functions：查地名 → 經緯度
async function handleGeo() {
  try {
    const place = $("#place").value.trim();
    if (!place) throw new Error("請輸入地名關鍵字後再查詢。");
    log(`查詢地理… (${place})`);
    const res = await fetch("/.netlify/functions/freeastro-geo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: place }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`地理查詢失敗: ${data && data.message ? data.message : res.statusText}`);
    }
    // 預期 data: { lat, lon, display_name? }
    if (typeof data.lat !== "number" || typeof data.lon !== "number") {
      throw new Error("地理回應缺少經緯度。");
    }
    $("#lat").value = data.lat.toFixed(6);
    $("#lon").value = data.lon.toFixed(6);
    log(`地理 OK: ${data.display_name || "已取得經緯度"}`, "ok");
  } catch (err) {
    log(String(err.message || err), "error");
  }
}

// 呼叫 Functions：產生行星（→ 後續你可以接輪盤）
async function handlePlanets() {
  try {
    log("呼叫 Planets…");
    const payload = buildPlanetsPayload();
    // 也輸出到 console 方便除錯
    console.log("Sending payload:", payload);
    log("Sending payload（也寫在 console）");

    const res = await fetch("/.netlify/functions/freeastro-planets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // 後端若傳回 { message }，直接顯示
      throw new Error(
        `HTTP ${res.status} — ${data && data.message ? JSON.stringify(data) : res.statusText}`
      );
    }

    // 這裡 data 即 FreeAstrology 的行星結果（已由 Functions 代理）
    log("行星資料取得成功 ✅", "ok");
    console.log("[Planets result]", data);
  } catch (err) {
    log(String(err.message || err), "error");
  }
}

// 清空
function handleClear() {
  $("#place").value = "";
  // 不動日期與時間，僅清除經緯度與診斷
  $("#lat").value = "";
  $("#lon").value = "";
  $("#diag").textContent = "已清空輸入。";
}

// 綁定事件
$("#btnGeo").addEventListener("click", handleGeo);
$("#btnRun").addEventListener("click", handlePlanets);
$("#btnClear").addEventListener("click", handleClear);

// 預設顯示
log("載入完成。請先輸入地名查經緯度，或手動輸入。");
