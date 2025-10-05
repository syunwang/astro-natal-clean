// netlify/functions/freeastro-geo.js
export async function handler(event) {
  try {
    const { place } = JSON.parse(event.body || '{}');

    if (!place) {
      return json(400, { error: 'Missing "place"' });
    }

    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
      encodeURIComponent(place);

    // Identify your app/site here (you said it should be astro-natal-clean)
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'astro-natal-clean/1.0 (Netlify Function)'
      }
    });

    if (!r.ok) {
      return json(r.status, { error: `Upstream error ${r.status}` });
    }

    const arr = await r.json();
    if (!Array.isArray(arr) || arr.length === 0) {
      return json(404, { error: 'Place not found' });
    }

    const hit = arr[0];
    return json(200, {
      lat: Number(hit.lat),
      lon: Number(hit.lon),
      display_name: hit.display_name
    });
  } catch (err) {
    return json(500, { error: String(err?.message || err) });
  }
}

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  };
}
