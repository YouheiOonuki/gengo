// ===========================
// 和暦・西暦 変換と年齢早見表 — 計算ロジック（画面から切り離した純粋関数）
// DOM や localStorage に触らない。tests/*.test.js から node --test で確かめる
// 元号の境目は constants.js の ERAS から読む（日本語・英語のページで共通）
// 日付は { y, m, d } の形で持つ（タイムゾーンの影響を受けないように Date は UTC でだけ使う）
// ブラウザでは window.Calc、Node（テスト）では module.exports で使う
// ===========================
(function (root) {
  'use strict';

  var K = (typeof module !== 'undefined' && module.exports) ? require('./constants.js') : root.Constants;

  // --- 日付の道具 ---
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function daysInMonth(y, m) { return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
  function validDate(y, m, d) {
    return Number.isInteger(y) && Number.isInteger(m) && Number.isInteger(d) && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
  }
  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function ymdStr(o) { return String(o.y).padStart(4, '0') + '-' + String(o.m).padStart(2, '0') + '-' + String(o.d).padStart(2, '0'); }
  function cmp(a, b) { return (a.y - b.y) || (a.m - b.m) || (a.d - b.d); }
  function toDays(o) { return Math.round(Date.UTC(o.y, o.m - 1, o.d) / 864e5); }
  function fromDays(n) { var dt = new Date(n * 864e5); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }; }
  function addDays(o, n) { return fromDays(toDays(o) + n); }

  // --- 元号 ---
  var ERAS = K.ERAS.map(function (e) {
    return Object.assign({}, e, { startD: parseYmd(e.start), endD: e.end ? parseYmd(e.end) : null });
  });
  var GREGORIAN = parseYmd(K.gregorianAdoption.value);   // 1873-01-01
  function eraByKey(key) {
    for (var i = 0; i < ERAS.length; i++) if (ERAS[i].key === key) return ERAS[i];
    return null;
  }
  /** その元号の最後の年（今の元号は null） */
  function lastYearOf(era) { return era.endD ? era.endD.y - era.startD.y + 1 : null; }

  /**
   * 西暦の日付 → 和暦
   * @returns {{era:object, year:number, lunar:boolean}|null} 明治元年より前は null。lunar は明治 5 年までの旧暦の期間
   */
  function eraOf(date) {
    for (var i = ERAS.length - 1; i >= 0; i--) {
      var e = ERAS[i];
      if (cmp(date, e.startD) >= 0 && (!e.endD || cmp(date, e.endD) <= 0)) {
        return { era: e, year: date.y - e.startD.y + 1, lunar: cmp(date, GREGORIAN) < 0 };
      }
    }
    return null;
  }

  /**
   * 西暦の年 → その年に含まれる和暦（改元の年は 2 つ）
   * @returns {Array<{era, year, from:{y,m,d}, to:{y,m,d}, lunar:boolean}>}
   */
  function erasOfYear(y) {
    var out = [];
    var jan1 = { y: y, m: 1, d: 1 }, dec31 = { y: y, m: 12, d: 31 };
    ERAS.forEach(function (e) {
      if (cmp(e.startD, dec31) > 0) return;
      if (e.endD && cmp(e.endD, jan1) < 0) return;
      var from = cmp(e.startD, jan1) > 0 ? e.startD : jan1;
      var to = e.endD && cmp(e.endD, dec31) < 0 ? e.endD : dec31;
      out.push({ era: e, year: y - e.startD.y + 1, from: from, to: to, lunar: y < GREGORIAN.y });
    });
    return out;
  }

  /** 和暦の年の表記: 令和元年・令和8年／Reiwa 1・Reiwa 8 */
  function formatEraYear(era, year, lang) {
    if (lang === 'en') return era.romaji + ' ' + year;
    return era.kanji + (year === 1 ? '元' : String(year)) + '年';
  }
  /** 和暦の日付の表記: 令和元年5月1日／Reiwa 1 (2019) May 1 は画面側で */
  function formatWareki(date, lang) {
    var w = eraOf(date);
    if (!w) return '';
    if (lang === 'en') return w.era.romaji + ' ' + w.year + ', ' + MONTHS_EN[date.m - 1] + ' ' + date.d;
    return formatEraYear(w.era, w.year) + date.m + '月' + date.d + '日';
  }
  /** 略記: R8.9.24 */
  function formatAbbr(date) {
    var w = eraOf(date);
    return w ? w.era.abbr + w.year + '.' + date.m + '.' + date.d : '';
  }
  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /**
   * 和暦 → 西暦
   * @param {string} key 元号のキー（'showa' など）
   * @param {number} year 1 以上（元年は 1）
   * @param {number} [m] 月（省略可）
   * @param {number} [d] 日（省略可）
   * @returns {{ok:true, y:number, date?:{y,m,d}, partial?:{from,to}, lunar?:boolean} | {ok:false, error:string, correct?:object, y?:number}}
   *   error: 'era'（元号が無い）| 'year'（その元号に無い年）| 'date'（存在しない日付）| 'outOfEra'（その元号の期間の外。correct に正しい和暦）
   */
  function toSeireki(key, year, m, d) {
    var era = eraByKey(key);
    if (!era) return { ok: false, error: 'era' };
    if (!Number.isInteger(year) || year < 1) return { ok: false, error: 'year' };
    var last = lastYearOf(era);
    if (last !== null && year > last) return { ok: false, error: 'year', last: last, era: era };
    if (!era.endD && year > 200) return { ok: false, error: 'year' };
    var y = era.startD.y + year - 1;
    var lunar = y < GREGORIAN.y;
    if (m === undefined || m === null || m === '') {
      var partial = erasOfYear(y).filter(function (x) { return x.era === era; })[0];
      var full = partial && partial.from.m === 1 && partial.from.d === 1 && partial.to.m === 12 && partial.to.d === 31;
      return { ok: true, y: y, era: era, year: year, partial: full ? null : { from: partial.from, to: partial.to }, lunar: lunar };
    }
    if (lunar) return { ok: true, y: y, era: era, year: year, lunar: true, dateIgnored: true };
    if (!d) d = 1;
    if (!validDate(y, m, d)) return { ok: false, error: 'date' };
    var date = { y: y, m: m, d: d };
    if (cmp(date, era.startD) < 0 || (era.endD && cmp(date, era.endD) > 0)) {
      return { ok: false, error: 'outOfEra', y: y, date: date, correct: eraOf(date) };
    }
    return { ok: true, y: y, era: era, year: year, date: date };
  }

  // --- 文字の読み取り ---

  var KANJI_DIGIT = { '〇': 0, '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  /** 漢数字・元・算用数字を数に（99 まで、または 二〇二六 のような桁並び） */
  function parseJaNumber(s) {
    s = String(s || '').trim();
    if (s === '元') return 1;
    if (/^\d+$/.test(s)) return Number(s);
    if (/^[〇零一二三四五六七八九十]+$/.test(s)) {
      var i = s.indexOf('十');
      if (i < 0) return Number(s.split('').map(function (c) { return KANJI_DIGIT[c]; }).join(''));
      if (s.indexOf('十', i + 1) >= 0) return NaN;
      var tens = i === 0 ? 1 : (i === 1 ? KANJI_DIGIT[s[0]] : NaN);
      var ones = i === s.length - 1 ? 0 : (s.length - i === 2 ? KANJI_DIGIT[s[i + 1]] : NaN);
      return tens * 10 + ones;
    }
    return NaN;
  }

  function normalizeText(t) {
    var s = String(t || '');
    if (s.normalize) s = s.normalize('NFKC');
    return s.replace(/\s+/g, ' ').trim();
  }

  var ERA_WORDS = [];
  ERAS.forEach(function (e) {
    ERA_WORDS.push([e.kanji, e.key], [e.kana, e.key], [e.romaji.toLowerCase(), e.key],
      [e.romaji.toLowerCase().replace('ō', 'o'), e.key], [e.romaji.toLowerCase().replace('ō', 'ou'), e.key],
      [e.romaji.toLowerCase().replace('ō', 'oh'), e.key]);
  });
  ERA_WORDS.push(['syowa', 'showa'], ['taisyo', 'taisho'], ['meiji', 'meiji']);
  ERA_WORDS.sort(function (a, b) { return b[0].length - a[0].length; });

  /**
   * 1 つの入力を読む。和暦（昭和60年3月5日・S60.3.5・H31/4/30・令和元年・Showa 60）か西暦（1985・1985-03-05・1985年3月5日）
   * @returns {{kind:'wareki', era:string, year:number, m?:number, d?:number} | {kind:'seireki', y:number, m?:number, d?:number} | null}
   */
  function parseInput(text) {
    var s = normalizeText(text);
    if (!s) return null;
    var low = s.toLowerCase();
    var key = null, rest = '';
    for (var i = 0; i < ERA_WORDS.length; i++) {
      if (low.indexOf(ERA_WORDS[i][0]) === 0) { key = ERA_WORDS[i][1]; rest = s.slice(ERA_WORDS[i][0].length); break; }
    }
    if (!key) {
      var ab = /^([mtshr])\.?\s*(?=\d|元)/i.exec(s);
      if (ab) {
        var abbr = ab[1].toUpperCase();
        ERAS.forEach(function (e) { if (e.abbr === abbr) key = e.key; });
        rest = s.slice(ab[0].length);
      }
    }
    var num = '(\\d{1,3}|元|[〇一二三四五六七八九十]{1,4})';
    if (key) {
      rest = rest.trim().replace(/^[,.]\s*/, '');
      var m1 = new RegExp('^' + num + '\\s*(?:年\\s*' + '(?:' + num + '\\s*月\\s*(?:' + num + '\\s*日)?)?' + '|[./\\-\\s,]\\s*' + num + '\\s*[./\\-\\s,]\\s*' + num + ')?\\s*$').exec(rest);
      // 形 1: 60年3月5日 / 形 2: 60.3.5
      if (!m1) {
        var m2 = new RegExp('^' + num + '(?:\\s*年)?$').exec(rest);
        if (!m2) return null;
        m1 = [null, m2[1]];
      }
      var year = parseJaNumber(m1[1]);
      var mm = m1[2] || m1[4], dd = m1[3] || m1[5];
      var o = { kind: 'wareki', era: key, year: year };
      if (mm) o.m = parseJaNumber(mm);
      if (dd) o.d = parseJaNumber(dd);
      if (!Number.isFinite(o.year) || (mm && !Number.isFinite(o.m)) || (dd && !Number.isFinite(o.d))) return null;
      return o;
    }
    var w = /^(\d{4})\s*(?:年\s*(?:(\d{1,2})\s*月\s*(?:(\d{1,2})\s*日)?)?|[./\-]\s*(\d{1,2})\s*[./\-]\s*(\d{1,2}))?\s*$/.exec(s);
    if (w) {
      var r = { kind: 'seireki', y: +w[1] };
      if (w[2] || w[4]) r.m = +(w[2] || w[4]);
      if (w[3] || w[5]) r.d = +(w[3] || w[5]);
      return r;
    }
    var w2 = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
    if (w2) return { kind: 'seireki', y: +w2[1], m: +w2[2], d: +w2[3] };
    return null;
  }

  /**
   * 入力を日付に（年齢の計算用）。和暦・西暦どちらでも。年月日がそろわないときは null
   * @returns {{ok:true, date:{y,m,d}} | {ok:false, error:string, correct?:object}}
   */
  function inputToDate(text) {
    var p = parseInput(text);
    if (!p) return { ok: false, error: 'format' };
    if (p.kind === 'seireki') {
      if (!p.m || !p.d) return { ok: false, error: 'needDate' };
      if (!validDate(p.y, p.m, p.d)) return { ok: false, error: 'date' };
      return { ok: true, date: { y: p.y, m: p.m, d: p.d } };
    }
    if (!p.m || !p.d) return { ok: false, error: 'needDate' };
    var r = toSeireki(p.era, p.year, p.m, p.d);
    if (!r.ok) return r;
    if (r.lunar) return { ok: false, error: 'lunar' };
    return { ok: true, date: r.date };
  }

  // --- 年齢 ---

  /**
   * 満年齢（ref の日の年齢）。誕生日の当日から 1 つ増える。
   * 法律上は「誕生日の前日の終わり（午後 12 時）」に年をとる（年齢計算ニ関スル法律・民法 143 条）ので、
   * どの日を見ても結果は同じ。2 月 29 日生まれは、うるう年でない年は 2 月 28 日の終わりに年をとる（3 月 1 日から＋1）
   * @returns {{years:number, kazoe:number, reach:{y,m,d}, nextBirthday:{y,m,d}, daysLived:number}|null}
   */
  function ageAt(birth, ref) {
    if (!validDate(birth.y, birth.m, birth.d) || !validDate(ref.y, ref.m, ref.d) || cmp(ref, birth) < 0) return null;
    var years = ref.y - birth.y;
    if (ref.m < birth.m || (ref.m === birth.m && ref.d < birth.d)) years--;
    var next = anniversary(birth, birth.y + years + 1);
    return {
      years: years,
      kazoe: ref.y - birth.y + 1,
      nextBirthday: next,
      reach: addDays(next, -1),                   // 次の年齢に「達する日」（法律上。誕生日の前日）
      daysLived: toDays(ref) - toDays(birth)
    };
  }
  /** y 年の誕生日（2 月 29 日生まれで平年なら 3 月 1 日＝2 月 28 日の終わりに年をとるため） */
  function anniversary(birth, y) {
    if (birth.m === 2 && birth.d === 29 && !isLeap(y)) return { y: y, m: 3, d: 1 };
    return { y: y, m: birth.m, d: birth.d };
  }

  // --- 学年（4 月 2 日〜翌年 4 月 1 日生まれが同じ学年） ---

  /** 早生まれ（1 月 1 日〜4 月 1 日生まれ） */
  function isHayaumare(birth) { return birth.m < 4 || (birth.m === 4 && birth.d === 1); }
  /** 小学校に入学する年（学校教育法 17 条: 満 6 歳に達した日の翌日以後の最初の 4 月 1 日） */
  function schoolEntryYear(birth) { return birth.y + (isHayaumare(birth) ? 6 : 7); }

  /**
   * 入学・卒業の年月（履歴書用）
   * @returns {Array<{key:string, event:'in'|'out', date:{y,m,d}}>}
   */
  function schoolHistory(birth) {
    var e = schoolEntryYear(birth);
    function ev(key, event, y) { return { key: key, event: event, date: event === 'in' ? { y: y, m: 4, d: 1 } : { y: y, m: 3, d: 31 } }; }
    return [
      ev('elementary', 'in', e), ev('elementary', 'out', e + 6),
      ev('junior', 'in', e + 6), ev('junior', 'out', e + 9),
      ev('high', 'in', e + 9), ev('high', 'out', e + 12),
      ev('college2', 'in', e + 12), ev('college2', 'out', e + 14),
      ev('university', 'in', e + 12), ev('university', 'out', e + 16)
    ];
  }

  /**
   * ref の日の学年（目安。浪人・留年・飛び級は考えない）
   * @returns {{stage:string, grade:number}} stage: 'preschool'|'elementary'|'junior'|'high'|'university'|'graduated'|'notborn'
   */
  function gradeAt(birth, ref) {
    if (cmp(ref, birth) < 0) return { stage: 'notborn', grade: 0 };
    var fy = ref.m >= 4 ? ref.y : ref.y - 1;          // 学年の年度（4 月 1 日始まり）
    var n = fy - schoolEntryYear(birth) + 1;          // 小 1 が 1
    if (n <= 0) return { stage: 'preschool', grade: n };   // 0: 年長、-1: 年中、-2: 年少（3 年保育）
    if (n <= 6) return { stage: 'elementary', grade: n };
    if (n <= 9) return { stage: 'junior', grade: n - 6 };
    if (n <= 12) return { stage: 'high', grade: n - 9 };
    if (n <= 16) return { stage: 'university', grade: n - 12 };
    return { stage: 'graduated', grade: 0 };
  }

  // --- 干支 ---
  var STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var STEMS_KANA = ['きのえ', 'きのと', 'ひのえ', 'ひのと', 'つちのえ', 'つちのと', 'かのえ', 'かのと', 'みずのえ', 'みずのと'];
  var BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var BRANCHES_KANA = ['ね', 'うし', 'とら', 'う', 'たつ', 'み', 'うま', 'ひつじ', 'さる', 'とり', 'いぬ', 'い'];
  var ANIMALS_EN = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Sheep', 'Monkey', 'Rooster', 'Dog', 'Boar'];
  /** 西暦の年の干支（1 月 1 日で切り替える一般的な数え方。立春で切り替える数え方もある） */
  function eto(y) {
    var s = ((y - 4) % 10 + 10) % 10, b = ((y - 4) % 12 + 12) % 12;
    return { kanji: STEMS[s] + BRANCHES[b], kana: STEMS_KANA[s] + BRANCHES_KANA[b], branch: BRANCHES[b], branchKana: BRANCHES_KANA[b], animalEn: ANIMALS_EN[b] };
  }

  // --- 年齢早見表 ---

  /**
   * refYear 年の年齢早見表（生まれ年ごとに、誕生日を迎えた後・前の満年齢）
   * @returns {Array<{birthYear:number, eras:Array<{era,year,from,to}>, eto:object, after:number, before:number}>}
   */
  function ageTable(refYear, maxAge) {
    var rows = [];
    var max = Math.min(Math.max(maxAge || 100, 1), 130);
    for (var a = 0; a <= max; a++) {
      var by = refYear - a;
      rows.push({ birthYear: by, eras: erasOfYear(by), eto: eto(by), after: a, before: a - 1 });
    }
    return rows;
  }

  var api = {
    isLeap: isLeap, validDate: validDate, parseYmd: parseYmd, ymdStr: ymdStr, cmp: cmp, addDays: addDays,
    ERAS: ERAS, eraByKey: eraByKey, lastYearOf: lastYearOf, eraOf: eraOf, erasOfYear: erasOfYear,
    formatEraYear: formatEraYear, formatWareki: formatWareki, formatAbbr: formatAbbr, MONTHS_EN: MONTHS_EN,
    toSeireki: toSeireki, parseJaNumber: parseJaNumber, parseInput: parseInput, inputToDate: inputToDate,
    ageAt: ageAt, anniversary: anniversary, isHayaumare: isHayaumare, schoolEntryYear: schoolEntryYear,
    schoolHistory: schoolHistory, gradeAt: gradeAt, eto: eto, ageTable: ageTable
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(this);
