// netlify/functions/geo.js
export default async (req) => {
  const url = new URL(req.url);
  const place = url.searchParams.get("place");
  if (!place) {
    return new Response(JSON.stringify({ error: "missing place" }), {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
  const upstream = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`;
  try {
    const r = await fetch(upstream, {
      headers: {
        "User-Agent": "astro-natal-clean/1.0 (contact: youremail@example.com)"
      }
    });
    const j = await r.json();
    if (!Array.isArray(j) || !j.length) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404, headers: { "Access-Control-Allow-Origin": "*" }
      });
    }
    const hit = j[0];
    return new Response(JSON.stringify({
      lat: hit.lat, lon: hit.lon, display_name: hit.display_name
    }), { status: 200, headers: { "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "GEO upstream failed" }), {
      status: 502, headers: { "Access-Control-Allow-Origin": "*" }
    });
  }
};
