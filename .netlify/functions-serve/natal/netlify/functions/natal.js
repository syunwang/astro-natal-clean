var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/natal.js
var natal_exports = {};
__export(natal_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(natal_exports);
async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }
    const cfgUrl = process.env.FREEASTRO_API_URL;
    const cfgKey = process.env.FREEASTRO_API_KEY;
    if (!cfgUrl || !cfgKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing FREEASTRO_API_URL or FREEASTRO_API_KEY" })
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
      language: input.language || "en"
    };
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${cfgKey}`
    };
    const upstream = await fetch(cfgUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const raw = await upstream.text();
    if (!upstream.ok) {
      return {
        statusCode: upstream.status,
        body: JSON.stringify({
          error: `NATAL HTTP ${upstream.status}`,
          providerBody: raw
        })
      };
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: raw
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=natal.js.map
