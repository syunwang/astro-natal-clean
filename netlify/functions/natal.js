// netlify/functions/natal.js
export default async (req, context) => {
  const allow = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (req.method === "OPTIONS") {
    return new Response("", { status: 204, headers: allow });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST is allowed" }), {
      status: 405,
      headers: { ...allow, "Content-Type": "application/json" }
    });
  }

  try {
    const env = process.env;
    const API_URL = env.FREEASTRO_API_URL; // e.g. https://json.freeastrologyapi.com/natal
    const API_KEY = env.FREEASTRO_API_KEY;

    if (!API_URL || !API_KEY) {
      return new Response(JSON.stringify({
        error: "Missing API config",
        hint: "Check FREEASTRO_API_URL and FREEASTRO_API_KEY in Netlify > Site settings > Environment variables"
      }), { status: 500, headers: { ...allow, "Content-Type": "application/json" }});
    }

    const payload = await req.json();

    // --- try 1: x-api-key header
    let upstreamRes = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify(payload)
    });

    // if unauthorized/forbidden, try a different auth style
    if (upstreamRes.status === 401 || upstreamRes.status === 403) {
      // --- try 2: Authorization: Bearer
      upstreamRes = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
        body: JSON.stringify(payload)
      });

      if (upstreamRes.status === 401 || upstreamRes.status === 403) {
        // --- try 3: query string ?api_key=
        const url = new URL(API_URL);
        url.searchParams.set("api_key", API_KEY);
        upstreamRes = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }
    }

    const text = await upstreamRes.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    // pass through success; otherwise include debug
    const ok = upstreamRes.ok;
    const body = ok ? data : {
      upstreamStatus: upstreamRes.status,
      upstreamUrlUsed: API_URL,
      authTried: ["x-api-key", "bearer", "query"],
      data
    };

    return new Response(JSON.stringify(body), {
      status: ok ? 200 : upstreamRes.status,
      headers: { ...allow, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...allow, "Content-Type": "application/json" }
    });
  }
};
