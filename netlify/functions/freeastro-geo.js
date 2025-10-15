// netlify/functions/freeastro-geo.js

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const DEFAULT_GEO = 'https://nominatim.openstreetmap.org/search?format=json&q=';

// simple backoff retry
async function tryFetch(url, opts, retries = 2, backoff = 600) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(r => setTimeout(r, backoff));
    return tryFetch(url, opts, retries - 1, backoff * 2);
  }
}

exports.handler = async (event) => {
  try {
    const { q } = JSON.parse(event.body || '{}');
    if (!q) {
      return { statusCode: 400, body: JSON.stringify({ message: '缺少地名關鍵字 q' }) };
    }

    const GEO_BASE = process.env.FREEASTRO_GEO_URL || DEFAULT_GEO;
    const url = `${GEO_BASE}${encodeURIComponent(q)}&addressdetails=1&limit=1`;

    const headers = {
      'User-Agent': 'astro-natal-app/1.0 (Netlify Function; contact: your-email@example.com)',
      'Accept': 'application/json',
    };

    console.log('[Geo] →', url);

    const res = await tryFetch(url, { headers }, 2, 600);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ message: '查無地點' }) };
    }

    const best = data[0];
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        lat: parseFloat(best.lat),
        lon: parseFloat(best.lon),
        display_name: best.display_name,
      })
    };
  } catch (err) {
    console.error('[Geo] Exception:', err);
    return { statusCode: 500, body: JSON.stringify({ message: 'Internal error' }) };
  }
};
