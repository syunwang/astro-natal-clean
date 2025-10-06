// netlify/functions/freeastro-planets.js
export async function handler(event) {
  try {
    const {
      year, month, day, hours, minutes,
      latitude, longitude, timezone, language
    } = JSON.parse(event.body || "{}");

    const must = { year, month, day, hours, minutes, latitude, longitude, timezone };
    for (const [k, v] of Object.entries(must)) {
      if (v === undefined || v === null || v === "") {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "BadRequest", detail: `Missing ${k}` })
        };
      }
    }

    // URL：優先 FREEASTRO_URL_PLANETS；次選 API_URL 或 BASE 推導
    const env = process.env;
    let upstream =
      env.FREEASTRO_URL_PLANETS ||
      (env.FREEASTRO_API_URL?.replace(/\/natal$/i, "/western/planets")) ||
      (env.FREEASTRO_BASE ? `${env.FREEASTRO_BASE.replace(/\/$/, "")}/planets` : null);

    if (!upstream) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Config error", detail: "FREEASTRO_URL_PLANETS or FREEASTRO_API_URL or FREEASTRO_BASE is required" })
      };
    }

    const API_KEY = env.FREEASTRO_API_KEY || "";
    const AUTH_STYLE = (env.FREEASTRO_AUTH_STYLE || "x-api-key").toLowerCase();

    const headers = { "Content-Type": "application/json" };
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
          headers["x-api-key"] = API_KEY;
      }
    }

    const payload = {
      year, month, day, hours, minutes,
      latitude, longitude, timezone,
      language: language || "zh"
    };

    const r = await fetch(upstream, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    const ct = r.headers.get("content-type") || "";
    const isJSON = ct.includes("application/json");

    if (!r.ok) {
      const msg = isJSON ? await r.json() : await r.text();
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Upstream error", status: r.status, detail: msg, url: upstream })
      };
    }

    const data = isJSON ? await r.json() : await r.text();
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "PLANETS Function crashed", detail: String(err?.message || err) }) };
  }
}
