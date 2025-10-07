// freeastro-planets.js
// 代理 FreeAstrology API planets 端點（使用全域 fetch，勿引入 node-fetch）

const BASE = process.env.FREEASTRO_BASE || "https://json.freeastrologyapi.com";
const PLANETS_URL =
  process.env.FREEASTRO_URL_PLANETS || `${BASE}/western/planets`;

const API_KEY = process.env.FREEASTRO_API_KEY || "";
const AUTH_STYLE = (process.env.FREEASTRO_AUTH_STYLE || "x-api-key").toLowerCase();

const commonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** 根據 AUTH_STYLE 建立上游請求的 URL 與 headers */
function buildUpstream(url) {
  const headers = { "Content-Type": "application/json" };
  let finalUrl = url;

  if (!API_KEY) return { url: finalUrl, headers }; // 無金鑰就只回傳預設 headers

  switch (AUTH_STYLE) {
    case "x-api-key":
    case "x-api-key-lc":
    case "x-api-key-uc":
      headers["x-api-key"] = API_KEY;
      break;
    case "x-api-key-cap":
    case "x-api-key-title":
    case "x-api-key-proper":
    case "x-api-key-alt":
    case "x-api-key-alt2":
    case "x-api-key-alt3":
      headers["X-API-Key"] = API_KEY;
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
      // 預設使用 x-api-key
      headers["x-api-key"] = API_KEY;
  }
  return { url: finalUrl, headers };
}

/** 簡單的 body 驗證（避免 upstream 回 400: Invalid request body） */
function validateInput(obj) {
  const need = ["year", "month", "day", "hours", "minutes", "latitude", "longitude", "tz"];
  for (const k of need) {
    if (obj[k] === undefined || obj[k] === null || obj[k] === "") return false;
  }
  return true;
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
        body: JSON.stringify({ error: "Invalid request body (missing fields)" }),
      };
    }

    const { url, headers } = buildUpstream(PLANETS_URL);
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!r.ok) {
      return {
        statusCode: r.status,
        headers: commonHeaders,
        body: JSON.stringify({
          error: "Upstream error",
          status: r.status,
          detail: json,
          url,
        }),
      };
    }

    // 統一輸出格式：{ statusCode: 200, output: [...] }
    const output = json?.output || json?.data || json;
    return {
      statusCode: 200,
      headers: { ...commonHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ statusCode: 200, output }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: commonHeaders,
      body: JSON.stringify({ error: "Planets upstream error", detail: String(err) }),
    };
  }
}
