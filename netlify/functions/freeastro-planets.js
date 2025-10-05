// No imports for fetch – Node 18 on Netlify has global fetch.

// Simple helper: read a required env var or throw a clear error
function need(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    // Expecting: year, month, day, hours, minutes, latitude, longitude, timezone, language
    const required = [
      "year", "month", "day", "hours", "minutes",
      "latitude", "longitude", "timezone", "language"
    ];
    for (const k of required) {
      if (body[k] === undefined || body[k] === null || body[k] === "") {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid request body", detail: `Missing field: ${k}` })
        };
      }
    }

    // Build upstream URL from env (two supported styles)
    // 1) Single full URL in FREEASTRO_URL_PLANETS
    // 2) Or base + path: FREEASTRO_BASE + "/planets"
    const planetsUrl =
      process.env.FREEASTRO_URL_PLANETS &&
      process.env.FREEASTRO_URL_PLANETS.trim().length > 0
        ? process.env.FREEASTRO_URL_PLANETS
        : `${need("FREEASTRO_BASE").replace(/\/+$/, "")}/planets`;

    const apiKey   = need("FREEASTRO_API_KEY");
    const authKey  = (process.env.FREEASTRO_AUTH_STYLE || "x-api-key").trim();

    const r = await fetch(planetsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [authKey]: apiKey
      },
      body: JSON.stringify({
        year:      Number(body.year),
        month:     Number(body.month),
        day:       Number(body.day),
        hours:     Number(body.hours),
        minutes:   Number(body.minutes),
        latitude:  Number(body.latitude),
        longitude: Number(body.longitude),
        timezone:  Number(body.timezone),
        language:  String(body.language || "en")
      })
    });

    // Pass upstream errors through, but make them JSON
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return {
        statusCode: r.status,
        body: JSON.stringify({ error: "Upstream error", detail: text || r.statusText })
      };
    }

    const data = await r.json();
    return { statusCode: 200, body: JSON.stringify(data) };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "PLANETS function error", detail: String(err?.message || err) })
    };
  }
}
