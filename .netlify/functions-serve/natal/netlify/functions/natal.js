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
        body: JSON.stringify({
          error: "Missing FREEASTRO_API_URL or FREEASTRO_API_KEY in environment"
        })
      };
    }
    const input = JSON.parse(event.body || "{}");
    const {
      year,
      month,
      day,
      hour,
      minute,
      seconds = 0,
      latitude,
      longitude,
      timezone,
      language = "en"
    } = input;
    const payload = {
      year,
      month,
      day,
      hours: hour,
      minutes: minute,
      seconds,
      latitude,
      longitude,
      timezone,
      language
    };
    const headers = { "Content-Type": "application/json" };
    if (/^Bearer\s+/i.test(cfgKey)) {
      headers.Authorization = cfgKey;
    } else {
      headers.Authorization = `Bearer ${cfgKey}`;
      headers["x-api-key"] = cfgKey;
    }
    const upstream = await fetch(cfgUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const raw = await upstream.text();
    if (!upstream.ok) {
      console.error("NATAL upstream error", upstream.status, raw);
      return {
        statusCode: upstream.status,
        body: JSON.stringify({
          error: `NATAL HTTP ${upstream.status}`,
          providerStatus: upstream.status,
          providerBody: raw,
          // 这里会告诉你为什么 403（如 key 无效/未授权域名等）
          sentToProvider: payload
          // 方便核对参数
        })
      };
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: raw
    };
  } catch (err) {
    console.error("NATAL function fatal error", err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=natal.js.map
