// netlify/functions/freeastro-aspects.js
export async function handler(event) {
  try {
    const input = JSON.parse(event.body || '{}');

    // Build upstream URL
    const base = (process.env.FREEASTRO_BASE || '').replace(/\/+$/, '');
    const urlFromEnv = process.env.FREEASTRO_URL_ASPECTS;
    const aspectsUrl = (urlFromEnv || (base ? `${base}/western/aspects` : '')).trim();

    if (!aspectsUrl.startsWith('http')) {
      return json(500, {
        error: 'Config error',
        detail: 'FREEASTRO_URL_ASPECTS or FREEASTRO_BASE is missing/invalid'
      });
    }

    // Auth header name & key
    const key = process.env.FREEASTRO_API_KEY || '';
    const authStyle = (process.env.FREEASTRO_AUTH_STYLE || 'x-api-key').trim();

    // Call upstream
    const upstream = await fetch(aspectsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [authStyle]: key
      },
      body: JSON.stringify(input)
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return json(upstream.status, { error: 'Upstream error', detail: text });
    }

    const data = await upstream.json();
    return json(200, data);
  } catch (e) {
    return json(502, { error: 'Function error', detail: String(e) });
  }
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}
