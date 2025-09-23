// netlify/functions/natal.js

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const cfgUrl = process.env.FREEASTRO_API_URL;
    const cfgKey = process.env.FREEASTRO_API_KEY;

    if (!cfgUrl || !cfgKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing FREEASTRO_API_URL or FREEASTRO_API_KEY" }),
      };
    }

    const input = JSON.parse(event.body || "{}");

    const payload = {
      year: input.year,
      month: input.month,
      day: input.day,
      hours: input.hour,
      minutes: input.minute,
      seconds: input.seconds || 0,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
      language: input.language || "en",
    };

    // ✅ 正确的 Header
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${cfgKey}`,
    };

    const upstream = await fetch(cfgUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const raw = await upstream.text();

    if (!upstream.ok) {
      return {
        statusCode: upstream.status,
        body: JSON.stringify({
          error: `NATAL HTTP ${upstream.status}`,
          providerBody: raw,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: raw,
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}
