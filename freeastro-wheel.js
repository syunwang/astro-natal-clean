// netlify/functions/freeastro-wheel.js
export default async (req, ctx) => {
  try {
    const payload = await req.json();

    const url = process.env.FREEASTRO_URL_WHEEL;
    const key = process.env.FREEASTRO_API_KEY;
    const authHeader = process.env.FREEASTRO_AUTH_STYLE || 'x-api-key';

    const upstream = await fetch(url, {
      method: 'POST',                                   // 若供應商要求 GET 就改
      headers: { 'Content-Type': 'application/json', [authHeader]: key },
      body: JSON.stringify(payload)
    });

    const buf = await upstream.arrayBuffer();
    const ct = upstream.headers.get('content-type') || 'application/octet-stream';

    return new Response(buf, { status: upstream.status, headers: { 'Content-Type': ct }});
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
