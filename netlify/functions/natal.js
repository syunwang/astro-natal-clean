const DEFAULT_API_BASE = process.env.FREEASTRO_API_URL || "https://json.freeastrologyapi.com";
const ENDPOINT = "/natal";

const json = (statusCode, data) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  },
  body: JSON.stringify(data),
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return json(204, {});
    if (event.httpMethod === "GET") return json(200, { ok: true, message: "natal function ready" });
    if (event.httpMethod !== "POST") return json(405, { message: "Method Not Allowed" });

    let payload = {};
    try { payload = JSON.parse(event.body || "{}"); } 
    catch { return json(400, { message: "Invalid JSON body" }); }

    const required = ["year","month","day","hour","minute","latitude","longitude","timezone"];
    const missing = required.filter(k => payload[k] === undefined || payload[k] === null || payload[k] === "");
    if (missing.length) return json(400, { message: `Missing required fields: ${missing.join(", ")}` });

    let apiKey = process.env.FREEASTRO_API_KEY || "";
    const auth = event.headers?.authorization || event.headers?.Authorization;
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
      apiKey = auth.split(" ")[1].trim();
    }
    if (!apiKey) return json(401, { message: "Missing API key." });

    const url = new URL(ENDPOINT, DEFAULT_API_BASE).toString();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        year: Number(payload.year),
        month: Number(payload.month),
        day: Number(payload.day),
        hour: Number(payload.hour),
        minute: Number(payload.minute),
        seconds: Number(payload.seconds ?? 0),
        latitude: Number(payload.latitude),
        longitude: Number(payload.longitude),
        timezone: Number(payload.timezone),
        language: payload.language || "en",
      }),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) return json(res.status, { message: "Upstream API error", data });

    return json(200, { input: payload, output: data });
  } catch (err) {
    return json(500, { message: "Unexpected error", error: String(err?.message || err) });
  }
};
