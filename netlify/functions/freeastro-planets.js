// 取得行星位置（JSON 表格）
// 依賴的環境變數：
//   FREEASTRO_URL_PLANETS = https://json.freeastrologyapi.com/western/planets
//   FREEASTRO_API_KEY     = <你的 api key>
//   FREEASTRO_AUTH_STYLE  = x-api-key   （就用這個）
//
// !!! 重要：這支不用 node-fetch，直接用 Netlify Node 18 內建的 global fetch。

export async function handler(event) {
  // 只接受 POST
  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'Method Not Allowed' });
  }

  let input = {};
  try {
    input = JSON.parse(event.body || '{}');
  } catch (e) {
    return resp(400, { error: 'Bad Request', detail: 'Body is not valid JSON' });
  }

  // 後端需要的欄位（以你前端送的命名為準）
  const required = ['year', 'month', 'day', 'hours', 'minutes', 'latitude', 'longitude', 'timezone'];
  const missing = required.filter(k => input[k] === undefined || input[k] === null || input[k] === '');
  if (missing.length) {
    return resp(400, { error: 'Bad Request', detail: `Missing fields: ${missing.join(', ')}` });
  }

  // 轉成上游期望的 payload（大多數情況 hours/minutes OK）
  const payload = {
    year: Number(input.year),
    month: Number(input.month),
    day: Number(input.day),
    hours: Number(input.hours),
    minutes: Number(input.minutes),
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    timezone: Number(input.timezone),
    // 不傳 language 也可；若要中文可加：language: "zh"
  };

  const url = process.env.FREEASTRO_URL_PLANETS;
  const apiKey = process.env.FREEASTRO_API_KEY;
  if (!url || !apiKey) {
    return resp(500, { error: 'Config error', detail: 'FREEASTRO_URL_PLANETS or FREEASTRO_API_KEY is missing' });
  }

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 用 x-api-key
        [process.env.FREEASTRO_AUTH_STYLE || 'x-api-key']: apiKey,
      },
      body: JSON.stringify(payload),
    });

    // 不是 2xx 時，把上游的錯誤內容帶回來，避免 502
    if (!r.ok) {
      let detail;
      try { detail = await r.json(); } catch { detail = await r.text(); }
      return resp(r.status, { error: 'Upstream error', detail, url });
    }

    const data = await r.json();  // 上游會回 JSON
    return resp(200, data);
  } catch (err) {
    // 任何未捕捉例外，回 502 會讓你在前端看到 502；我們包成 500 JSON
    return resp(500, { error: 'Function crash', detail: String(err) });
  }
}

function resp(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(obj),
  };
}
