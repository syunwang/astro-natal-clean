// netlify/functions/natal.js
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Only POST is allowed" });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return json(400, { error: "Bad JSON body" }); }

  const URL_BASE = (process.env.FREEASTRO_API_URL || "").trim();   // e.g. https://json.freeastrologyapi.com/natal
  let KEY = (process.env.FREEASTRO_API_KEY || "").trim();

  if (!URL_BASE) return json(500, { error: "FREEASTRO_API_URL not set" });
  if (!KEY)      return json(500, { error: "FREEASTRO_API_KEY not set" });

  // 不同寫法的嘗試
  const headerVariants = [
    { style: "x-api-key",   headers: { "x-api-key": KEY } },
    { style: "X-API-Key",   headers: { "X-API-Key": KEY } },
    { style: "apikey",      headers: { "apikey": KEY } },
    { style: "api-key",     headers: { "api-key": KEY } },
    { style: "bearer",      headers: { "authorization": `Bearer ${KEY}` } },
    { style: "auth-raw",    headers: { "authorization": KEY } },
  ];
  const queryVariants = ["api_key","apikey","key","token","auth"];

  const attempts = [];

  // 1) header 變體
  for (const v of headerVariants) {
    const res = await tryCall(URL_BASE, body, {
      "content-type": "application/json",
      ...v.headers
    });
    if (res.ok) return json(200, res.data);
    attempts.push(slimResult(v.style, URL_BASE, res));
  }

  // 2) query 變體
  for (const name of queryVariants) {
    const url = withQuery(URL_BASE, { [name]: KEY });
    const res = await tryCall(url, body, { "content-type": "application/json" });
    if (res.ok) return json(200, res.data);
    attempts.push(slimResult(`query:${name}`, url, res));
  }

  // 全部失敗，回傳摘要供除錯
  return json(attempts.at(-1)?.status || 403, {
    error: "Upstream auth failed",
    tried: attempts
  });
}

async function tryCall(url, body, headers) {
  try {
    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text } }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 502, data: { error: String(e) } };
  }
}

function slimResult(style, url, res) {
  // 只回傳部分資訊（不含金鑰）
  const brief =
    typeof res.data === "object" && res.data !== null
      ? (res.data.message || res.data.error || res.data.raw || JSON.stringify(res.data)).toString()
      : String(res.data);
  return {
    authStyleTried: style,
    upstreamUrlUsed: url,
    status: res.status,
    message: brief.slice(0, 180) // 取前 180 字方便閱讀
  };
}

function json(status, obj) {
  return { statusCode: status, headers: cors(), body: JSON.stringify(obj) };
}
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, X-API-Key, api-key, apikey"
  };
}
function withQuery(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, v);
  return u.toString();
}
