// index.js
const logBox = document.getElementById("log");
const log = (msg) => {
  logBox.textContent += `\n${msg}`;
  logBox.scrollTop = logBox.scrollHeight;
};

document.getElementById("generate").addEventListener("click", async () => {
  logBox.textContent = "";
  log("🟣 開始組合 payload...");

  const birthdate = document.getElementById("birthdate").value.trim();
  const birthtime = document.getElementById("birthtime").value.trim();
  const [year, month, day] = birthdate.split("-").map(Number);
  const [hour, minute] = birthtime.split(":").map(Number);

  const payload = {
    name: document.getElementById("name").value.trim() || "",
    year,
    month,
    day,
    hour,
    min: minute,
    lat: Number(document.getElementById("latitude").value),
    lon: Number(document.getElementById("longitude").value),
    tzone: Number(document.getElementById("tzone").value),
    house_system: document.getElementById("house_system").value,
    lang: document.getElementById("lang").value,
  };

  log("📦 送出前 payload 預覽：");
  log(JSON.stringify(payload, null, 2));

  try {
    const res = await fetch("/.netlify/functions/freeastro-planets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      log("✅ 呼叫成功！");
      log(JSON.stringify(data, null, 2));
    } else {
      log(`❌ 錯誤 ${res.status} – ${JSON.stringify(data)}`);
    }
  } catch (err) {
    log(`🚨 發生例外：${err.message}`);
  }
});

document.getElementById("clear").addEventListener("click", () => {
  document.querySelectorAll("input").forEach((i) => (i.value = ""));
  logBox.textContent = "";
});
