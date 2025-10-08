// netlify/functions/freeastro-geo.js
// Nominatim 地名查詢（具名 UA，避免被限流）

exports.handler = async (event) => {
  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const q = (params.get('q') || '').trim();
    const lang = (params.get('lang') || 'en').trim();

    if (!q) {
      return json(400, { error: 'missing_query', message: 'q is required' });
    }

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '10');
    url.searchParams.set('accept-language', lang);

    const r = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'astro-natal-clean/1.0 (Netlify Function; contact: example@example.com)'
      }
    });

    if (!r.ok) {
      const t = await r.text();
      return json(r.status, { error: 'upstream_error', detail: t });
    }

    const arr = await r.json();
    // 精簡回傳欄位
    const list = (arr || []).map(x => ({
      display_name: x.display_name,
      lat: parseFloat(x.lat),
      lon: parseFloat(x.lon),
      class: x.class,
      type: x.type
    }));
    return json(200, list);
  } catch (e) {
    return json(502, { error: 'function_error', detail: String(e) });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}
