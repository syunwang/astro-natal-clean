// netlify/functions/freeastro-wheel.js
// ✅ 產生星盤輪圖（wheel image）
// ✅ 支援 query 或 header API key
// ✅ 結果直接返回 JSON（含圖片URL或Base64）

exports.handler = async (event) => {
  const DEBUG = String(process.env.FREEASTRO_DEBUG || '').toLowerCase() === 'true';
  try {
    const BASE =
      (process.env.FREEASTRO_BASE || 'https://json.freeastrologyapi.com/western').trim();
    const PATH = (process.env.FREEASTRO_URL_WHEEL || '/wheel').trim();
    const API_KEY = (process.env.FREEASTRO_API_KEY || '').trim();
    const AUTH_STYLE = (process.env.FREEASTRO_AUTH_STYLE || 'query').trim().toLowerCase();

    const payload = JSON.parse(event.body || '{}');

    let url;
    if (/^https?:\/\//i.test(PATH)) url = new URL(PATH);
    else url = new URL(`${BASE.replace(/\/$/, '')}/${PATH.replace(/^\//, '')}`);

    const headers = { 'Content-Type': 'application/json' };
    if (API_KEY) {
      if (AUTH_STYLE === 'header') headers['Authorization'] = `Bearer ${API_KEY}`;
      else url.searchParams.set('api_key', API_KEY);
    }

    if (DEBUG) console.log('[Wheel] URL =>', url.toString());

    const resp = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    return { statusCode: resp.status, body: text };
  } catch (err) {
    console.error('[Wheel Error]', err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
