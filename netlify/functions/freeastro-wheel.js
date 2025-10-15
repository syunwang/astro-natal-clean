// netlify/functions/freeastro-wheel.js
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
      return res;
    } catch (e) {
      await sleep(backoff);
      backoff *= 2;
    }
  }
  throw new Error('Upstream not available after retries');
}

function taiwanFallbackUtcOffset(lat, lon, given) {
  if (given !== undefined && given !== null && given !== '') return given;
  if (lat >= 20 && lat <= 26 && lon >= 119 && lon <= 123) return 8;
  return given;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const {
      date, time, utc_offset, latitude, longitude, house_system, lang, name,
    } = payload;

    if (!date || !time || latitude == null || longitude == null || !house_system || !lang) {
      throw new Error('缺少必要欄位：date、time、latitude、longitude、house_system、lang');
    }

    const off = taiwanFallbackUtcOffset(Number(latitude), Number(longitude), utc_offset);

    const base = process.env.FREEASTRO_URL_WHEEL
      || (process.env.FREEASTRO_BASE ? `${process.env.FREEASTRO_BASE}/western/wheel` : '');
    if (!base) throw new Error('FREEASTRO_URL_WHEEL 或 FREEASTRO_BASE 尚未設定');

    let url = base;
    let body = {
      date,
      time,
      utc_offset: off,
      latitude: Number(latitude),
      longitude: Number(longitude),
      house_system,
      lang,
      name,
    };

    let options = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };

    ({ url, options } = withAuth(url, options));

    const res = await doFetch(url, options);

    // 嘗試判斷上游回來的是圖片或 JSON
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('image/') || ct.includes('svg')) {
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = ct.includes('svg') ? 'image/svg+xml' : (ct.split(';')[0] || 'application/octet-stream');
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
      return {
        statusCode: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify({ ok: true, imageDataUrl: dataUrl }),
      };
    }

    // 其他類型就直接透傳（盡量轉 JSON）
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return {
      statusCode: res.status,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(err.message || err) }),
    };
  }
};
