export async function handler(event) {
  try {
    const { place } = JSON.parse(event.body || '{}');
    const url = process.env.FREEASTRO_GEO_URL + encodeURIComponent(place || '');
    const r = await fetch(url, {
      headers: { 'User-Agent': 'astro-natal-clean/1.0 (Netlify Function)' },
    });
    const data = await r.json();

    const first = Array.isArray(data) && data[0] ? data[0] : null;
    if (!first) return { statusCode: 404, body: JSON.stringify({ error: 'Place not found' }) };

    return {
      statusCode: 200,
      body: JSON.stringify({
        lat: Number(first.lat),
        lon: Number(first.lon),
        display_name: first.display_name,
      }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}

netlify/functions/freeastro-planets.js
const upstream = process.env.FREEASTRO_URL_PLANETS;
const API_KEY  = process.env.FREEASTRO_API_KEY;
const AUTH     = process.env.FREEASTRO_AUTH_STYLE || 'x-api-key';

export async function handler(event) {
  try {
    const input = JSON.parse(event.body || '{}'); // year, month, day, hours, minutes, latitude, longitude, timezone

    const r = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [AUTH]: API_KEY,
      },
      body: JSON.stringify(input),
    });

    const text = await r.text();
    if (!r.ok) return { statusCode: r.status, body: text };
    return { statusCode: 200, body: text };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}

