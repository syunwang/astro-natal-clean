// netlify/functions/natal.js
export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST is allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { FREEASTRO_API_URL, FREEASTRO_API_KEY } = process.env;
    if (!FREEASTRO_API_URL || !FREEASTRO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing FREEASTRO_API_URL or FREEASTRO_API_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const input = await req.json();

    // Build upstream request – IMPORTANT: no Authorization header!
    const upstreamRes = await fetch(FREEASTRO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": FREEASTRO_API_KEY, // <-- use only this
      },
      body: JSON.stringify(input),
    });

    const text = await upstreamRes.text();

    // Try to parse JSON; if not, pass through raw text
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }

    // Return upstream status & payload
    return new Response(JSON.stringify(payload), {
      status: upstreamRes.status,
      headers: {
        "Content-Type": "application/json",
        // CORS for browser
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Proxy error", detail: String(err) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};
