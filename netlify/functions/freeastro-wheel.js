// netlify/functions/freeastro-wheel.js
export async function handler(event) {
  try {
    const input = JSON.parse(event.body || '{}');

    const base = (process.env.FREEASTRO_BASE || '').replace(/\/+$/, '');
    const urlFromEnv = process.env.FREEASTRO_URL_WHEEL;
    const wheelUrl = (urlFromEnv || (base ? `${base}/western/natal-wheel-chart` : '')).trim();

    if (!wheelUrl.startsWith('http')) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Config error',
          detail: 'FREEASTRO_URL_WHEEL or FREEASTRO_BASE is missing/invalid'
        })
      };
    }

    const key = process.env.FREEASTRO_API_KEY || '';
    const authStyle = (process.env.FREEASTRO_AUTH_STYLE || 'x-api-key').trim();

    const upstream = await fetch(wheelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [authStyle]: key
      },
      body: JSON.stringify(input)
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return {
        statusCode: upstream.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Upstream error', detail: text })
      };
    }

    // forward image (png/svg) unchanged
    const buf = Buffer.from(await upstream.arrayBuffer());
    const ct = upstream.headers.get('content-type') || 'image/png';
    return {
      statusCode: 200,
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'no-store'
      },
      body: buf.toString('base64'),
      isBase64Encoded: true
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Function error', detail: String(e) })
    };
  }
}
