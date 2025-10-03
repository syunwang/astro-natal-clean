// 1) 地名 → 經緯度
async function geo(place) {
  const r = await fetch('/.netlify/functions/freeastro-geo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ place })
  });
  return r.json();  // 期望 { lat, lon, display_name }
}

// 2) 行星位置
async function planets(input) {
  const r = await fetch('/.netlify/functions/freeastro-planets', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input) // year, month, day, hours, minutes, latitude, longitude, timezone, language
  });
  return r.json();
}

// 3) 盤圖（回 blob）
async function wheel(input) {
  const r = await fetch('/.netlify/functions/freeastro-wheel', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const blob = await r.blob(); // 可能是 image/png 或 image/svg+xml
  return URL.createObjectURL(blob); // 可丟到 <img src="...">
}
