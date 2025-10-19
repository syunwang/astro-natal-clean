(function () {
  const $ = (s) => document.querySelector(s);
  const log = (msg) => { const el = $('#log'); el.textContent += (typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)) + '\n'; };

  // 查經緯度 (OpenStreetMap Nominatim)
  $('#btnGeo').addEventListener('click', async () => {
    const q = $('#place').value.trim();
    if (!q) return alert('請先輸入地名關鍵字');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=1`;
      const r = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const arr = await r.json();
      if (!arr.length) return alert('查無地點');
      const p = arr[0];
      $('#lat').value = String(p.lat);
      $('#lon').value = String(p.lon);
      log(`地理OK：${p.display_name}`);
    } catch (e) {
      alert('查經緯度失敗'); console.error(e);
    }
  });

  // 組 payload（完全依官方欄位）
  function buildPayload() {
    const [y, m, d] = ($('#date').value || '').split('-').map(x => Number(x));
    const hour = Number($('#hour').value);
    const min  = Number($('#min').value);
    const lat  = Number($('#lat').value);
    const lon  = Number($('#lon').value);
    const tzone = Number($('#tzone').value);

    return {
      year: y, month: m, day: d,
      hour, min,
      lat, lon,
      tzone,
      house_system: $('#house').value,
      lang: $('#lang').value,
      // name 可選要就加： name: $('#name')?.value || undefined
    };
  }

  // 送 planets（打自己 Netlify Function）
  $('#btnRun').addEventListener('click', async () => {
    $('#log').textContent = '';
    const payload = buildPayload();

    log('送出前 payload：');
    log(payload);

    try {
      const r = await fetch('/.netlify/functions/freeastro-planets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await r.text();
      let body; try { body = JSON.parse(text); } catch { body = text; }

      if (!r.ok) {
        log(`✗ HTTP ${r.status} – ${text}`);
        return;
      }
      log('✓ 成功：');
      log(body);
    } catch (e) {
      log(`✗ 發生錯誤：${e.message}`);
      console.error(e);
    }
  });
})();
