// ===========================
// 学年早見表の英語版（en/school-grades/。K79 の英語）の画面
// 計算は ../../calc.js（gradeTable・gradeNumber・schoolEntryYear・fiscalYearOf・isHayaumare・erasOfYear・eraOf）、
// 法令の値は ../../constants.js。日本語版（gakunen/gakunen.js）と同じ関数を使い、値は持たない。ここにあるのは英語の表示だけ
// 入力した生年月日は保存も送信もしない。ブラウザでは window.SchoolGradesEn、Node（テスト）では module.exports
// ===========================
(function (root) {
  'use strict';

  var C = (typeof module !== 'undefined' && module.exports) ? require('../../calc.js') : root.Calc;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // 学年の名前（calc.js の gradeTable のキー）。ja は日本語の呼び方のローマ字（本文で 1 回だけ説明する）
  var GRADE = {
    k3: { en: 'Kindergarten, 1st year', ja: 'nensho' }, k4: { en: 'Kindergarten, 2nd year', ja: 'nenchu' }, k5: { en: 'Kindergarten, 3rd year', ja: 'nencho' },
    e1: { en: 'Elementary 1', ja: 'shogakko 1' }, e2: { en: 'Elementary 2', ja: 'shogakko 2' }, e3: { en: 'Elementary 3', ja: 'shogakko 3' },
    e4: { en: 'Elementary 4', ja: 'shogakko 4' }, e5: { en: 'Elementary 5', ja: 'shogakko 5' }, e6: { en: 'Elementary 6', ja: 'shogakko 6' },
    j1: { en: 'Junior high 1', ja: 'chugakko 1' }, j2: { en: 'Junior high 2', ja: 'chugakko 2' }, j3: { en: 'Junior high 3', ja: 'chugakko 3' },
    h1: { en: 'High school 1', ja: 'koko 1' }, h2: { en: 'High school 2', ja: 'koko 2' }, h3: { en: 'High school 3', ja: 'koko 3' },
    u1: { en: 'University 1', ja: 'daigaku 1' }, u2: { en: 'University 2', ja: 'daigaku 2' }, u3: { en: 'University 3', ja: 'daigaku 3' }, u4: { en: 'University 4', ja: 'daigaku 4' },
    m1: { en: "Master's 1", ja: 'shushi 1' }, m2: { en: "Master's 2", ja: 'shushi 2' },
    d1: { en: 'Doctoral 1', ja: 'hakase 1' }, d2: { en: 'Doctoral 2', ja: 'hakase 2' }, d3: { en: 'Doctoral 3', ja: 'hakase 3' }
  };
  // 長音の記号つき（画面に出す形。キーの綴りは ASCII のまま）
  var MACRON = { nensho: 'nenshō', nenchu: 'nenchū', nencho: 'nenchō', shogakko: 'shōgakkō', chugakko: 'chūgakkō', koko: 'kōkō', shushi: 'shūshi' };
  function jaName(key) { return GRADE[key].ja.replace(/^[a-z]+/, function (w) { return MACRON[w] || w; }); }
  var STAGE_START = { k3: 1, e1: 1, j1: 1, h1: 1, u1: 1, m1: 1 };

  /** 1 Apr 2019 */
  function fmt(o) { return o.d + ' ' + MON[o.m - 1] + ' ' + o.y; }
  /** 和暦の年（ローマ字）: Reiwa 8。改元の年の 4 月〜は 2 つ（Heisei 31 / Reiwa 1） */
  function eraLabel(fy) {
    return C.erasOfYear(fy).filter(function (x) { return x.to.m >= 4; })
      .map(function (x) { return C.formatEraYear(x.era, x.year, 'en'); }).join(' / ');
  }
  /** 年度の名前: 2026–27 school year (Reiwa 8) */
  function fyLabel(fy) { return fy + '–' + String(fy + 1).slice(2) + ' (' + eraLabel(fy) + ')'; }

  /** fy 年度の表の行（calc.js の gradeTable に英語の名前を足すだけ） */
  function rows(fy) {
    return C.gradeTable(fy).map(function (r) {
      return { key: r.key, n: r.n, name: GRADE[r.key].en, ja: jaName(r.key), from: fmt(r.from), to: fmt(r.to), ages: r.age + '–' + (r.age + 1), grad: r.n >= 17, stageStart: !!STAGE_START[r.key] };
    });
  }

  /**
   * 生年月日 → fy 年度の学年
   * @returns {{n:number, grade:string|null, ja:string|null, before:boolean, after:boolean, early:boolean, entryYear:number, same:{from:string,to:string}, era:string}}
   */
  function lookup(birth, fy) {
    var n = C.gradeNumber(birth, fy);
    var row = C.gradeTable(fy).filter(function (r) { return r.n === n; })[0];
    var entry = C.schoolEntryYear(birth);
    var w = C.eraOf(birth);
    return {
      n: n, grade: row ? GRADE[row.key].en : null, ja: row ? jaName(row.key) : null,
      before: !row && n < -2, after: !row && n > 21,
      early: C.isHayaumare(birth), entryYear: entry,
      same: { from: fmt({ y: entry - 7, m: 4, d: 2 }), to: fmt({ y: entry - 6, m: 4, d: 1 }) },
      era: w ? C.formatEraYear(w.era, w.year, 'en') : ''
    };
  }

  var api = { GRADE: GRADE, fmt: fmt, fyLabel: fyLabel, eraLabel: eraLabel, rows: rows, lookup: lookup, jaName: jaName };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.SchoolGradesEn = api;

  // ===== 画面 =====
  function $(id) { return document.getElementById(id); }
  function nb(s) { return esc(s).replace(/ /g, '&nbsp;'); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var body = $('gk-body');
  if (!body) return;
  var fySel = $('fy'), birthIn = $('birth'), out = $('birth-result'), creditChk = $('credit');
  var now = new Date();
  var fy0 = C.fiscalYearOf({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
  var opts = [];
  for (var y = fy0 + 10; y >= 1990; y--) opts.push('<option value="' + y + '">' + esc(fyLabel(y)) + '</option>');
  fySel.innerHTML = opts.join('');
  fySel.value = String(fy0);

  var bar = root.YorozuScreen.fixedBar({ bar: 'fixbar', watch: 'print', text: 'fixbar-text', onClick: doPrint });

  function readBirth() {
    var v = birthIn.value;   // <input type="date"> は YYYY-MM-DD か空
    if (!v) return null;
    var d = C.parseYmd(v);
    if (!d || d.y < 1900 || d.y > fy0 + 20) return { error: 'Enter a date between 1900 and ' + (fy0 + 20) + '.' };
    return { date: d };
  }

  function render() {
    var fy = Number(fySel.value) || fy0;
    var b = readBirth();
    var mine = b && b.date ? C.gradeNumber(b.date, fy) : null;
    $('sheet-title').textContent = 'Japan school grades by age: ' + fy + '–' + String(fy + 1).slice(2) + ' school year (April ' + fy + ' – March ' + (fy + 1) + ')';
    body.innerHTML = rows(fy).map(function (r) {
      var me = r.n === mine;
      var cls = (r.stageStart ? 'stage-start' : '') + (me ? ' me' : '') + (r.grad ? ' grad' : '');
      return '<tr' + (cls.trim() ? ' class="' + cls.trim() + '"' : '') + (me ? ' aria-current="true"' : '') + '>' +
        '<th scope="row">' + esc(r.name) + (me ? ' <span class="me-mark">◀</span>' : '') + '<span class="gk-ja-in"><i>' + esc(r.ja) + '</i></span></th>' +
        '<td class="gk-ja"><i>' + esc(r.ja) + '</i></td>' +
        // 日付の途中では折り返さない（狭い画面は「–」の後だけで折り返す）
        '<td>' + nb(r.from) + ' –<wbr> ' + nb(r.to) + '</td>' +
        '<td>' + esc(r.ages) + '</td></tr>';
    }).join('');
    $('credit-line').hidden = !creditChk.checked;

    if (!b) out.innerHTML = '';
    else if (b.error) out.innerHTML = '<p class="error">' + esc(b.error) + '</p>';
    else {
      var L = lookup(b.date, fy);
      var what = L.grade ? L.grade + ' (' + L.ja + ')' : (L.before ? 'Not yet in kindergarten' : 'Past doctoral year 3');
      out.innerHTML = '<p class="big">In ' + esc(fy + '–' + String(fy + 1).slice(2)) + ': <strong>' + esc(what) + '</strong></p>' +
        '<p class="small">Starts elementary school in April ' + L.entryYear + '. Same grade: born ' + esc(L.same.from) + ' – ' + esc(L.same.to) + '.' +
        (L.early ? ' Born 1 January – 1 April, so among the youngest in the grade.' : '') + '</p>';
    }
    bar.set('Print the ' + fy + '–' + String(fy + 1).slice(2) + ' chart');
  }
  function doPrint() { root.print(); }
  fySel.addEventListener('change', render);
  birthIn.addEventListener('input', render);
  birthIn.addEventListener('change', render);
  creditChk.addEventListener('change', render);
  $('print').addEventListener('click', doPrint);
  render();
})(this);
