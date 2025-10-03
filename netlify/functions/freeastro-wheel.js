const upstream = process.env.FREEASTRO_URL_WHEEL; // /western/natal-wheel-chart
const API_KEY  = process.env.FREEASTRO_API_KEY;
const AUTH     = process.env.FREEASTRO_AUTH_STYLE || 'x-api-key';

export async function handler(event) {
  try {
    // same payload as planets; FreeAstrologyAPI expects POST JSON
    const input = JSON.parse(event.body || '{}');

    // NOTE: FreeAstrologyAPI doesn’t support Chinese; use 'en' here and translate on UI
    input.language = 'en';

    const r = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [AUTH]: API_KEY,
      },
      body: JSON.stringify(input),
    });

    const buf = Buffer.from(await r.arrayBuffer());
    const ct  = r.headers.get('content-type') || 'image/png';
    if (!r.ok) return { statusCode: r.status, body: buf.toString('utf8') };

    // Return the image (png or svg+xml) to the browser
    return {
      statusCode: 200,
      headers: { 'Content-Type': ct },
      body: buf.toString(ct.includes('svg') ? 'utf8' : 'base64'),
      isBase64Encoded: !ct.includes('svg'),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}
