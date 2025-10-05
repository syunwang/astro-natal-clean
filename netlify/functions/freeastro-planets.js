// /netlify/functions/freeastro-planets.js
// Proxy to your provider: FREEASTRO_URL_PLANETS

const API_KEY    = process.env.FREEASTRO_API_KEY || '';
const API_URL    = process.env.FREEASTRO_URL_PLANETS || '';
const AUTH_STYLE = (process.env.FREEASTRO_AUTH_STYLE || 'x-api-key').trim();

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!API_URL) {
    return { statusCode: 500, body: JSON.stringify({ error: 'FREEASTRO_URL_PLANETS not set' }) };
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (AUTH_STYLE.toLowerCase() === 'authorization') {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    } else {
      headers[AUTH_STYLE] = API_KEY; // e.g. x-api-key
    }

    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: event.body || '{}'
    });

    const text = await upstream.text();
    return { statusCode: upstream.status, body: text };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Upstream error', detail: String(err) }) };
  }
}
