// netlify/functions/freeastro-planets.js
import fetch from 'node-fetch';

export const handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || '{}');
    if (!payload.date || !payload.time || !payload.latitude || !payload.longitude) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const apiKey = process.env.FREEASTRO_API_KEY;
    const planetsUrl = process.env.FREEASTRO_URL_PLANETS || `${process.env.FREEASTRO_BASE}/planets`;
    const authStyle = process.env.FREEASTRO_AUTH_STYLE || 'header';

    let url = planetsUrl;
    const headers = { 'Content-Type': 'application/json' };

    if (authStyle === 'header' && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (authStyle === 'query' && apiKey) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}apikey=${apiKey}`;
    }

    console.log(`[Planets] → ${url}`);

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
      console.error(`[Planets] ❌ ${res.status}`, data);
      return {
        statusCode: res.status,
        body: JSON.stringify({ message: data.message || 'Planets request failed', raw: data }),
      };
    }

    console.log(`[Planets] ✅ Response OK`);
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('[Planets] Exception:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal error', details: err.message }),
    };
  }
};
