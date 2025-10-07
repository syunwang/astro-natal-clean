// freeastro-wheel.js
// 代理 FreeAstrology API 星盤圖端點，回傳圖片（以 base64 轉回給前端）

const BASE = process.env.FREEASTRO_BASE || "https://json.freeastrologyapi.com";
const WHEEL_URL =
  process.env.FREEASTRO_URL_WHEEL || `${BASE}/western/natal-wheel-chart`;

const API_KEY = process.env.FREEASTRO_API_KEY || "";
const AUTH_STYLE = (process.env.FREEASTRO_AUTH_STYLE || "x-api-key").toLowerCase();

const commonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

function buildUpstream(url) {
  const headers = { "Content-Type": "application/json" };
  let finalUrl = url;

  if (!API_KEY) return { url: finalUrl, headers };

  switch (AUTH_STYLE) {
    case "x-api-key":
      headers["x-api-key"] = API_KEY;
      break;
    case "apikey":
    case "api-key":
      headers["apikey"] = API_KEY;
      break;
    case "bearer":
      headers["Authorization"] = `Bearer ${API_KEY}`;
      break;
    case "auth-raw":
      headers["Authorization"] = API_KEY;
      break;
    case "query:api_key":
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + "api_key=" + encodeURIComponent(API_KEY);
      break;
    case "query:apikey":
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + "apikey=" + encodeURIComponent(API_KEY);
      break;
    case "query:key":
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + "key=" + encodeURIComponent(API_KEY);
      break;
    case "query:token":
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(API_KEY);
      break;
    case "query:auth":
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + "auth=" + encodeURIComponent(API_KEY);
      break;
    default:
      headers["x-api-key"] = API_KEY;
  }
  return { url: finalUrl, headers };
}

function validateInput(obj) {
  const need = ["year", "month", "day", "hours", "minutes", "latitude", "longitude", "tz"];
  for (const k of need) {
    if (obj[k] === undefined || obj[k] === null || obj[k] === "") return false;
  }
  return true;
}

function toBase64(ab) {
  const uint8 = new Uint8Array(ab);
  let str = "";
  for (let i = 0; i < uint8.length; i++) str += String.fromCharCode(uint8[i]);
  return Buffer.from(str, "binary").toString("base64");
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: commonHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const input = JSON.parse(event.body || "{}");
    if (!validateInput(input)) {
      return {
        statusCode: 400,
        headers: commonHeaders,
        body: JSON.stringify({ message: "Invalid request body" }),
      };
    }

    const { url, headers } = buildUpstream(WHEEL_URL);
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return {
        statusCode: r.status,
        headers: commonHeaders,
        body: JSON.stringify({
          error: "Upstream error",
          status: r.status,
          detail: text || "fetch failed",
          url,
        }),
      };
    }

    const ct = r.headers.get("content-type") || "image/png";
    const ab = await r.arrayBuffer();
    const b64 = toBase64(ab);

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: { ...commonHeaders, "Content-Type": ct },
      body: b64,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: commonHeaders,
      body: JSON.stringify({ error: "Wheel upstream error", detail: String(err) }),
    };
  }
}
