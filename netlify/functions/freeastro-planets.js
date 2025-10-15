// netlify/functions/freeastro-planets.js
import fetch from "node-fetch";

export const handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || "{}");

    if (!payload.date || !payload.time || !payload.latitude || !payload.longitude) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields (date, time, latitude, longitude)" }),
      };
    }

    const apiKey = process.env.FREEASTRO_API_KEY;
    const baseUrl = process.env.FREEASTRO_URL_PLANETS || `${process.env.FREEASTRO_BASE}/planets`;

    const headers = { "Content-Type": "application/json" };
    headers["Authorization"] = `Bearer ${apiKey}`;

    // 第一次嘗試：header 模式
    let res = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    // 如果403 或 401，改用 query 模式
    if (res.status === 403 || res.status === 401) {
      console.warn(`[Planets] ⚠️ Header auth failed (${res.status}), retry with query auth`);
      let url = baseUrl.includes("?")
        ? `${baseUrl}&api_key=${apiKey}`
        : `${baseUrl}?api_key=${apiKey}`;

      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      console.error(`[Planets] ❌ ${res.status}`, data);
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.message || "Planets request failed", raw: data }),
      };
    }

    console.log(`[Planets] ✅ OK`);
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("[Planets] Exception:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", details: err.message }),
    };
  }
};
