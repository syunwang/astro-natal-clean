// netlify/functions/freeastro-planets.js
exports.handler = async (event) => {
  try {
    const {
      FREEASTRO_BASE = 'https://json.freeastrologyapi.com',
      FREEASTRO_URL_PLANETS = '/western/planets',
      FREEASTRO_API_KEY,
    } = process.env;

    if (!FREEASTRO_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing FREEASTRO_API_KEY in env.' }) };
    }

    const payload = JSON.parse(event.body || '{}');

    const url = `${FREEASTRO_BASE}${FREEASTRO_URL_PLANETS}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': FREEASTRO_API_KEY,        // <-- REQUIRED
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    return { statusCode: res.status, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
