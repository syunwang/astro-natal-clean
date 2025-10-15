// netlify/functions/freeastro-geo.js
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const GATE_INTERVAL_MS = 1200;
let lastCallAt = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function withAuth(url, options = {}) {
  const style = process.env.FREEASTRO_AUTH_STYLE;
  const key = process.env.FREEASTRO_API_KEY;
  if (!style || !key) return { url, options };

  if (style === 'header') {
    options.headers = { ...(options.headers || {}), Authorization: `Bearer ${key}` };
    return { url, options };
  }
  if (style === 'query') {
    const u = new URL(url);
    u.searchParams.set('api_key', key);
    return { url: u.toString(), options };
  }
  return { url, options };
}

async function gate() {
  const now = Date.now();
  const wait = lastCallAt + GATE_INTERVAL_MS - now;
  if (wait > 0) await sleep(wait);
  lastCallAt = Date.now();
}

async function doFetch(url, options, tries = 4, backoff = 300) {
  for (let i = 0; i < tries; i++) {
    try {
      await gate();
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        await sleep(backoff);
        backoff *= 2;
        continue;
      }
      // 4xx 非 429，直接回傳
      return res;
    } catch (e) {
      // 網路錯誤重試
      await sleep(backoff);
      backoff *= 2;
    }
  }
  throw new Error('Upstream not available after retries');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { q } = JSON.parse(event.body || '{}');
    if (!q || typeof q !== 'string') {
      throw new Error('缺少地名關鍵字 q');
    }

    // 上游地理查詢 API
    const base = process.env.FREEASTRO_GEO_URL || 'https://nominatim.openstreetmap.org/search';
    const u = new URL(base);
    // 這裡用 OSM Nominatim 預設參數（若你有自家 geo 服務，直接換掉 URL 與參數即可）
    u.searchParams.set('q', q);
    u.searchParams.set('format', 'json');
    u.searchParams.set('limit', '1');

    let url = u.toString();
    let options = { method: 'GET', headers: { 'user-agent': 'astro-natal-dev' } };
    ({ url, options } = withAuth(url, options));

    const res = await doFetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      return {
        statusCode: res.status,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'upstream_geo_error', status: res.status, body: text }),
      };
    }
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) {
      return {
        statusCode: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, message: '查無地點' }),
      };
    }

    const top = list[0];
    const latitude = parseFloat(top.lat);
    const longitude = parseFloat(top.lon);

    // 簡易台灣 +8:00 兜底
    let utc_offset;
    if (latitude >= 20 && latitude <= 26 && longitude >= 119 && longitude <= 123) {
      utc_offset = 8;
    }

    return {
      statusCode: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        latitude,
        longitude,
        display_name: top.display_name,
        utc_offset, // 可能是 undefined（非台灣）
      }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(err.message || err) }),
    };
  }
};
