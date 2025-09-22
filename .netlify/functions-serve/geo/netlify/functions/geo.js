// netlify/functions/geo.js
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: ""
    };
  }
  try {
    const url = process.env.FREEASTRO_GEO_URL;
    const place = event.queryStringParameters.place || "Tainan";
    const response = await fetch(`${url}?place=${encodeURIComponent(place)}`);
    const text = await response.text();
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: text
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
//# sourceMappingURL=geo.js.map
