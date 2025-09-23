// netlify/functions/geo.js
var DEFAULT_GEO_URL = process.env.FREEASTRO_GEO_URL || "https://nominatim.openstreetmap.org/search";
var json = (statusCode, data) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  },
  body: JSON.stringify(data)
});
exports.handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return json(204, {});
    if (event.httpMethod !== "GET") return json(405, { message: "Method Not Allowed" });
    const place = event.queryStringParameters?.place || "";
    if (!place) return json(400, { message: "Missing query ?place=" });
    const url = new URL(DEFAULT_GEO_URL);
    url.searchParams.set("q", place);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "astro-natal-clean/1.0 (Netlify Function)" }
    });
    if (!res.ok) {
      const txt = await res.text();
      return json(res.status, { message: "Upstream error", raw: txt });
    }
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) {
      return json(404, { message: "No result", place });
    }
    const first = arr[0];
    return json(200, {
      lat: Number(first.lat),
      lon: Number(first.lon),
      display_name: first.display_name,
      raw: first
    });
  } catch (err) {
    return json(500, { message: "Unexpected error", error: String(err?.message || err) });
  }
};
//# sourceMappingURL=geo.js.map
