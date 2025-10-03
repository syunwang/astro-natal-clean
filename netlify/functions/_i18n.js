// 12 星座英文 → 中文
export const SIGN_ZH = [
  "牡羊","金牛","雙子","巨蟹","獅子","處女","天秤","天蠍","射手","摩羯","水瓶","雙魚"
];
export const SIGN_EN = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
];

// 將 API 回傳物件裡的 sign / current_sign 等欄位，補上中文名
export function addChineseSigns(obj) {
  const copy = JSON.parse(JSON.stringify(obj));
  const inject = (node) => {
    if (!node || typeof node !== "object") return;
    for (const k of ["sign","zodiac","zodiac_sign","current_sign"]) {
      if (typeof node[k] === "number") {
        node[k+"_name_zh"] = SIGN_ZH[node[k] % 12];
        node[k+"_name_en"] = SIGN_EN[node[k] % 12];
      }
      if (typeof node[k] === "string") {
        const idx = SIGN_EN.findIndex(s => s.toLowerCase() === String(node[k]).toLowerCase());
        if (idx >= 0) node[k+"_name_zh"] = SIGN_ZH[idx];
      }
    }
    for (const v of Object.values(node)) inject(v);
  };
  inject(copy);
  return copy;
}
