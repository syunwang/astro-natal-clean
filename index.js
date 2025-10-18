// === 只給 planets 端點用的 payload（嚴格 8 個鍵）===
function buildPlanetsPayload() {
  // 這裡照你頁面上的 input/select id 取值
  const [y, m, d] = document.querySelector('#birth_date').value.split('-').map(Number);
  const [hh, mm]  = document.querySelector('#birth_time').value.split(':').map(Number);

  const lat  = Number(document.querySelector('#lat').value);
  const lon  = Number(document.querySelector('#lon').value);
  const tz   = Number(document.querySelector('#tzone').value);

  // ★ planets 僅允許這 8 個鍵，千萬不要加其它鍵（name / house_system / lang 等）
  return {
    year: y,
    month: m,
    day: d,
    hour: hh,
    min: mm,
    lat,
    lon,
    tzone: tz
  };
}

async function callPlanets() {
  const payload = buildPlanetsPayload();
  console.log('Sending payload:', payload); // 送出前寫到 console，方便比對

  const res = await fetch('/.netlify/functions/freeastro-planets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const txt = await res.text();
  if (!res.ok) {
    addDiag(`❌ HTTP ${res.status} – ${txt}`);
    return;
  }
  const data = JSON.parse(txt);
  addDiag('✅ planets OK');
  // TODO: 在這裡把結果畫到畫面上
}

// 你的產生星盤按鈕
document.querySelector('#btn-go').addEventListener('click', (e) => {
  e.preventDefault();
  callPlanets().catch(err => addDiag(`❌ ${err.message}`));
});

// 小工具：把訊息寫到診斷區域
function addDiag(msg) {
  const box = document.querySelector('#diag');
  const p = document.createElement('div');
  p.textContent = msg;
  box.appendChild(p);
}
