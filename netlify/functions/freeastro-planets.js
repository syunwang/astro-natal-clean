// netlify/functions/freeastro-planets.js
// Robust + Debug version for FreeAstrologyAPI /western/planets

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

    const input = safeJson(event.body);
    // 前端可能提供的欄位（全部相容）：
    // date: 'YYYY-MM-DD' 或 'YYYY/MM/DD'
    // time: 'HH:MM'
    // timezone 或 utc_offset（數字/字串）
    // latitude/lat, longitude/lon
    // lang（可省略）, house_system（可省略）

    const rawDate = (input.date || '').replace(/\//g, '-');
    const [y, m, d] = rawDate.split('-').map(Number);
    const [hh, mm] = String(input.time || '').split(':').map(Number);
    const lat = pickNumber(input.latitude, input.lat);
    const lon = pickNumber(input.longitude, input.lon);

    if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm))
      return json(400, { error: 'invalid_datetime', message: 'date/time required: YYYY-MM-DD & HH:MM' });
    if (!isFinite(lat) || !isFinite(lon))
      return json(400, { error: 'invalid_coords', message: 'latitude/longitude required (numbers)' });

    const tzStr   = normTzString(input.timezone, input.utc_offset);   // 例如 +08:00 或 IANA
    const tzHours = normTzHours(input.timezone, input.utc_offset);    // 例如 8（數字）
    const hs = String(input.house_system || 'placidus').trim();
    const la = String(input.lang || 'zh').trim();

    const { url, headers } = makeUpstream();

    // 嘗試 A：year/month/day + hour/minute + tz 字串
    const bodyA = {
      year: y, month: m, day: d,
      hour: hh, minute: mm,
      latitude: lat, longitude: lon,
      timezone: tzStr,
      house_system: hs,
      lang: la
    };
    let r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(bodyA) });
    if (r.ok) return pass(r);

    // 嘗試 B：date/time + utc_offset（小時，數字）
    const bodyB = {
      date: `${y}-${pad(m)}-${pad(d)}`,
      time: `${pad(hh)}:${pad(mm)}`,
      latitude: lat, longitude: lon,
      utc_offset: tzHours,
      house_system: hs,
      lang: la
    };
    r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(bodyB) });
    if (r.ok) return pass(r);

    // 嘗試 C：ISO 字串 + lat/lon + tzHours
    const bodyC = {
      datetime: `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00`,
      lat, lon,
      tz: tzHours,
      house_system: hs,
      lang: la
    };
    r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(bodyC) });
    if (r.ok) return pass(r);

    // 都失敗 → 回傳 debug
    const text = await r.text();
    return json(r.status, {
      error: 'upstream_400',
      url,
      tried_bodies: process.env.FREEASTRO_DEBUG ? { bodyA, bodyB, bodyC } : undefined,
      upstream_text: text
    });

  } catch (e) {
    return json(502, { error: 'function_error', detail: String(e) });
  }
};

/* ---------------- helpers ---------------- */
function safeJson(x){ try{ return JSON.parse(x || '{}'); }catch{ return {}; } }
function json(statusCode, obj){ return { statusCode, headers:{'Content-Type':'application/json'}, body: JSON.stringify(obj) }; }
function pass(r){ return r.text().then(text => ({ statusCode: r.status, headers:{'Content-Type': r.headers.get('content-type') || 'application/json'}, body: text })); }
function pad(n){ return String(n).padStart(2,'0'); }
function pickNumber(...vals){
  for (const v of vals) {
    if (v === 0 || v === '0') return 0;
    if (v !== undefined && v !== null && String(v).trim() !== '') return parseFloat(v);
  }
  return NaN;
}
function normTzString(timezone, utc_offset){
  if (timezone && String(timezone).trim()) return String(timezone).trim(); // IANA or +HH:MM
  if (utc_offset !== undefined && utc_offset !== null && String(utc_offset).trim() !== '') {
    const n = parseFloat(utc_offset);
    const sign = n >= 0 ? '+' : '-';
    const abs = Math.abs(n);
    const h = String(Math.floor(abs)).padStart(2, '0');
    const m = String(Math.round((abs - Math.floor(abs)) * 60)).padStart(2, '0');
    return `${sign}${h}:${m}`;
  }
  return 'UTC';
}
function normTzHours(timezone, utc_offset){
  if (utc_offset !== undefined && utc_offset !== null && String(utc_offset).trim() !== '') return parseFloat(utc_offset);
  // 若給了 '+08:00' 這種，轉成 8
  if (/^[+-]\d{2}:\d{2}$/.test(String(timezone || ''))) {
    const sign = String(timezone)[0] === '-' ? -1 : 1;
    const [h, m] = String(timezone).slice(1).split(':').map(Number);
    return sign * (h + (m || 0)/60);
  }
  return 0; // 預設 UTC
}
function makeUpstream(){
  const url = (process.env.FREEASTRO_URL_PLANETS || '').trim() ||
              ((process.env.FREEASTRO_BASE || '').replace(/\/+$/,'') + '/western/planets');
  if (!url.startsWith('http')) throw new Error('config_error: FREEASTRO_URL_PLANETS or FREEASTRO_BASE not set');

  const key = process.env.FREEASTRO_API_KEY || '';
  const style = (process.env.FREEASTRO_AUTH_STYLE || 'x-api-key').toLowerCase();
  const headers = { 'Content-Type': 'application/json' };
  if (style === 'authorization') headers['Authorization'] = `Bearer ${key}`;
  else headers[process.env.FREEASTRO_AUTH_STYLE || 'x-api-key'] = key;
  return { url, headers };
}
