// index.js — 強制從正確欄位取值，並做完整驗證

(function () {
  const $ = (s) => document.querySelector(s);
  const byId = (id) => document.getElementById(id);
  const logBox = () => $('#log');
  const log = (msg) => {
    const el = logBox();
    el.textContent += (typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)) + '\n';
  };

  // —— 查經緯度（OpenStreetMap Nominatim）
  byId('btnGeo').addEventListener('click', async () => {
    const q = byId('place').value.trim();
    if (!q) return alert('請先輸入地名關鍵字');
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=1`;
      const r = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const arr = await r.json();
      if (!arr.length) return alert('查無地點');
      const p = arr[0];
      byId('lat').value = String(p.lat);
      byId('lon').value = String(p.lon);
      log(`地理OK：${p.display_name}`);
    } catch (e) {
      console.error(e);
      alert('查經緯度失敗');
    }
  });

  // —— 讀值 & 驗證（嚴格從 ID 取值，避免拿錯欄位）
  function readNumber(id) {
    const el = byId(id);
    if (!el) throw new Error(`找不到欄位 #${id}`);
    const v = Number(String(el.value).trim());
    return Number.isFinite(v) ? v : NaN;
  }

  function buildPayload() {
    // 日期
    const dateStr = byId('date').value; // YYYY-MM-DD
    const [year, month, day] = (dateStr || '').split('-').map(x => Number(x));

    // 小時/分鐘（24h），時區
    const hour  = readNumber('hour');   // ← 強制從 #hour 取
    const min   = readNumber('min');    // ← 強制從 #min  取
    const tzone = readNumber('tzone');  // ← 強制從 #tzone 取

    // 經緯度
    const lat = readNumber('lat');
    const lon = readNumber('lon');

    // 基本驗證（範圍）
    const errs = [];
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) errs.push('請選擇正確的生日');
    if (!Number.isFinite(hour)  || hour < 0  || hour > 23) errs.push('小時必須是 0–23 的數字');
    if (!Number.isFinite(min)   || min  < 0  || min  > 59) errs.push('分鐘必須是 0–59 的數字');
    if (!Number.isFinite(tzone)) errs.push('時區必須是數字，例如台灣 8');
    if (!Number.isFinite(lat)   || !Number.isFinite(lon)) errs.push('請先查到經緯度（或手動填入數字）');

    if (errs.length) {
      throw new Error(errs.join('；'));
    }

    // 依官方欄位組 payload
    return {
      year, month, day,
      hour, min,
      lat, lon,
      tzone,
      house_system: byId('house').value,
      lang: byId('lang').value,
      // name: byId('name')?.value || undefined, // 需要再加也可以
    };
  }

  // —— 送出 planets（呼叫 Netlify Function）
  byId('btnRun').addEventListener('click', async () => {
    logBox().textContent = '';
    let payload;
    try {
      payload = buildPayload();
    } catch (e) {
      log(`✗ 欄位檢查失敗：${e.message}`);
      alert(e.message);
      return;
    }

    log('送出前 payload（也寫在 console）：');
    log(payload);
    console.debug('FINAL PAYLOAD =>', JSON.stringify(payload));

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
