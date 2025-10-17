// ✅ 最終穩定版：完全依 FreeAstrologyAPI 官方文件
// Endpoint: https://json.freeastrologyapi.com/western/planets
// Auth: Basic <API_KEY>
// Node18 原生 fetch 版本

exports.handler = async (event) => {
  try {
    const API_KEY = process.env.FREEASTRO_API_KEY;
    const BASE_URL = process.env.FREEASTRO_BASE || 'https://json.freeastrologyapi.com/western/planets';

    if (!API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing FREEASTRO_API_KEY in environment' }),
      };
    }

    // 解析前端傳入參數
    const body = JSON.parse(event.body || '{}');
    const payload = {
      year: Number(body.year) || 1990,
      month: Number(body.month) || 1,
      day: Number(body.day) || 1,
      hour: Number(body.hour) || 12,
      min: Number(body.minute) || 0,
      lat: Number(body.lat) || 22.99,
      lon: Number(body.lon) || 120.21,
      tzone: Number(body.tz) || 8.0,
    };

    // Debug 輸出
    console.log('[Planets] Request URL:', BASE_URL);
    console.log('[Planets] Payload:', payload);

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${API_KEY}`,  // ✅ 官方要求格式
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Planets] Error:', response.status, text);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'API request failed',
          status: response.status,
          detail: text,
        }),
      };
    }

    const data = await response.json();
    console.log('[Planets] Success:', data);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, data }),
    };
  } catch (err) {
    console.error('[Planets] Exception:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', detail: err.message }),
    };
  }
};
