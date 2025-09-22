// netlify/functions/natal.js

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    // FreeAstrologyAPI endpoint (ex: planets)
    const url = "https://json.freeastrologyapi.com/planets";

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ★ 用 Netlify 環境變數
        "x-api-key": process.env.FREEASTRO_API_KEY,
      },
      body: JSON.stringify({
        year: body.year,
        month: body.month,
        date: body.day,         // API 需要 "date"
        hours: body.hour,       // API 需要 "hours"
        minutes: body.minute,   // API 需要 "minutes"
        seconds: body.seconds ?? 0,
        latitude: body.latitude,
        longitude: body.longitude,
        timezone: body.timezone,
      }),
    });

    const data = await upstream.json();
    return {
      statusCode: upstream.status,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
