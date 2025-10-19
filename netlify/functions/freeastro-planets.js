// netlify/functions/freeastro-planets.js
// Node 18 原生 fetch 版本
// 依官方文件：POST https://json.freeastrologyapi.com/western/planets
// Header: Content-Type: application/json, x-api-key: <YOUR_KEY>

export const handler = async (event) => {
  // 僅允許 POST
  if (event.httpMethod !== 'POST') {
    return resp(405, { message: 'Method Not Allowed' });
  }

  // 解析 body（確保一定是 JSON）
  let payload;
  try {
    payload = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
  } catch (e) {
    return resp(400, { message: 'Invalid JSON body' });
  }

  // 取環境變數（你已在 Netlify 設好）
  const API_KEY = process.env.FREEASTRO_API_KEY || '';
  const BASE    = process.env.FREEASTRO_BASE || 'https://json.freeastrologyapi.com';
  const PATH    = process.env.FREEASTRO_URL_PLANETS || '/western/planets';
  const AUTH    = (process.env.FREEASTRO_AUTH_STYLE || 'header').toLowerCase();

  if (!API_KEY) return resp(500, { error: 'Missing FREEASTRO_API_KEY in environment variables.' });

  // 1) 先把使用者送來的值做「最小格式化」——官方需要純數字/字串
  //    （避免前端某些欄位被當成字串、或空白）
  const cleanNumber = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v))) ? undefined : Number(v);

  const body = {
    year:  cleanNumber(payload.year),
    month: cleanNumber(payload.month),
    day:   cleanNumber(payload.day),
    hour:  cleanNumber(payload.hour),
    min:   cleanNumber(payload.min),
    lat:   cleanNumber(payload.lat),
    lon:   cleanNumber(payload.lon),
    tzone: cleanNumber(payload.tzone),
    house_system: (payload.house_system || '').toString().trim() || 'placidus',
    lang: (payload.lang || 'en').toString().trim()
  };

  // 2) 檢查必填欄位（照官方 planets 規格）
  const missing = Object.entries({
    year: body.year, month: body.month, day: body.day,
    hour: body.hour, min: body.min, lat: body.lat, lon: body.lon,
    tzone: body.tzone, house_system: body.house_system
  }).filter(([k,v]) => v === undefined).map(([k]) => k);

  if (missing.length) {
    return resp(400, { message: 'Missing required fields', missing });
  }

  // 3) 建 URL（保證單一斜線）
  const url = `${BASE.replace(/\/+$/, '')}${PATH.startsWith('/') ? '' : '/'}${PATH}`;

  // 4) 組 Header（官方是 x-api-key）
  const headers = {
    'Content-Type': 'application/json'
  };
  if (AUTH === 'header') {
    headers['x-api-key'] = API_KEY;
  }

  // 5) 送出
  let upstream;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  } catch (err) {
    return resp(502, { error: 'Upstream fetch error', detail: String(err) });
  }

  const text = await upstream.text();
  // 嘗試解析回傳 JSON（API 出錯時也常是 JSON）
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  // 直接把上游狀態與內容回傳給前端（便於你在 console 看到真正錯誤）
  return {
    statusCode: upstream.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
};

// 小工具：回應 helper
function resp(code, obj) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}
