// .netlify/functions/freeastro-planets.js
// Node 18 原生 fetch，header 帶 x-api-key；不再使用 query 方式
// BASE 依官方： https://json.freeastrologyapi.com
// 路徑： western/planets

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    const API_KEY = process.env.FREEASTRO_API_KEY;         // 你的 API KEY
    const BASE    = process.env.FREEASTRO_BASE || 'https://json.freeastrologyapi.com';
    const PATH    = process.env.FREEASTRO_URL_PLANETS || '/western/planets';
    const FULL_URL = `${BASE.replace(/\/$/, '')}${PATH.startsWith('/') ? PATH : `/${PATH}`}`;

    const payload = JSON.parse(event.body || '{}');

    // 簡單檢查必填（官方欄位）
    const need = ['year','month','day','hour','min','lat','lon','tzone','house_system'];
    const miss = need.filter(k => payload[k] === undefined || payload[k] === null || payload[k] === '');
    if (miss.length) {
      return { statusCode: 400, body: JSON.stringify({ message: `Missing fields: ${miss.join(', ')}` }) };
    }

    const res = await fetch(FULL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    const okBody = (() => { try { return JSON.parse(text); } catch { return text; } })();

    return {
      statusCode: res.status,
      body: typeof okBody === 'string' ? okBody : JSON.stringify(okBody),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
