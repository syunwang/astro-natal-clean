// netlify/functions/freeastro-planets.js
import fetch from "node-fetch";

export async function handler(event) {
  try {
    // Parse request body from frontend
    const body = JSON.parse(event.body || "{}");
    const {
      year,
      month,
      day,
      hours,
      minutes,
      latitude,
      longitude,
      timezone
    } = body;

    // Validation check
    if (
      !year ||
      !month ||
      !day ||
      hours === undefined ||
      minutes === undefined ||
      latitude === undefined ||
      longitude === undefined ||
      timezone === undefined
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Missing required parameters",
          detail:
            "Expected: { year, month, day, hours, minutes, latitude, longitude, timezone }"
        })
      };
    }

    // Construct target URL
    const url = process.env.FREEASTRO_URL_PLANETS || process.env.FREEASTRO_BASE + "/planets";

    if (!url) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Config error",
          detail: "FREEASTRO_URL_PLANETS or FREEASTRO_BASE is missing/invalid"
        })
      };
    }

    // Prepare request body for FreeAstrology API
    const payload = {
      year: parseInt(year),
      month: parseInt(month),
      date: parseInt(day),
      hours: parseInt(hours),
      minutes: parseInt(minutes),
      lat: parseFloat(latitude),
      lon: parseFloat(longitude),
      tzone: parseFloat(timezone)
    };

    console.log("Sending payload:", payload);

    // Call FreeAstrology API
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FREEASTRO_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // Error handling
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Upstream error",
          detail: data
        })
      };
    }

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error("Server error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server error",
        detail: err.message
      })
    };
  }
}
