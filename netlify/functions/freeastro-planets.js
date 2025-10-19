// netlify/functions/freeastro-planets.js
// ✅ 官方格式版（2025-10 修正版）
// For FreeAstrologyAPI.com - /western/planets endpoint

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { message: "Method Not Allowed" });
  }

  let input;
  try {
    input = JSON.parse(event.body);
  } catch {
    return json(400, { message: "Invalid JSON" });
  }

  const API_KEY = process.env.FREEASTRO_API_KEY;
  const BASE = process.env.FREEASTRO_BASE || "https://json.freeastrologyapi.com";
  const PATH = process.env.FREEASTRO_URL_PLANETS || "/western/planets";

  if (!API_KEY) {
    return json(500, { error: "Missing FREEASTRO_API_KEY" });
  }

  // ⚙️ 官方要求的格式（全字串＋正確欄位名）
  const body = {
    year: String(input.year ?? ""),
    month: String(input.month ?? ""),
    day: String(input.day ?? ""),
    hour: String(input.hour ?? ""),
    minute: String(input.min ?? input.minute ?? ""),
    latitude: String(input.lat ?? input.latitude ?? ""),
    longitude: String(input.lon ?? input.longitude ?? ""),
    timezone: String(input.tzone ?? input.timezone ?? ""),
    house: String(input.house_system ?? input.house ?? "placidus"),
    lang: String(input.lang ?? "en")
  };

  const url = `${BASE.replace(/\/+$/, "")}${PATH.startsWith("/") ? "" : "/"}${PATH}`;

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }

    return json(response.status, {
      request: { url, body, headers: { "x-api-key": "***" } },
      response: result
    });
  } catch (err) {
    return json(502, { error: String(err) });
  }
};

function json(status, data) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  };
}
