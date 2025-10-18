// index.js
const $ = (s) => document.querySelector(s);
const logBox = $("#log");
const log = (msg) => {
  logBox.textContent += `\n${msg}`;
  logBox.scrollTop = logBox.scrollHeight;
};
const set = (id, v) => { $(id).value = v; };
const num = (id) => Number($(id).value);

const LOCKS = { lat: true, lon: true };
$("#unlockLat").onclick = () => {
  LOCKS.lat = !LOCKS.lat;
  $("#latitude").readOnly = LOCKS.lat;
  $("#unlockLat").textContent = LOCKS.lat ? "解鎖" : "上鎖";
};
$("#unlockLon").onclick = () => {
  LOCKS.lon = !LOCKS.lon;
  $("#longitude").readOnly = LOCKS.lon;
  $("#unlockLon").textContent = LOCKS.lon ? "解鎖" : "上鎖";
};

// 依地名查經緯度
async function fetchGeo() {
  const q = $("#location").value.trim();
  if (!q) return log("⚠️ 請先輸入地名關鍵字");
  log(`🔎 查詢地理… ${q}`);
  try {
    const res = await fetch("/.netlify/functions/freeastro-geo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q })
    });
    const data = await res.json();
    if (!res.ok) {
      log(`❌ 地理查詢失敗：${res.status} ${JSON.stringify(data)}`);
      return;
    }
    // 期待回傳 { lat, lon, display_name }
    if (data?.lat != null && data?.lon != null) {
      set("#latitude", data.lat);
      set("#longitude", data.lon);
      log(`✅ 地理OK：${data.display_name || ""}`);
    } else {
      log(`⚠️ 地理查詢失敗：${JSON.stringify(data)}`);
    }
  } catch (e) {
    log(`🚨 地理查詢例外：${e.message}`);
  }
}
$("#btnGeo").onclick = fetchGeo;
$("#location").addEventListener("blur", () => {
  // 失焦自動查；你不想自動可註解
  if (!$("#latitude").value || !$("#longitude").value) fetchGeo();
});

// 組 payload（符合後端 freeastro-planets.js）
function buildPayload() {
  const birthdate = $("#birthdate").value; // yyyy-mm-dd
  const birthtime = $("#birthtime").value; // HH:MM

  const [year, month, day] = (birthdate || "").split("-").map((x) => Number(x));
  const [hour, min] = (birthtime || "").split(":").map((x) => Number(x));

  return {
    name: $("#name").value.trim() || "",
    year, month, day, hour, min,
    lat: num("#latitude"),
    lon: num("#longitude"),
    tzone: num("#tzone"),
    house_system: $("#house_system").value,
    lang: $("#lang").value,
  };
}

function validatePayload(p) {
  const missing = [];
  for (const k of ["year", "month", "day", "hour", "min", "lat", "lon", "tzone"]) {
    if (p[k] == null || Number.isNaN(p[k])) missing.push(k);
  }
  if (missing.length) {
    log(`⚠️ 缺少或格式錯誤欄位：${missing.join(", ")}`);
    return false;
  }
  return true;
}

// 送 planets
$("#generate").onclick = async () => {
  logBox.textContent = "";
  const payload = buildPayload();
  log("📦 送出前 payload（也寫在 console）");
  console.log("payload", payload);
  log(JSON.stringify(payload, null, 2));

  if (!validatePayload(payload)) {
    log("❌ 請先補齊必要欄位（包含日期、時間與經緯度）。");
    return;
  }

  try {
    const res = await fetch("/.netlify/functions/freeastro-planets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      log("✅ 呼叫成功");
      log(JSON.stringify(data, null, 2));
    } else {
      log(`❌ HTTP ${res.status} – ${JSON.stringify(data)}`);
    }
  } catch (e) {
    log(`🚨 發生例外：${e.message}`);
  }
};

// 清空
$("#clear").onclick = () => {
  ["#name","#tzone","#location","#latitude","#longitude","#birthdate","#birthtime"].forEach((id)=> set(id,""));
  $("#tzone").value = 8;
  logBox.textContent = "已清空。請輸入地名後按「查經緯度」。";
};
