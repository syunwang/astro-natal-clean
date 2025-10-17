// netlify/functions/freeastro-geo.js
// ✅ Node 18 內建 fetch
// ✅ 接收 { q: 'tainan, taiwan' }
// ✅ 回傳 lat / lon / display_name

exports.handler = async (event) => {
  try {
    const { q } = JSON.parse(event.body || '{}');
    if (!q) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing query' }),
      };
    }

    const base =
      process.env.FREEASTRO_GEO_URL ||
      'https://nominatim.openstreetmap.org/search?format=json&q=';

    const url = base.includes('q=')
      ? `${base}${encodeURIComponent(q)}`
      : `${base}?q=${encodeURIComponent(q)}`;

    const resp = await fetch(url, {
      headers: { 'User-Agent': 'astro-natal (Netlify function)' },
    });

    if (!resp.ok) {
      return { statusCode: resp.status, body: await resp.text() };
    }

    const arr = await resp.json();
    if (!Array.isArray(arr) || arr.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Location not found' }),
      };
    }

    const best = arr[0];
    return {
      statusCode: 200,
      body: JSON.stringify({
        lat: Number(best.lat),
        lon: Number(best.lon),
        display_name: best.display_name,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message }),
    };
  }
};
