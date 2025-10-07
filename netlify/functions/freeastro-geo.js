// 地名 -> 經緯度
// FREEASTRO_GEO_URL = https://nominatim.openstreetmap.org/search?format=json&q=

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'Method Not Allowed' });
  }

  let place = '';
  try { place = (JSON.parse(event.body || '{}').place || '').trim(); }
  catch { return resp(400, { error: 'Bad Request', detail: 'Body is not valid JSON' }); }

  if (!place) return resp(400, { error: 'Bad Request', detail: 'Missing place' });

  const base = process.env.FREEASTRO_GEO_URL || 'https://nominatim.openstreetmap.org/search?format=json&q=';
  const url = `${base}${encodeURIComponent(place)}`;

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'astro-natal-clean/1.0 (Netlify Function)' }
    });
    const arr = await r.json();
    if (!Array.isArray(arr) || !arr.length) return resp(404, { error: 'Not found', detail: place });

    const best = arr[0];
    return resp(200, {
      lat: +best.lat, lon: +best.lon, display_name: best.display_name
    });
  } catch (e) {
    return resp(500, { error: 'Geo error', detail: String(e) });
  }
}

function resp(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(obj),
  };
}
