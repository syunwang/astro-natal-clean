// netlify/functions/natal.js
// 统一把上游响应原文与状态码回传，方便定位 403 的真实原因

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
        body: JSON.stringify({
          error: "Missing FREEASTRO_API_URL or FREEASTRO_API_KEY in environment",
        }),
      };
    }

    const input = JSON.parse(event.body || "{}");
    const {
      year, month, day, hour, minute, seconds = 0,
      latitude, longitude, timezone,
      language = "en",
    } = input;

    // 你的上游 API 需要的字段名如果不同，请在这里做映射
    const payload = {
      year, month, day,
      hours: hour,
      minutes: minute,
      seconds,
      latitude,
      longitude,
      timezone,
      language,
    };

    // 兼容两种常见的鉴权写法：Authorization: Bearer ... / x-api-key: ...
    const headers = { "Content-Type": "application/json" };
    // 1) 如 cfgKey 已包含 Bearer 前缀，则直接用
    if (/^Bearer\s+/i.test(cfgKey)) {
      headers.Authorization = cfgKey;
    } else {
      // 默认两种头都带上，后端会选其一（多数后端之一即可）
      headers.Authorization = `Bearer ${cfgKey}`;
      headers["x-api-key"] = cfgKey;
    }

    const upstream = await fetch(cfgUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const raw = await upstream.text();

    // 把上游状态与原文都打回前端，调试用（上线后你也可以关掉）
    if (!upstream.ok) {
      console.error("NATAL upstream error", upstream.status, raw);
      return {
        statusCode: upstream.status,
        body: JSON.stringify({
          error: `NATAL HTTP ${upstream.status}`,
          providerStatus: upstream.status,
          providerBody: raw,     // 这里会告诉你为什么 403（如 key 无效/未授权域名等）
          sentToProvider: payload, // 方便核对参数
        }),
      };
    }

    // 上游成功：若它返回 JSON，把字符串直接回传；如果不是 JSON，你也会拿到原文
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: raw,
    };
  } catch (err) {
    console.error("NATAL function fatal error", err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}
