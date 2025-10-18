// netlify/functions/freeastro-planets.js
// ✅ 已補上 name 欄位傳遞，並保持 header 授權。

const isTruthy = (v) => String(v ?? '').toLowerCase() === 'true';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  const DEBUG = isTruthy(process.env.FREEASTRO_DEBUG);
  const BASE = process.env.FREEASTRO_BASE || 'https://json.freeastrologyapi.com';
  const PATH = process.env.FREEASTRO_URL_PLANETS || '/western/planets';
  const API_KEY = process.env.FREEASTRO_API_KEY || '';

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing FREEASTRO_API_KEY in environment variables.' }),
    };
  }

  let input;
  try {
    input = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Invalid JSON in request body' }),
    };
  }

  const {
    year,
    month,
    day,
    hour,
    minute,
    min,
    lat,
    lon,
    tzone,
    house_system,
    lang,
    name, // ✅ 新增
  } = input;

  const missing = [];
  if (typeof year !== 'number') missing.push('year');
  if (typeof month !== 'number') missing.push('month');
  if (typeof day !== 'number') missing.push('day');
  if (typeof hour !== 'number') missing.push('hour');
  const apiMin = typeof min === 'number' ? min : (typeof minute === 'number' ? minute : undefined);
  if (typeof apiMin !== 'number') missing.push('min');
  if (typeof lat !== 'number') missing.push('lat');
  if (typeof lon !== 'number') missing.push('lon');
  if (typeof tzone !== 'number') missing.push('tzone');

  if (missing.length) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Missing or invalid fields',
        missing,
        hint: 'Payload must include date {year,month,day,hour,min} and lat, lon, tzone.',
      }),
    };
  }

  // ✅ 組成最終傳給 FreeAstrology API 的 payload
  const payload = {
    date: { year, month, day, hour, min: apiMin },
    lat,
    lon,
    tzone,
  };

  if (house_system) payload.house_system = String(house_system);
  if (lang) payload.lang = String(lang);
  if (name) payload.name = String(name); // ✅ 加上 name

  const url = `${BASE}${PATH}`;

  if (DEBUG) {
    console.log('[Planets] URL =>', url);
    console.log('[Planets] Payload =>', JSON.stringify(payload, null, 2));
  }

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    const json = (() => {
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    })();

    if (DEBUG) {
      console.log('[Planets] Status:', resp.status);
      console.log('[Planets] Response:', json);
    }

    return {
      statusCode: resp.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
    };
  } catch (err) {
    console.error('[Planets] Exception:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Upstream fetch failed', error: String(err) }),
    };
  }
};
