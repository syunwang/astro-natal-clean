// netlify/functions/freeastro-planets.js
export default async (req, ctx) => {
  try {
    const payload = await req.json();
    // 你要傳什麼就從前端帶什麼，常見如下：
    // { year, month, day, hours, minutes, latitude, longitude, timezone, language }

    const url = process.env.FREEASTRO_URL_PLANETS || process.env.FREEASTRO_API_URL;
    const key = process.env.FREEASTRO_API_KEY;
    const authHeader = process.env.FREEASTRO_AUTH_STYLE || 'x-api-key';

    const upstream = await fetch(url, {
      method: 'POST',                                   // 有些供應商是 GET，則改成 'GET'
      headers: { 'Content-Type': 'application/json', [authHeader]: key },
      body: JSON.stringify(payload)
    });

    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      status: upstream.status, headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
