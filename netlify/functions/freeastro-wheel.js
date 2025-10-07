// 產生星盤圖（PNG 或 SVG）
// 依賴環境變數：
//   FREEASTRO_URL_WHEEL = https://json.freeastrologyapi.com/western/natal-wheel-chart
//   FREEASTRO_API_KEY
//   FREEASTRO_AUTH_STYLE = x-api-key

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let input = {};
  try {
    input = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Body is not valid JSON' };
  }

  const required = ['year', 'month', 'day', 'hours', 'minutes', 'latitude', 'longitude', 'timezone'];
  const missing = required.filter(k => input[k] === undefined || input[k] === null || input[k] === '');
  if (missing.length) {
    return { statusCode: 400, body: `Missing fields: ${missing.join(', ')}` };
  }

  const payload = {
    year: Number(input.year),
    month: Number(input.month),
    day: Number(input.day),
    hours: Number(input.hours),
    minutes: Number(input.minutes),
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    timezone: Number(input.timezone),
    // 也可增加顏色/樣式等參數，依上游文件
  };

  const url = process.env.FREEASTRO_URL_WHEEL;
  const apiKey = process.env.FREEASTRO_API_KEY;
  if (!url || !apiKey) {
    return { statusCode: 500, body: 'Config error: FREEASTRO_URL_WHEEL or FREEASTRO_API_KEY is missing' };
  }

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [process.env.FREEASTRO_AUTH_STYLE || 'x-api-key']: apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      // 把上游錯誤文本回傳以便你在前端看到真錯誤
      const text = await r.text();
      return { statusCode: r.status, body: text };
    }

    const buf = Buffer.from(await r.arrayBuffer());
    const contentType = r.headers.get('content-type') || 'image/png';

    return {
      statusCode: 200,
      headers: { 'Content-Type': contentType },
      body: buf.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
}
