// --- lightweight in-memory rate gate (per IP) ---
const ipGate = new Map();
const WINDOW_MS = 1000;   // 每個 IP/使用者 至少間隔 1 秒
const MAX_PARALLEL = 1;   // 每個 IP 同時最多 1 個請求

async function gate(event) {
  // 在 Netlify 可取 x-forwarded-for，退而求其次 event.ip 或 default
  const ip = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'default';
  const info = ipGate.get(ip) || { running: 0, last: 0 };
  const now = Date.now();

  if (info.running >= MAX_PARALLEL || now - info.last < WINDOW_MS) {
    // 太頻繁：回 429（前端會做退避重試）
    return { block: true };
  }
  info.running++;
  info.last = now;
  ipGate.set(ip, info);

  return {
    block: false,
    done() {
      const cur = ipGate.get(ip) || info;
      cur.running = Math.max(0, cur.running - 1);
      ipGate.set(ip, cur);
    }
  };
}
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

function json(status, obj) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }

function pickNumber(...cands) {
  for (const c of cands) {
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

function pad(n) { return String(n).padStart(2, '0'); }

// Normalize input timezone to tzString (+HH:MM or IANA) and numeric utc_offset (hours) if available
function normalizeTz(value, fallbackHours) {
  const out = { tzString: "UTC", tzHours: 0 };
  if (value == null || value === "") {
    if (Number.isFinite(fallbackHours)) {
      const sign = fallbackHours >= 0 ? "+" : "-";
      const abs = Math.abs(fallbackHours);
      const hh = Math.floor(abs);
      const mm = Math.round((abs - hh) * 60);
      out.tzString = `${sign}${pad(hh)}:${pad(mm)}`;
      out.tzHours = fallbackHours;
    }
    return out;
  }
  const s = String(value).trim();
  // numeric like "8"
  if (/^[+-]?\d+(\.\d+)?$/.test(s)) {
    const h = parseFloat(s);
    const sign = h >= 0 ? "+" : "-";
    const abs = Math.abs(h);
    const hh = Math.floor(abs);
    const mm = Math.round((abs - hh) * 60);
    out.tzString = `${sign}${pad(hh)}:${pad(mm)}`;
    out.tzHours = h;
    return out;
  }
  // +08:00
  if (/^[+-]\d{2}:\d{2}$/.test(s)) {
    const hh = parseInt(s.slice(1, 3), 10);
    const mm = parseInt(s.slice(4, 6), 10);
    const sign = s[0] === "-" ? -1 : 1;
    out.tzString = s;
    out.tzHours = sign * (hh + mm/60);
    return out;
  }
  // IANA
  out.tzString = s;
  out.tzHours = Number.isFinite(fallbackHours) ? fallbackHours : undefined;
  return out;
}

function makeUpstream() {
  const url = (process.env.FREEASTRO_URL_PLANETS || "").trim() ||
              ((process.env.FREEASTRO_BASE || "").replace(/[\/\s]+$/,'') + "/western/planets");
  if (!/^https?:\/\//i.test(url)) throw new Error("config_error: FREEASTRO_URL_PLANETS or FREEASTRO_BASE not set");
  const key = process.env.FREEASTRO_API_KEY || "";
  const style = (process.env.FREEASTRO_AUTH_STYLE || "x-api-key").toLowerCase();
  const headers = { "Content-Type": "application/json" };
  if (key) {
    if (style === "bearer") headers["Authorization"] = `Bearer ${key}`;
    else headers["x-api-key"] = key;
  }
  return { url, headers };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });
    const input = safeJson(event.body);
    const rawDate = (input.date || "").replace(/[\/.]/g, "-");
    const [y, m, d] = rawDate.split("-").map(Number);
    const [hh, mm] = String(input.time || "").split(":").map(Number);
    const lat = pickNumber(input.latitude, input.lat);
    const lon = pickNumber(input.longitude, input.lon);
    if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
      return json(400, { error: "invalid_datetime", message: "date/time required: YYYY-MM-DD / HH:MM" });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return json(400, { error: "invalid_coords", message: "latitude/longitude required (numbers)" });
    }

    const { tzString, tzHours } = normalizeTz(input.timezone, input.utc_offset);
    const body = {
      date: `${y}-${pad(m)}-${pad(d)}`,
      time: `${pad(hh)}:${pad(mm)}`,
      latitude: lat,
      longitude: lon,
      timezone: tzString,
      utc_offset: tzHours ?? 0,
      house_system: String(input.house_system || "placidus"),
      lang: String(input.lang || "zh")
    };

    const { url, headers } = makeUpstream();
    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (r.ok) {
      const data = await r.json();
      return json(200, data);
    }
    const text = await r.text();
    return json(r.status, { error: "upstream", status: r.status, detail: text });
  } catch (e) {
    return json(500, { error: "server", message: String(e && e.message || e) });
  }
};
