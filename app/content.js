/* -----------------------
   小工具
------------------------ */
const $ = (sel) => document.querySelector(sel);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function setBusy(b) {
  document.body.style.cursor = b ? 'progress' : 'default';
}

function log(msg, status = '') {
  const box = $('#diag');
  const stamp = new Date().toLocaleTimeString();
  const s = status ? ` (${status})` : '';
  box.textContent += `[${stamp}] ${msg}${s}\n`;
  box.scrollTop = box.scrollHeight;
}

function clearAll() {
  ['name','date','time','tz','keyword','lat','lng'].forEach(id => { const el = $('#'+id); if (el) el.value = ''; });
  $('#diag').textContent = '';
}

/** 將瀏覽器各地區可能出現的「上午/下午、AM/PM、上午 08:50 之類」統一轉 24h。
 *  例：'下午 02:05' -> '14:05'，'AM 7:03' -> '07:03'
 */
function normalizeTimeTo24h(raw) {
  if (!raw) return null;
  let s = String(raw).trim();

  // 去掉全角空白
  s = s.replace(/\u3000/g, ' ').replace(/\s+/g, ' ').trim();

  // 常見前綴轉 AM/PM
  if (/^上午/i.test(s)) s = s.replace(/^上午\s*/i, 'AM ');
  if (/^下午/i.test(s)) s = s.replace(/^下午\s*/i, 'PM ');
  if (/^晚上/i.test(s)) s = s.replace(/^晚上\s*/i, 'PM ');
  if (/^中午/i.test(s))  s = s.replace(/^中午\s*/i, 'PM ');

  // 若是 AM/PM 格式
  const ampm = /^(AM|PM)\s*(\d{1,2})[:：\.](\d{2})$/i.exec(s);
  if (ampm) {
    let hh = +ampm[2], mm = +ampm[3];
    const isPM = ampm[1].toUpperCase() === 'PM';
    if (isPM && hh !== 12) hh += 12;
    if (!isPM && hh === 12) hh = 0;
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }

  // 直接 HH:MM
  const h24 = /^(\d{1,2})[:：\.](\d{2})$/.exec(s);
  if (h24) {
    const hh = Math.max(0, Math.min(23, +h24[1]));
    const mm = Math.max(0, Math.min(59, +h24[2]));
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }

  return s; // 讓後端自己兜底
}

/* -----------------------
   讀取表單 → payload
------------------------ */
function getPayload() {
  const date = $('#date').value.trim();
  const timeRaw = $('#time').value.trim();
  const time = normalizeTimeTo24h(timeRaw);
  const tz = $('#tz').value.trim();       // 允許 "8" 或 "Asia/Taipei"
  const lang = $('#lang').value;
  const house_system = $('#house').value;
  const latitude = +($('#lat').value || 0);
  const longitude = +($('#lng').value || 0);

  return { date, time, tz, lang, house_system, latitude, longitude };
}

/* -----------------------
   429 退避重試（簡）
------------------------ */
async function fetchJSON(url, options, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      const delay = Math.min(2000 * (i + 1), 6000);
      log(`429 Too Many Requests，${delay} ms 後重試…`, '429');
      await sleep(delay);
      continue;
    }
    if (!res.ok) {
      const txt = await res.text().catch(()=>'');
      throw new Error(`HTTP ${res.status} ${res.statusText} :: ${txt}`);
    }
    return res.json();
  }
  throw new Error('多次重試仍 429，請稍候再試');
}

/* -----------------------
   API 呼叫
------------------------ */
async function callGeo() {
  setBusy(true);
  $('#diag').textContent = '查詢中…\n';

  try {
    const q = $('#keyword').value.trim();
    if (!q) throw new Error('請輸入地名關鍵字');
    const body = JSON.stringify({ q });

    const data = await fetchJSON('/.netlify/functions/freeastro-geo', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body
    });

    if (!data || data.status !== 'ok') {
      throw new Error(data?.message || '地理查詢失敗');
    }

    // 假設你的 geo 回傳 { lat, lng, display }
    $('#lat').value = data.lat.toFixed(6);
    $('#lng').value = data.lng.toFixed(6);
    log(`地理 OK：${data.display || (data.lat+','+data.lng)}`, 'ok');
  } catch (err) {
    log(`地理查詢失敗：${err.message}`, 'error');
  } finally {
    setBusy(false);
  }
}

async function callPlanets(payload) {
  const body = JSON.stringify(payload);
  return fetchJSON('/.netlify/functions/freeastro-planets', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body
  });
}

async function callWheel(payload) {
  const body = JSON.stringify(payload);
  return fetchJSON('/.netlify/functions/freeastro-wheel', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body
  });
}

/* -----------------------
   一鍵：行星 → 輪盤
------------------------ */
async function oneClick() {
  setBusy(true);
  $('#diag').textContent = '';

  try {
    // 收集 payload
    const p = getPayload();
    if (!p.date || !p.time || !p.tz || !p.lang || !p.house_system) {
      throw new Error('必填欄位：日期、時間、時區、lang、house_system。');
    }
    if (!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) {
      throw new Error('請先填完整經緯度（可用「查經緯度」取得）');
    }

    log('呼叫 Planets…');
    const planets = await callPlanets(p);
    log('Planets OK', 'ok');

    // 若需要某些欄位給輪盤，可在此整理 payload
    const next = { ...p, planets: planets?.result };

    log('呼叫 Wheel…');
    const wheel = await callWheel(next);
    log('Wheel OK', 'ok');

    // 假設 wheel 會回傳 imageDataUrl（base64）
    if (wheel?.imageDataUrl) {
      const a = document.createElement('a');
      a.href = wheel.imageDataUrl;
      a.download = 'natal-wheel.png';
      a.click();
      log('已觸發星盤圖下載', 'ok');
    } else {
      log('Wheel 回傳沒有 imageDataUrl（略過下載）', 'warn');
    }
  } catch (err) {
    log(`一鍵流程失敗：${err.message}`, 'error');
  } finally {
    setBusy(false);
  }
}

/* -----------------------
   綁定事件（無任何 inline onclick）
------------------------ */
$('#btnGeo').addEventListener('click', (e) => {
  e.preventDefault();
  callGeo();
});

$('#btnOne').addEventListener('click', (e) => {
  e.preventDefault();
  oneClick();
});

$('#btnClear').addEventListener('click', (e) => {
  e.preventDefault();
  clearAll();
});
