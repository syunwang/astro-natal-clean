// netlify/functions/freeastro-wheel.js
export async function handler(event) {
  try {
    const {
      year, month, day, hours, minutes,
      latitude, longitude, timezone, language
    } = JSON.parse(event.body || "{}");

    // 基本參數檢查
    const must = { year, month, day, hours, minutes, latitude, longitude, timezone };
    for (const [k, v] of Object.entries(must)) {
      if (v === undefined || v === null || v === "") {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "BadRequest", detail: `Missing ${k}` })
        };
      }
    }

    // ---- 統一組出上游 URL ----
    // 優先用 FREEASTRO_URL_WHEEL；其次用 FREEASTRO_API_URL 或 FREEASTRO_BASE 推導
    const env = process.env;
    let upstream =
      env.FREEASTRO_URL_WHEEL ||
      (env.FREEASTRO_API_URL?.replace(/\/natal$/i, "/western/natal-wheel-chart")) ||
      (env.FREEASTRO_BASE ? `${env.FREEASTRO_BASE.replace(/\/$/, "")}/natal-wheel-chart` : null);

    if (!upstream) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Config error", detail: "FREEASTRO_URL_WHEEL or FREEASTRO_API_URL or FREEASTRO_BASE is required" })
      };
    }

    // ---- 認證（預設 x-api-key）----
    const API_KEY = env.FREEASTRO_API_KEY || "";
    const AUTH_STYLE = (env.FREEASTRO_AUTH_STYLE || "x-api-key").toLowerCase();

    const headers = { "Content-Type": "application/json", "Accept": "image/png,image/svg+xml" };
    if (API_KEY) {
      switch (AUTH_STYLE) {
        case "x-api-key":
        case "apikey":
        case "api-key":
          headers["x-api-key"] = API_KEY;
          break;
        case "bearer":
          headers["Authorization"] = `Bearer ${API_KEY}`;
          break;
        default:
          headers["x-api-key"] = API_KEY; // 預設
      }
    }

    // ---- 上游 payload（沿用你前端送的欄位）----
    const payload = {
      year, month, day, hours, minutes,
      latitude, longitude, timezone,
      language: language || "zh" // 可空
    };

    const r = await fetch(upstream, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const text = await r.text();
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Upstream error",
          status: r.status,
          detail: text.substring(0, 2000),
          url: upstream
        })
      };
    }

    const contentType = r.headers.get("content-type") || "image/png";
    const ab = await r.arrayBuffer();
    const base64 = Buffer.from(ab).toString("base64");

    return {
      statusCode: 200,
      headers: { "Content-Type": contentType },
      body: base64,
      isBase64Encoded: true
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "WHEEL Function crashed", detail: String(err?.message || err) })
    };
  }
}
