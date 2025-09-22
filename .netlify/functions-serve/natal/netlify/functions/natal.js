// netlify/functions/natal.js
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
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const apiUrl = process.env.FREEASTRO_API_URL;
    const apiKey = process.env.FREEASTRO_API_KEY;
    const body = JSON.parse(event.body || "{}");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey ? `Bearer ${apiKey}` : void 0
      },
      body: JSON.stringify(body)
    });
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
//# sourceMappingURL=natal.js.map
