// ===========================
// 家族の年表（nenpyo/）の計算。画面に依存しない。Node（テスト）では module.exports、ブラウザでは window.Nenpyo
// 年齢・学年・和暦は ../calc.js、年齢の決まり（成年・年金・定年）と出典は ../constants.js
//
// 年表の 1 行 = 1 年（1 月〜12 月）。人ごとの欄に
//   - その年の誕生日を迎えた後の満年齢（年の数え方は年齢計算ニ関スル法律。生まれた年は「誕生」）
//   - 4 月からの学年（年少〜大学 4 年。浪人・留年・飛び級は考えない、ストレートの場合の目安）
//   - 出来事: 入園・小中高大の入学・大学卒業・成人・年祝い・定年・年金
// 「○歳に達する日」は誕生日の前日（民法 143 条）。1 月 1 日生まれの人は前の年の 12 月 31 日に達する
// ===========================
(function (root) {
  'use strict';
  var C = (typeof module !== 'undefined' && module.exports) ? require('../calc.js') : root.Calc;
  var K = (typeof module !== 'undefined' && module.exports) ? require('../constants.js') : root.Constants;

  var MAX_PEOPLE = 8;
  var MAX_EVENTS = 20;
  var SPANS = [10, 20, 30, 40, 50, 60];
  var DEFAULTS = {
    people: [{ name: '', birth: '', retire: '' }],
    start: null,              // null なら今年
    span: 30,
    preschool: 3,             // 入園: 3 年保育・2 年保育・1 年保育・0（出さない）
    school: true, adult: true, iwai: true, pension: false,
    events: []                // { year, text }
  };

  /** 年齢 n に「達する日」（法律上。誕生日の前日） */
  function reachDate(birth, n) {
    return C.addDays(C.anniversary(birth, birth.y + n), -1);
  }

  /** 4 月からの学年の短い名前（n: 小 1 が 1、年長 0、年中 -1、年少 -2） */
  function gradeShort(n, preschool) {
    if (n <= 0) {
      if (preschool > 0 && n >= 1 - preschool) return ['年少', '年中', '年長'][n + 2];
      return '';
    }
    if (n <= 6) return '小' + n;
    if (n <= 9) return '中' + (n - 6);
    if (n <= 12) return '高' + (n - 9);
    if (n <= 16) return '大' + (n - 12);
    return '';
  }

  /** 1 人の、y 年の出来事（文字の配列） */
  function eventsOf(birth, y, opt) {
    var out = [];
    if (y === birth.y) out.push('誕生');
    var entry = C.schoolEntryYear(birth);
    if (opt.school) {
      if (opt.preschool > 0 && y === entry - opt.preschool) out.push('入園（' + opt.preschool + ' 年保育）');
      if (y === entry) out.push('小学校入学');
      if (y === entry + 6) out.push('中学校入学');
      if (y === entry + 9) out.push('高校入学');
      if (y === entry + 12) out.push('大学入学');
      if (y === entry + 16) out.push('大学卒業（4 年制）');
    }
    if (opt.adult && reachDate(birth, K.adultAge.value).y === y) out.push('成人（' + K.adultAge.value + ' 歳）');
    if (opt.retire && reachDate(birth, opt.retire).y === y) out.push('定年（' + opt.retire + ' 歳）');
    if (opt.pension && reachDate(birth, K.pensionAge.value).y === y) out.push('年金（' + K.pensionAge.value + ' 歳から。原則）');
    if (opt.iwai) {
      C.toshiiwaiOf(birth.y, y).forEach(function (t) {
        if (t.kazoe) out.push(t.name.replace(/（.*）/, '') + (t.man ? '' : '（数え ' + t.age + '）'));
      });
    }
    return out;
  }

  /**
   * 年表の行
   * @param {Array<{label:string, birth:{y,m,d}|null, retire:number|null}>} people
   * @returns {Array<{year:number, cells:Array<{age:number|null, grade:string, events:string[]}>, family:string[]}>}
   */
  function buildRows(people, opt) {
    var rows = [];
    for (var y = opt.start; y < opt.start + opt.span; y++) {
      var cells = people.map(function (p) {
        if (!p.birth || y < p.birth.y) return { age: null, grade: '', events: [] };
        var n = C.gradeNumber(p.birth, y);
        return {
          age: y - p.birth.y,
          grade: opt.school ? gradeShort(n, opt.preschool) : '',
          events: eventsOf(p.birth, y, { school: opt.school, preschool: opt.preschool, adult: opt.adult, iwai: opt.iwai, pension: opt.pension, retire: p.retire })
        };
      });
      var fam = (opt.events || []).filter(function (e) { return e.year === y; }).map(function (e) { return e.text; });
      rows.push({ year: y, cells: cells, family: fam });
    }
    return rows;
  }

  function clampInt(v, lo, hi, dflt) {
    var x = Math.round(Number(v));
    return isFinite(x) && v !== '' && v !== null ? Math.max(lo, Math.min(hi, x)) : dflt;
  }
  function str(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }

  /** 保存・読み込みの値を直す（そのまま信じない） */
  function normalize(raw, thisYear) {
    var s = JSON.parse(JSON.stringify(DEFAULTS));
    if (!raw || typeof raw !== 'object') { s.start = thisYear; return s; }
    if (Array.isArray(raw.people) && raw.people.length) {
      s.people = raw.people.slice(0, MAX_PEOPLE).map(function (p) {
        p = p || {};
        var r = clampInt(p.retire, 50, 80, '');
        return { name: str(p.name, 12), birth: str(p.birth, 40), retire: r };
      });
    }
    s.start = clampInt(raw.start, 1900, 2200, thisYear);
    s.span = SPANS.indexOf(Number(raw.span)) >= 0 ? Number(raw.span) : DEFAULTS.span;
    s.preschool = [0, 1, 2, 3].indexOf(Number(raw.preschool)) >= 0 ? Number(raw.preschool) : DEFAULTS.preschool;
    ['school', 'adult', 'iwai', 'pension'].forEach(function (k) { if (typeof raw[k] === 'boolean') s[k] = raw[k]; });
    if (Array.isArray(raw.events)) {
      s.events = raw.events.slice(0, MAX_EVENTS).map(function (e) {
        e = e || {};
        return { year: clampInt(e.year, 1900, 2200, ''), text: str(e.text, 30) };
      });
    }
    return s;
  }

  // 生年月日が 1 人も無く、家の予定も無いときは表を出さない（SCREEN 3 章「必須が空なら結果は『—』」）
  function isEmpty(people, events) {
    return !people.some(function (p) { return p.birth; }) && !(events && events.length);
  }

  var api = { MAX_PEOPLE: MAX_PEOPLE, MAX_EVENTS: MAX_EVENTS, SPANS: SPANS, DEFAULTS: DEFAULTS,
    reachDate: reachDate, gradeShort: gradeShort, eventsOf: eventsOf, buildRows: buildRows, normalize: normalize, isEmpty: isEmpty };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Nenpyo = api;
})(this);
