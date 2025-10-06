// netlify/functions/freeastro-planets.js
export async function handler(event) {
  try {
    const url = process.env.FREEASTRO_URL_PLANETS;
    const apiKey = process.env.FREEASTRO_API_KEY;

    if (!url || !apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Config error",
          detail: "FREEASTRO_URL_PLANETS or FREEASTRO_API_KEY is missing",
        }),
      };
    }

    // Parse input
    const body = JSON.parse(event.body || "{}");
    const { year, month, day, hour, minute, latitude, longitude, timezone } = body;

    // ✅ Validate required fields
    if (
      !year ||
      !month ||
      !day ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing required fields",
          detail:
            "year, month, day, latitude, and longitude must be provided.",
        }),
      };
    }

    // ✅ Construct request body for FreeAstrology API
    const requestBody = {
      year: Number(year),
      month: Number(month),
      date: Number(day),
      hours: Number(hour) || 0,
      minutes: Number(minute) || 0,
      latitude: Number(latitude),
      longitude: Number(longitude),
      timezone: Number(timezone) || 0,
    };

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await r.json();

    if (!r.ok) {
      return {
        statusCode: r.status,
        body: JSON.stringify({
          error: "Upstream error",
          detail: data,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server error",
        detail: err.message,
      }),
    };
  }
}
