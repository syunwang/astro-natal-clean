/* index.js — 前端互動邏輯（24h time 解析 + 地名→經緯度 + planets payload） */

const $ = (sel) => document.querySelector(sel);
const diag = $("#diag");
const log = (msg) => (diag.textContent += `${msg}\n`);

function parseDateParts(isoDateStr) {
  // isoDateStr: 'YYYY-MM-DD'
  const [y, m, d] = (isoDateStr || "").split("-").map((v) => Number(v));
  return { y, m, d };
}
function parseTimeParts(hhmm) {
  // hhmm: 'HH:MM'，永遠 24h 解析
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return { h: NaN, n: NaN };
  const [h, n] = hhmm.split(":").map((v) => Number(v));
  return { h, n };
}

function setLatLon(lat, lon) {
  $("#lat").value = lat != null ? String(lat) : "";
  $("#lon").value = lon != null ? String(lon) : "";
}

async function fetchGeo() {
  const place = $("#place").value.trim();
  if (!place) {
    log("• 請輸入地名關鍵字再查詢。");
    return;
  }
  log(`• 查詢地理… (${place})`);
  try {
    const res = await fetch("/.netlify/functions/freeastro-geo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: place })
    });
    const data = await res.json();
    if (!res.ok) {
      log(`✗ 地理查詢失敗：${data && data.message || res.status}`);
      return;
    }
    if (!data || !data.lat || !data.lon) {
      log("✗ 沒拿到經緯度。");
      return;
    }
    setLatLon(data.lat, data.lon);
    log(`✓ 地理OK: ${data.display_name || ""}  →  lat=${data.lat}, lon=${data.lon}`);
  } catch (err) {
    log(`✗ 地理查詢 Exception: ${err.message}`);
  }
}

function buildPlanetsPayload() {
  const name = $("#name").value.trim();

  const d = $("#birthdate").value;      // 'YYYY-MM-DD'
  const t = $("#birthtime").value;      // 'HH:MM'（24h）
  const tz = Number($("#tzone").value);
  const hs = $("#house_system").value;
  const lang = $("#lang").value;
  const lat = Number($("#lat").value);
  const lon = Number($("#lon").value);

  const { y: year, m: month, d: day } = parseDateParts(d);
  const { h: hour, n: min } = parseTimeParts(t);

  return {
    name: name || undefined,   // 可有可無
    year, month, day,
    hour, min,
    lat, lon,
    tzone: tz,
    house_system: hs,
    lang
  };
}

function validatePayload(p) {
  const miss = [];
  if (!Number.isFinite(p.year)) miss.push("year");
  if (!Number.isFinite(p.month)) miss.push("month");
  if (!Number.isFinite(p.day)) miss.push("day");
  if (!Number.isFinite(p.hour)) miss.push("hour(請用 24h 時間)");
  if (!Number.isFinite(p.min)) miss.push("min");
  if (!Number.isFinite(p.lat)) miss.push("lat");
  if (!Number.isFinite(p.lon)) miss.push("lon");
  if (!Number.isFinite(p.tzone)) miss.push("tzone");
  if (!p.house_system) miss.push("house_system");
  if (!p.lang) miss.push("lang");
  return miss;
}

async function runPlanets() {
  diag.textContent = "";
  const payload = buildPlanetsPayload();
  const lacks = validatePayload(payload);
  if (lacks.length) {
    log("✗ 請補齊欄位：" + lacks.join(", "));
    log("（提示：先輸入地名並按「查經緯度」，或自行輸入經緯度）");
    return;
  }

  log("📦 送出前 payload（也寫在 console） " + JSON.stringify(payload));
  console.log("planets payload =>", payload);

  try {
    const res = await fetch("/.netlify/functions/freeastro-planets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload) // 嚴格依官方鍵名
    });
    const data = await res.json();
    if (!res.ok) {
      log(`✗ HTTP ${res.status} – ${JSON.stringify(data)}`);
      return;
    }
    // 這裡是成功回傳，你可以依你的 UI 呈現，暫時先 print
    log("✓ Planets 計算成功。回應（節錄）：");
    log(JSON.stringify(data).slice(0, 800) + " …");
  } catch (err) {
    log("✗ Exception: " + err.message);
  }
}

function clearAll() {
  $("#name").value = "";
  $("#birthdate").value = "";
  $("#birthtime").value = "";
  $("#tzone").value = "8";
  $("#house_system").value = "placidus";
  $("#place").value = "";
  setLatLon("", "");
  $("#lang").value = "zh";
  diag.textContent = "";
}

/* 綁定事件 */
$("#btnGeo").addEventListener("click", fetchGeo);
$("#place").addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchGeo();
});
$("#btnClearLat").addEventListener("click", () => $("#lat").removeAttribute("readonly"));
$("#btnClearLon").addEventListener("click", () => $("#lon").removeAttribute("readonly"));

$("#btnRun").addEventListener("click", runPlanets);
$("#btnClear").addEventListener("click", clearAll);

/* 初始提示 */
log("載入完成。請先輸入地名並按「查經緯度」，或直接手動輸入。");
