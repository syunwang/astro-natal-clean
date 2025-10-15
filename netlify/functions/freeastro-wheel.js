// netlify/functions/freeastro-wheel.js
import fetch from 'node-fetch';

export const handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || '{}');
    if (!payload.date || !payload.time || !payload.latitude || !payload.longitude) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const apiKey = process.env.FREEASTRO_API_KEY;
    const wheelUrl = process.env.FREEASTRO_URL_WHEEL || `${process.env.FREEASTRO_BASE}/wheel`;
    const authStyle = process.env.FREEASTRO_AUTH_STYLE || 'header';

    let url = wheelUrl;
    const headers = { 'Content-Type': 'application/json' };

    if (authStyle === 'header' && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (authStyle === 'query' && apiKey) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}apikey=${apiKey}`;
    }

    console.log(`[Wheel] → ${url}`);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      console.error(`[Wheel] ❌ ${res.status}`, data);
      return {
        statusCode: res.status,
        body: JSON.stringify({ message: data.message || 'Wheel request failed', raw: data }),
      };
    }

    console.log(`[Wheel] ✅ OK`);
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('[Wheel] Exception:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal error', details: err.message }),
    };
  }
};
