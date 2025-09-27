// netlify/functions/geo.js
export async function handler(event) {
  // --- CORS Preflight ---
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const { FREEASTRO_GEO_URL } = process.env;
  const place = event.queryStringParameters.place;

  if (!FREEASTRO_GEO_URL) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing FREEASTRO_GEO_URL" }),
    };
  }
  if (!place) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing ?place= parameter" }),
    };
  }

  try {
    const url = `${FREEASTRO_GEO_URL}/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.length) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No results found" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data[0]),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Geo lookup failed", detail: String(err) }),
    };
  }
}
