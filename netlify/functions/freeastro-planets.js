// netlify/functions/freeastro-planets.js
// ✅ Node 18 環境（使用原生 fetch）
// ✅ 採用 Header 認證：x-api-key
// ✅ 僅轉送 planets 所需 8 個欄位

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    const BASE = process.env.FREEASTRO_BASE?.replace(/\/+$/, '') || 'https://json.freeastrologyapi.com';
    const PATH = (process.env.FREEASTRO_URL_PLANETS || 'western/planets').replace(/^\/+/, '');
    const API_KEY = process.env.FREEASTRO_API_KEY;
    //const url = `${BASE.replace(/\/$/, '')}${PATH}`;
      const URL  = `${BASE}/${PATH}`; 
    if (!BASE || !API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ message: 'Missing FREEASTRO_BASE or FREEASTRO_API_KEY' }) };
    }

    // 解析前端傳入的 JSON
    let incoming;
    try {
      incoming = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON' }) };
    }

    // 只擷取 planets 允許的 8 個鍵（避免多送被判 400）
    const body = {
      year:  Number(incoming.year),
      month: Number(incoming.month),
      day:   Number(incoming.day),
      hour:  Number(incoming.hour),
      min:   Number(incoming.min),
      lat:   Number(incoming.lat),
      lon:   Number(incoming.lon),
      tzone: Number(incoming.tzone),
    };

    // 基本欄位檢查
    for (const k of ['year','month','day','hour','min','lat','lon','tzone']) {
      if (!Number.isFinite(body[k])) {
        return { statusCode: 400, body: JSON.stringify({ message: `Invalid or missing field: ${k}` }) };
      }
    }

    
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,        // ★ Header 認證
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    if (!resp.ok) {
      // 把上游錯誤字串原樣回傳，方便你在前端看到
      return { statusCode: resp.status, body: text || JSON.stringify({ message: 'Upstream error' }) };
    }

    return { statusCode: 200, body: text };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
