// netlify/functions/freeastro-geo.js
import fetch from 'node-fetch';

export const handler = async (event) => {
  try {
    // 取得輸入
    const { q } = JSON.parse(event.body || '{}');
    if (!q) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing parameter: q' }) };
    }

    // 從 Netlify 環境變數取設定
    const apiKey = process.env.FREEASTRO_API_KEY;
    const geoUrl = process.env.FREEASTRO_GEO_URL || `${process.env.FREEASTRO_BASE}/geo`;
    const authStyle = process.env.FREEASTRO_AUTH_STYLE || 'header';

    // 組成完整 URL
    const url = `${geoUrl}?q=${encodeURIComponent(q)}`;

    const headers = {
      'Content-Type': 'application/json',
    };
    if (authStyle === 'header' && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    console.log(`[Geo] → ${url}`);

    // 發送請求
    const res = await fetch(url, {
      method: 'GET',
      headers,
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      console.error(`[Geo] ❌ ${res.status}`, data);
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: data.message || 'Geo request failed', raw: data }),
      };
    }

    console.log(`[Geo] ✅ Response`, data);
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('[Geo] Exception:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error', details: err.message }),
    };
  }
};
