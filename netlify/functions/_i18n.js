// 簡易字典（可自行擴充）
const PLANET_ZH = {
  'Sun':'太陽', 'Moon':'月亮', 'Mercury':'水星', 'Venus':'金星', 'Earth':'地球',
  'Mars':'火星', 'Jupiter':'木星', 'Saturn':'土星', 'Uranus':'天王星', 'Neptune':'海王星', 'Pluto':'冥王星',
  'Ascendant':'上升', 'Midheaven':'天頂'
};
const SIGN_ZH = {
  'Aries':'牡羊', 'Taurus':'金牛', 'Gemini':'雙子', 'Cancer':'巨蟹',
  'Leo':'獅子', 'Virgo':'處女', 'Libra':'天秤', 'Scorpio':'天蠍',
  'Sagittarius':'射手', 'Capricorn':'魔羯', 'Aquarius':'水瓶', 'Pisces':'雙魚'
};

function translatePlanetsOutput(output, lang='zh') {
  if (lang === 'en') return output;
  return (output || []).map(row => {
    const r = { ...row };
    if (r.planet?.en && PLANET_ZH[r.planet.en]) r.planet.zh = PLANET_ZH[r.planet.en];
    if (r.zodiac_sign?.name?.en && SIGN_ZH[r.zodiac_sign.name.en]) {
      r.zodiac_sign.name.zh = SIGN_ZH[r.zodiac_sign.name.en];
    }
    return r;
  });
}

module.exports = { translatePlanetsOutput };
