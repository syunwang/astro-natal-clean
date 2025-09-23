// netlify/functions/natal.js
export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST is allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const {
      FREEASTRO_API_URL,       // e.g. https://json.freeastrologyapi.com/v1/natal  (CHECK DOCS!)
      FREEASTRO_API_KEY,       // your key
      FREEASTRO_AUTH_STYLE,    // one of: x-api-key | bearer | query
    } = process.env;

    if (!FREEASTRO_API_URL || !FREEASTRO_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing FREEASTRO_API_URL or FREEASTRO_API_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const input = await req.json();

    // Build request according to auth style
    const headers = { "Content-Type": "application/json" };
    let url = FREEASTRO_API_URL;

    switch ((FREEASTRO_AUTH_STYLE || "x-api-key").toLowerCase()) {
      case "bearer":
        headers.Authorization = `Bearer ${FREEASTRO_API_KEY}`;
        break;
      case "query": {
        // attach ?api_key=... (change the param name if docs say otherwise)
        const u = new URL(url);
        u.searchParams.set("api_key", FREEASTRO_API_KEY);
        url = u.toString();
        break;
      }
      case "x-api-key":
      default:
        headers["x-api-key"] = FREEASTRO_API_KEY;
    }

    // NOTE: If the API wants GET, change method accordingly (per docs)
    const upstreamRes = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    const raw = await upstreamRes.text();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw };
    }

    // Return upstream status, plus a tiny bit of debug (no secrets)
    return new Response(
      JSON.stringify({
        upstreamStatus: upstreamRes.status,
        upstreamUrlUsed: url,
        authStyle: (FREEASTRO_AUTH_STYLE || "x-api-key").toLowerCase(),
        data: payload,
      }),
      {
        status: upstreamRes.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Proxy error", detail: String(err) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
};
