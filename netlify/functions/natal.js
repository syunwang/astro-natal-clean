// netlify/functions/natal.js
const fetch = global.fetch; // Node 18+ on Netlify has native fetch

const ALLOWED_ORIGIN = "*"; // loosen CORS for now while debugging

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Only POST is allowed" });
  }

  // ---- env ----
  const API_URL = process.env.FREEASTRO_API_URL; // e.g. https://json.freeastrologyapi.com/natal
  const API_KEY = process.env.FREEASTRO_API_KEY;

  if (!API_URL) return json(500, { error: "SERVER_MISCONFIG: FREEASTRO_API_URL missing" });
  if (!API_KEY) return json(500, { error: "SERVER_MISCONFIG: FREEASTRO_API_KEY missing" });

  // ---- body ----
  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { error: "Invalid JSON body" });
  }

  try {
    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        // Many APIs accept one of these two. We send both.
        "x-api-key": API_KEY,
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(input),
    });

    const text = await upstream.text();
    const isJson = (upstream.headers.get("content-type") || "").includes("application/json");
    const payload = isJson ? safeJSON(text) : { raw: text };

    if (!upstream.ok) {
      return json(upstream.status, {
        error: `Upstream ${upstream.status}`,
        upstreamBody: payload,
      });
    }

    return json(200, {
      statusCode: upstream.status,
      input,
      output: payload, // keep raw API result so UI can format it
    });
  } catch (err) {
    return json(500, { error: "NETWORK_ERROR", message: String(err && err.message ? err.message : err) });
  }
};

// helpers
function safeJSON(t) { try { return JSON.parse(t); } catch { return { raw: t }; } }
function json(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyObj),
  };
}
