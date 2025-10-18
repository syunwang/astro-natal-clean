// netlify/functions/freeastro-planets.js
// Node 18+：使用原生 fetch，授權用 header: 'x-api-key'
// 會把 day/minute/latitude/longitude/tz… 正規化成 API 需要的欄位

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return resp(405, { message: 'Method Not Allowed' });
    }

    const DEBUG = String(process.env.FREEASTRO_DEBUG || '').toLowerCase() === 'true';
    const BASE = (process.env.FREEASTRO_BASE || 'https://json.freeastrologyapi.com').replace(/\/+$/, '');
    const PATH = process.env.FREEASTRO_URL_PLANETS || '/western/planets';
    const API_KEY = process.env.FREEASTRO_API_KEY;
    const AUTH_STYLE = (process.env.FREEASTRO_AUTH_STYLE || 'header').toLowerCase();

    if (!API_KEY) {
      return resp(500, { error: 'Missing FREEASTRO_API_KEY in environment variables.' });
    }

    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch {
        return resp(400, { message: 'Invalid JSON body' });
      }
    }

    // ---- 正規化欄位名稱（容錯）----
    const norm = (obj) => {
      const o = { ...obj };

      // date / day
      if (o.date == null && o.day != null) o.date = o.day;

      // min / minute
      if (o.min == null && o.minute != null) o.min = o.minute;

      // lat / latitude
      if (o.lat == null && o.latitude != null) o.lat = o.latitude;

      // lon / longitude
      if (o.lon == null && o.longitude != null) o.lon = o.longitude;

      // tzone / tz
      if (o.tzone == null && (o.tz != null || o.timezone != null)) {
        o.tzone = o.tz ?? o.timezone;
      }

      // 轉數字
      const toNum = (v) => (v === '' || v == null ? undefined : Number(v));
      o.year = toNum(o.year);
      o.month = toNum(o.month);
      o.date = toNum(o.date);
      o.hour = toNum(o.hour);
      o.min = toNum(o.min);
      o.lat = o.lat != null ? Number(o.lat) : o.lat;
      o.lon = o.lon != null ? Number(o.lon) : o.lon;
      o.tzone = o.tzone != null ? Number(o.tzone) : o.tzone;

      // 預設語言/宮位系統可選
      if (!o.lang) o.lang = 'en';
      if (!o.house_system) o.house_system = 'placidus';

      return o;
    };

    const payload = norm(body);

    // 基本欄位檢查
    const required = ['year', 'month', 'date', 'hour', 'min', 'lat', 'lon', 'tzone'];
    const missing = required.filter((k) => payload[k] == null || Number.isNaN(payload[k]));
    if (missing.length) {
      return resp(400, { message: `Missing or invalid fields: ${missing.join(', ')}` });
    }

    const url = `${BASE}${PATH}`;
    const headers = { 'Content-Type': 'application/json' };

    if (AUTH_STYLE === 'header') {
      headers['x-api-key'] = API_KEY;
    }

    const reqInit = {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    };

    if (DEBUG) {
      console.log('[Planets] URL =>', url);
      console.log('[Planets] Payload =>', payload);
      console.log('[Planets] Auth style =>', AUTH_STYLE);
    }

    const res = await fetch(url, reqInit);

    // 如果用 query 方式帶 key（官方不推薦），則改走一次
    if (res.status === 401 || res.status === 403 || res.status === 400) {
      if (AUTH_STYLE === 'query') {
        const url2 = `${url}?api_key=${encodeURIComponent(API_KEY)}`;
        if (DEBUG) console.log('[Planets] Retry with query auth:', url2);
        const res2 = await fetch(url2, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const txt2 = await res2.text();
        return resp(res2.status, safeJson(txt2));
      }
    }

    const text = await res.text();
    return resp(res.status, safeJson(text));
  } catch (err) {
    console.error('[Planets] Exception:', err);
    return resp(500, { message: 'Internal Server Error' });
  }
};

function resp(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
