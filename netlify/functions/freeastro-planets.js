import fetch from "node-fetch";
import { addChineseSigns } from "./_i18n.js";

const BASE = "https://json.freeastrologyapi.com";
const API_KEY = process.env.FREEASTRO_API_KEY;

export async function handler(event) {
  try {
    const input = JSON.parse(event.body || "{}");
    // 期望前端送來：year, month, day, hour, minute, latitude, longitude, timezone
    const payload = {
      year: +input.year, month: +input.month, day: +input.day,
      hours: +input.hour, minutes: +input.minute,  // 官方多半用 hours/minutes
      latitude: +input.latitude, longitude: +input.longitude,
      timezone: +input.timezone
    };
    const r = await fetch(`${BASE}/western/planets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    const localized = addChineseSigns(data);
    return {
      statusCode: r.status,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(localized)
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
}
