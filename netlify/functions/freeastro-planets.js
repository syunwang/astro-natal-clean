// netlify/functions/freeastro-planets.js
// Node 18 內建 fetch + 以 header 帶 x-api-key
// 兼容前端傳 day/minute/latitude/longitude/tz 等別名

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    const API_KEY = process.env.FREEASTRO_API_KEY;
    const BASE = process.env.FREEASTRO_BASE || 'https://json.freeastrologyapi.com';
    const PATH = process.env.FREEASTRO_URL_PLANETS || '/western/planets';

    if (!API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ message: 'Missing FREEASTRO_API_KEY in env' }) };
    }

    let inBody = {};
    try { inBody = JSON.parse(event.body || '{}'); } catch (e) {}

    // 小工具：轉成數字
    const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

    // 允許常見別名：day->date、minute->min、latitude->lat、longitude->lon、tz/timezone->tzone
    const body = {
      year:  num(inBody.year),
      month: num(inBody.month),
      date:  num(inBody.date ?? inBody.day),
      hour:  num(inBody.hour),
      min:   num(inBody.min ?? inBody.minute),
      lat:   num(inBody.lat ?? inBody.latitude),
      lon:   num(inBody.lon ?? inBody.longitude),
      tzone: num(inBody.tzone ?? inBody.tz ?? inBody.timezone),
    };

    // 必填欄位檢查
    const missing = Object.entries(body)
      .filter(([_, v]) => !(Number.isFinite(v)))
      .map(([k]) => k);

    if (missing.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid request body', missing }),
      };
    }

    const url = `${BASE}${PATH}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY, // 官方文件：用 header
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      // 直接把上游錯誤回傳，方便除錯
      return { statusCode: res.status, body: text || JSON.stringify({ message: 'Upstream error' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: text,
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: err.message || 'Internal Server Error' }) };
  }
};
