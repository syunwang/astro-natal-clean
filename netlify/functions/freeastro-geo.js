// 地名 -> 經緯度（預設用 OSM Nominatim）
export async function handler(event) {
  try {
    const { place } = JSON.parse(event.body || '{}');
    if (!place) return { statusCode: 400, body: JSON.stringify({ error: 'Missing place' }) };

    const base = process.env.FREEASTRO_GEO_URL
      || 'https://nominatim.openstreetmap.org/search?format=json&q=';
    const url = base + encodeURIComponent(place);

    const r = await fetch(url, {
      headers: { 'User-Agent': 'astro-natal-clean/1.0 (Netlify Function)' }
    });
    const arr = await r.json();
    if (!Array.isArray(arr) || arr.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
    }
    const top = arr[0];
    return {
      statusCode: 200,
      body: JSON.stringify({ lat: +top.lat, lon: +top.lon, display_name: top.display_name })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEO FATAL', detail: String(e) }) };
  }
}
