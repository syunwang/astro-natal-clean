// netlify/functions/freeastro-planets.js
export async function handler(event) {
  try {
    const input = JSON.parse(event.body || '{}');

    // Build the upstream URL robustly
    const base = (process.env.FREEASTRO_BASE || '').replace(/\/+$/, '');
    const urlFromEnv = process.env.FREEASTRO_URL_PLANETS;
    const planetsUrl = (urlFromEnv || (base ? `${base}/western/planets` : '')).trim();

    if (!planetsUrl.startsWith('http')) {
      return resp(500, {
        error: 'Config error',
        detail: 'FREEASTRO_URL_PLANETS or FREEASTRO_BASE is missing/invalid'
      });
    }

    // Auth header
    const key = process.env.FREEASTRO_API_KEY || '';
    const authStyle = (process.env.FREEASTRO_AUTH_STYLE || 'x-api-key').trim();

    const upstream = await fetch(planetsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [authStyle]: key
      },
      body: JSON.stringify(input)
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return resp(upstream.status, {
        error: 'Upstream error',
        detail: text
      });
    }

    const data = await upstream.json();
    return resp(200, data);
  } catch (e) {
    return resp(502, { error: 'Function error', detail: String(e) });
  }
}

function resp(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}
