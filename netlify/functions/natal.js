// netlify/functions/natal.js
export async function handler(event) {
  // 预检 CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Only POST is allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Bad JSON body" });
  }

  const API_URL = process.env.FREEASTRO_API_URL;   // 例如 https://json.freeastrologyapi.com/natal
  const API_KEY = process.env.FREEASTRO_API_KEY || "";

  if (!API_URL) return json(500, { error: "FREEASTRO_API_URL not set" });

  // 三段式认证尝试
  const trials = [
    { style: "x-api-key", headers: { "x-api-key": API_KEY, "content-type": "application/json" }, url: API_URL },
    { style: "bearer",    headers: { "authorization": `Bearer ${API_KEY}`, "content-type": "application/json" }, url: API_URL },
    { style: "query",     headers: { "content-type": "application/json" }, url: withQuery(API_URL, { api_key: API_KEY }) }
  ];

  for (const t of trials) {
    try {
      const upstream = await fetch(t.url, {
        method: "POST",
        headers: t.headers,
        body: JSON.stringify(body)
      });

      const text = await upstream.text();
      let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

      // 成功就直接回
      if (upstream.ok) {
        return json(200, data);
      }

      // 失败：把失败的详情也带回（给前端显示）
      // 先试下一种认证；如果这就是最后一种，就回传
      if (t.style === "query") {
        return json(upstream.status, {
          upstreamStatus: upstream.status,
          upstreamUrlUsed: t.url,
          authStyleTried: t.style,
          data
        });
      }
      // 否则继续下一轮
    } catch (e) {
      // 网络错误，直接返回 502
      return json(502, { error: "Upstream fetch failed", message: String(e) });
    }
  }

  // 不应到这里
  return json(500, { error: "Unknown error" });
}

// 小工具
function json(status, obj) {
  return {
    statusCode: status,
    headers: corsHeaders(),
    body: JSON.stringify(obj)
  };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key"
  };
}

function withQuery(url, params) {
  const u = new URL(url);
  Object.entries(params).forEach(([k, v]) => v != null && u.searchParams.set(k, v));
  return u.toString();
}
