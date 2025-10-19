// netlify/functions/freeastro-planets.js
// Node 18 原生 fetch
// 兩段式：先扁平 schema（A），若 400/Invalid request body 再試巢狀 schema（B）
// Header: x-api-key + Content-Type: application/json

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return respond(405, { message: 'Method Not Allowed' });

  let payload;
  try {
    payload = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
  } catch {
    return respond(400, { message: 'Invalid JSON body' });
  }

  const API_KEY = process.env.FREEASTRO_API_KEY || '';
  const BASE    = process.env.FREEASTRO_BASE || 'https://json.freeastrologyapi.com';
  const PATH    = process.env.FREEASTRO_URL_PLANETS || '/western/planets';
  const AUTH    = (process.env.FREEASTRO_AUTH_STYLE || 'header').toLowerCase();

  if (!API_KEY) return respond(500, { error: 'Missing FREEASTRO_API_KEY' });

  const url = `${BASE.replace(/\/+$/, '')}${PATH.startsWith('/') ? '' : '/'}${PATH}`;

  // -------- Schema A：扁平 + number --------
  const toNum = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v))) ? undefined : Number(v);

  const bodyA = {
    year:  toNum(payload.year),
    month: toNum(payload.month),
    day:   toNum(payload.day),
    hour:  toNum(payload.hour),
    min:   toNum(payload.min),
    lat:   toNum(payload.lat),
    lon:   toNum(payload.lon),
    tzone: toNum(payload.tzone),
    house_system: (payload.house_system || 'placidus').toString().trim(),
    lang: (payload.lang || 'en').toString().trim()
  };

  const missingA = Object.entries({
    year: bodyA.year, month: bodyA.month, day: bodyA.day,
    hour: bodyA.hour, min: bodyA.min, lat: bodyA.lat, lon: bodyA.lon,
    tzone: bodyA.tzone, house_system: bodyA.house_system
  }).filter(([,v]) => v === undefined);

  if (missingA.length) {
    return respond(400, { message: 'Missing required fields', missing: missingA.map(([k])=>k) });
  }

  const headers = { 'Content-Type': 'application/json' };
  if (AUTH === 'header') headers['x-api-key'] = API_KEY;

  // --- 送 Schema A ---
  let resA = await safePost(url, headers, bodyA);
  // 將請求與回應（已移除金鑰）一起回傳給前端方便排錯
  if (!resA.ok && isInvalidBody(resA)) {
    // -------- Schema B：巢狀 + string --------
    const bodyB = {
      date: { year: String(bodyA.year), month: String(bodyA.month), day: String(bodyA.day) },
      time: { hour: String(bodyA.hour), minute: String(bodyA.min) },
      location: { latitude: String(bodyA.lat), longitude: String(bodyA.lon), timezone: String(bodyA.tzone) },
      house_system: bodyA.house_system,
      lang: bodyA.lang
    };

    let resB = await safePost(url, headers, bodyB);
    return respond(resB.status, {
      tried: 'A-then-B',
      requestA: { url, headers: scrubHeaders(headers), body: bodyA },
      responseA: resA.bodyJSON ?? resA.bodyText,
      requestB: { url, headers: scrubHeaders(headers), body: bodyB },
      responseB: resB.bodyJSON ?? resB.bodyText
    });
  }

  // A 成功或不是 Invalid request body 的錯誤
  return respond(resA.status, {
    tried: 'A-only',
    requestA: { url, headers: scrubHeaders(headers), body: bodyA },
    responseA: resA.bodyJSON ?? resA.bodyText
  });
};

// 工具：統一送 POST 並抓回傳
async function safePost(url, headers, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const txt = await r.text();
    let js; try { js = JSON.parse(txt); } catch {}
    return { ok: r.ok, status: r.status, bodyText: txt, bodyJSON: js };
  } catch (e) {
    return { ok: false, status: 502, bodyText: String(e) };
  }
}

function scrubHeaders(h) {
  const out = { ...h };
  if (out['x-api-key']) out['x-api-key'] = '***';
  return out;
}
function isInvalidBody(res) {
  const t = (res.bodyText || '').toLowerCase();
  const j = (res.bodyJSON && JSON.stringify(res.bodyJSON).toLowerCase()) || '';
  return (t.includes('invalid request body') || j.includes('invalid request body')) && res.status === 400;
}
function respond(code, obj) {
  return { statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
