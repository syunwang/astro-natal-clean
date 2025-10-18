// netlify/functions/freeastro-planets.js
// Node 18 原生 fetch，Header 驗證版（FINAL）

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // 讀環境變數（固定：BASE 只有網域，路徑在 FREEASTRO_URL_PLANETS）
    const BASE = process.env.FREEASTRO_BASE || 'https://json.freeastrologyapi.com';
    const PATH = process.env.FREEASTRO_URL_PLANETS || '/western/planets';
    const API_KEY = process.env.FREEASTRO_API_KEY;

    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing FREEASTRO_API_KEY in environment variables.' }),
      };
    }

    // 組完整 URL（去掉 BASE 結尾的 /）
    const url = `${BASE.replace(/\/$/, '')}${PATH}`;

    // 解析前端 body
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON body' }) };
    }

    // 允許欄位（官方接受的命名，minute 必須是 min）
    const required = ['year', 'month', 'day', 'hour', 'min', 'lat', 'lon', 'tzone'];
    for (const k of required) {
      if (payload[k] === undefined || payload[k] === null || payload[k] === '') {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `Missing field: ${k}` }),
        };
      }
    }

    // 只轉送官方要的欄位（其餘可選項帶到：lang、house_system、name）
    const body = {
      year: Number(payload.year),
      month: Number(payload.month),
      day: Number(payload.day),
      hour: Number(payload.hour),
      min: Number(payload.min),            // ← 重點：是 min，不是 minute
      lat: Number(payload.lat),
      lon: Number(payload.lon),
      tzone: Number(payload.tzone),
    };
    if (payload.lang) body.lang = String(payload.lang);
    if (payload.house_system) body.house_system = String(payload.house_system);
    if (payload.name) body.name = String(payload.name);

    // 呼叫官方 API（Header 帶 x-api-key）
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    // 不是 2xx 的話，帶回官方錯誤文字幫你排查
    if (!res.ok) {
      return {
        statusCode: res.status,
        body: text || JSON.stringify({ message: 'Upstream error' }),
      };
    }

    return {
      statusCode: 200,
      body: text,
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err && err.message ? err.message : err) }),
    };
  }
};
