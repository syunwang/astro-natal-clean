// netlify/functions/natal.js
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ error: "Only POST is allowed" }),
    };
  }

  const API_URL = process.env.FREEASTRO_API_URL;   // e.g. https://json.freeastrologyapi.com/natal
  const API_KEY = process.env.FREEASTRO_API_KEY;

  let input;
  try {
    input = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Bad JSON in request body" }),
    };
  }

  // 构造上游 payload（你已有字段就照抄）
  const payload = {
    year: input.year,
    month: input.month,
    date: input.day,
    hours: input.hour,
    minutes: input.minute,
    seconds: 0,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: input.timezone,
    language: input.language || "en",
  };

  try {
    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 关键：FreeAstrologyAPI 文档偏向使用 x-api-key
        "x-api-key": API_KEY,
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();

    // 详细日志（在 Netlify Deploy log -> Functions 里看）
    console.log("NATAL upstream status:", upstream.status);
    console.log("NATAL upstream body:", text);

    if (!upstream.ok) {
      // 把上游的错误原样返回，方便你在前端看见真正原因（403/500）
      return {
        statusCode: upstream.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          error: `Upstream ${upstream.status}`,
          upstreamBody: safeJson(text),
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: text, // 成功时直接透传 API 的 JSON
    };
  } catch (err) {
    console.error("NATAL fetch failed:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Function crashed", message: String(err) }),
    };
  }
};

// 确保 parse 失败也能返回可读字符串
function safeJson(s) {
  try { return JSON.parse(s); } catch { return s; }
}
