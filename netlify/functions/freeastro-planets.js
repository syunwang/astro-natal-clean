// netlify/functions/freeastro-planets.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    const BASE = (process.env.FREEASTRO_BASE || '').trim().replace(/\/+$/, '');
    let PATH = (process.env.FREEASTRO_URL_PLANETS || 'planets').trim();

    // 正規化 path
    if (!PATH.startsWith('/')) PATH = '/' + PATH;

    // 如果 BASE 是空，fallback 到預設
    const base = BASE || 'https://json.freeastrologyapi.com/western';
    const fullUrl = `${base}${PATH}`;

    // ---- 參數組裝 ----
    const body = JSON.parse(event.body || '{}');

    // 你用 query 驗證（建議）
    const apiKey = (process.env.FREEASTRO_API_KEY || '').trim();
    const url = new URL(fullUrl);
    if (apiKey) url.searchParams.set('api_key', apiKey);

    const payload = {
      year: body.year,
      month: body.month,
      day: body.day,
      hour: body.hour,
      minute: body.minute,
      lat: body.lat,
      lon: body.lon,
      tzone: body.tz || body.tzone || body.timezone || 0,
      house_system: body.house_system || 'placidus',
      lang: body.lang || 'en',
    };

    console.log('[Planets] BASE =', base);
    console.log('[Planets] PATH =', PATH);
    console.log('[Planets] URL  =', url.toString());

    const resp = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // 若要測 header 認證，把上面的 query 拿掉，改這裡：
      // headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error('[Planets] Non-OK', resp.status, text);
      return { statusCode: resp.status, body: text || `HTTP ${resp.status}` };
    }

    return {
      statusCode: 200,
      body: text,
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (err) {
    console.error('[Planets] Exception:', err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message || 'Internal error' }) };
  }
};
