// freeastro-geo.js
// 以 Nominatim 將地名轉為經緯度（使用全域 fetch，勿引入 node-fetch）

const GEO_URL =
  process.env.FREEASTRO_GEO_URL ||
  "https://nominatim.openstreetmap.org/search?format=json&q=";

const commonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: commonHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { place } = JSON.parse(event.body || "{}");
    if (!place) {
      return {
        statusCode: 400,
        headers: commonHeaders,
        body: JSON.stringify({ error: "Missing 'place'" }),
      };
    }

    const url = GEO_URL + encodeURIComponent(place);
    const r = await fetch(url, {
      headers: {
        // Nominatim 強制要求提供 User-Agent
        "User-Agent": "astro-natal-clean.netlify.app (Netlify Function)",
      },
    });
    const arr = await r.json();
    if (!Array.isArray(arr) || arr.length === 0) {
      return {
        statusCode: 404,
        headers: commonHeaders,
        body: JSON.stringify({ error: "Place not found" }),
      };
    }
    const best = arr[0];
    return {
      statusCode: 200,
      headers: commonHeaders,
      body: JSON.stringify({
        lat: parseFloat(best.lat),
        lon: parseFloat(best.lon),
        display_name: best.display_name,
      }),
    };
  } catch (err) { 
    return {
      statusCode: 500,
      headers: commonHeaders,
      body: JSON.stringify({ error: "Geo upstream error", detail: String(err) }),
    };
  }
}
