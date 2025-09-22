# Astro Natal Clean - Deployment Guide

這份專案用於在 **Netlify Functions** 上呼叫 FreeAstrologyAPI。

## 📂 專案結構
```
astro-natal-clean/
├── netlify.toml
├── .gitignore
├── netlify/
│   └── functions/
│       └── natal.js
└── README.md
```

## 🚀 使用步驟

1. **解壓縮並覆蓋檔案**
   - 把提供的 ZIP 解壓縮，直接覆蓋到 `astro-natal-clean/` 專案資料夾。

2. **檢查 Netlify 環境變數**
   - 登入 [Netlify](https://app.netlify.com/)
   - 進入 **Site configuration → Environment variables**
   - 確認有新增：
     ```
     Key: FREEASTRO_API_KEY
     Value: (你的 FreeAstrologyAPI 金鑰)
     ```

3. **重新部署**
   ```bash
   git add .
   git commit -m "update: add natal.js and configs"
   git push origin main
   ```
   - 回到 Netlify → **Deploys**
   - 點擊 **Trigger deploy → Clear cache and deploy site**

4. **測試 API**
   在 PowerShell 中執行：
   ```powershell
   $response = Invoke-WebRequest `
     -Uri "https://astro-natal-clean.netlify.app/.netlify/functions/natal" `
     -Method POST `
     -ContentType "application/json" `
     -Body '{"year":1958,"month":1,"day":7,"hour":8,"minute":50,"seconds":0,"latitude":22.99083,"longitude":120.21333,"timezone":8}'

   $response.Content
   ```

   如果設定正確，會回傳 JSON 格式的行星資料。

---

✅ 完成後，你就能用 `/.netlify/functions/natal` 來查詢星盤資料。
