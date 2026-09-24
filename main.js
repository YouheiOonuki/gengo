// ===========================
// 和暦・西暦 変換と年齢早見表 — 画面の制御（日本語 / 英語のページで共通）
// 計算は calc.js、元号の境目は constants.js。文言はこのファイルの STR に日英で持ち、<html lang> で選ぶ
// 入力した生年月日などは保存も送信もしない
// ===========================
(function () {
  'use strict';

  var C = window.Calc;
  var LANG = document.documentElement.lang === 'en' ? 'en' : 'ja';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k] !== undefined ? o[k] : ''; }); }

  var STR = {
    ja: {
      wd: ['日', '月', '火', '水', '木', '金', '土'],
      year: '{y}年', ymd: '{y}年{m}月{d}日',
      err: {
        format: '読み取れませんでした。「昭和60年」「H31.4.30」「1985」「1985-03-05」のように入れてください。',
        era: '元号が分かりませんでした。', date: 'ありえない日付です。', needDate: '年・月・日まで入れてください。',
        lunar: '明治5年12月2日までは旧暦（太陰太陽暦）のため、月日は変換できません。',
        year: 'その元号にその年はありません。', before: '明治より前（慶応以前）は対象外です。', future: '日付の範囲を超えています。'
      },
      lastYear: '{era}は{n}年までです。',
      outOfEra: '{input}はありません。その日は <strong>{correct}</strong> です。',
      partial: '{w}は {from}〜{to} だけです。',
      lunarNote: '明治5年（1872年）までは旧暦のため、西暦の年と 1〜2 月ほどずれます（明治6年1月1日＝1873年1月1日から新暦）。',
      eto: '干支', ageThisYear: '{y}年生まれの人は、今年（{now}年）の誕生日で {a} 歳',
      yearHas: '{y}年に含まれる和暦',
      abbr: '略記', weekday: '曜日',
      age: '満 {n} 歳', kazoe: '数え年 {n} 歳', lived: '生まれてから {n} 日',
      next: '次の誕生日 {d}（{n} 歳）', reach: '法律上 {n} 歳に達する日: {d}（誕生日の前日）',
      leapNote: '2 月 29 日生まれは、うるう年でない年は 2 月 28 日の終わりに年をとります（3 月 1 日から {n} 歳）。',
      hayaumare: '早生まれ（1 月 1 日〜4 月 1 日生まれ）', notHaya: '4 月 2 日〜12 月 31 日生まれ',
      grade: '学年（{ref}時点・目安）',
      stage: { preschool: ['年少（3 歳児クラス）', '年中', '年長'], elementary: '小学 {g} 年生', junior: '中学 {g} 年生', high: '高校 {g} 年生', university: '大学 {g} 年生（4 年制・目安）', graduated: '大学卒業の年齢以上', notborn: '—', before: '未就学' },
      school: { elementary: '小学校', junior: '中学校', high: '高等学校', college2: '短大・専門学校（2 年）', university: '大学（4 年）' },
      evIn: '入学', evOut: '卒業',
      histHead: ['学校', '', '西暦', '和暦'],
      refDate: '基準日', born: '生年月日',
      tableHead: ['生まれ年', '和暦', '干支', '誕生日後', '誕生日前'],
      ageUnit: '{n}歳',
      tableTitle: '{y}年（{w}）年齢早見表',
      credit: 'yorozu-craft.com/gengo/print/ で作成',
      eraList: ['元号', '読み', '始まり', '終わり', '年数']
    },
    en: {
      wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      year: '{y}', ymd: '{mon} {d}, {y}',
      err: {
        format: 'Could not read that. Try "Showa 60", "H31.4.30", "令和元年", "1985" or "1985-03-05".',
        era: 'Unknown era.', date: 'That date does not exist.', needDate: 'Enter a full year, month and day.',
        lunar: 'Until Meiji 5 (1872) Japan used the lunisolar calendar, so month and day cannot be converted.',
        year: 'That era does not have that year.', before: 'Dates before the Meiji era are not covered.', future: 'Out of range.'
      },
      lastYear: '{era} ended in year {n}.',
      outOfEra: 'There is no {input}. That day is <strong>{correct}</strong>.',
      partial: '{w} only covers {from} to {to}.',
      lunarNote: 'Until Meiji 5 (1872) Japan used the lunisolar calendar, so the Japanese year is 1–2 months off from the Western year. The Gregorian calendar started on Meiji 6, January 1 (1 January 1873).',
      eto: 'Zodiac (eto)', ageThisYear: 'Someone born in {y} turns {a} on their birthday this year ({now}).',
      yearHas: 'Japanese years in {y}',
      abbr: 'Abbreviation', weekday: 'Day of week',
      age: 'Age {n}', kazoe: 'Traditional count (kazoedoshi) {n}', lived: '{n} days since birth',
      next: 'Next birthday {d} (turns {n})', reach: 'Under Japanese law you legally turn {n} at the end of {d} (the day before the birthday).',
      leapNote: 'Born on 29 February: in non-leap years you turn a year older at the end of 28 February (age {n} from 1 March).',
      hayaumare: '"Hayaumare" (born 1 January–1 April): in the school year with children born the year before', notHaya: 'Born 2 April–31 December',
      grade: 'School grade in Japan on {ref} (typical)',
      stage: { preschool: ['Kindergarten, 3-year-old class', 'Kindergarten, 4-year-old class', 'Kindergarten, final year'], elementary: 'Elementary school, grade {g}', junior: 'Junior high school, year {g}', high: 'High school, year {g}', university: 'University, year {g} (4-year course)', graduated: 'Past university age', notborn: '—', before: 'Before kindergarten' },
      school: { elementary: 'Elementary school', junior: 'Junior high school', high: 'High school', college2: 'Junior college / vocational (2 years)', university: 'University (4 years)' },
      evIn: 'Enter', evOut: 'Graduate',
      histHead: ['School', '', 'Western', 'Japanese era'],
      refDate: 'Reference date', born: 'Date of birth',
      tableHead: ['Born in', 'Japanese era', 'Zodiac', 'After birthday', 'Before birthday'],
      ageUnit: '{n}',
      tableTitle: 'Age chart for {y} ({w})',
      credit: 'Made at yorozu-craft.com/gengo/print/',
      eraList: ['Era', 'Reading', 'Began', 'Ended', 'Years']
    }
  };
  var T = STR[LANG];

  function dateText(o) {
    return LANG === 'en' ? fmt(T.ymd, { y: o.y, mon: C.MONTHS_EN[o.m - 1].slice(0, 3), d: o.d }) : fmt(T.ymd, o);
  }
  function eraYearText(era, year) {
    return LANG === 'en' ? era.romaji + ' ' + year + ' (' + era.kanji + (year === 1 ? '元' : year) + '年)' : C.formatEraYear(era, year);
  }
  function eraYearShort(era, year) {
    return LANG === 'en' ? era.romaji + ' ' + year : C.formatEraYear(era, year);
  }
  function warekiDate(date) {
    var w = C.eraOf(date);
    if (!w) return '';
    if (LANG === 'en') return w.era.romaji + ' ' + w.year + ', ' + C.MONTHS_EN[date.m - 1] + ' ' + date.d + ' (' + C.formatWareki(date) + ')';
    return C.formatWareki(date);
  }
  function weekday(date) { return T.wd[new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay()]; }
  function etoText(y) {
    var e = C.eto(y);
    return LANG === 'en' ? e.animalEn + ' (' + e.kanji + ', ' + e.kana + ')' : e.kanji + '（' + e.kana + '）';
  }
  function today() { var n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }; }

  // --- 変換 ---
  var conv = $('conv'), convOut = $('conv-result');
  function row(label, value) { return '<tr><th scope="row">' + esc(label) + '</th><td>' + value + '</td></tr>'; }

  function renderConv() {
    var text = conv.value;
    // 空のときは「—」（SCREEN.md 3 章。結果の場所は読み込み時から見せておく）
    if (!text.trim()) { convOut.innerHTML = '<p class="empty">—</p>'; return; }
    var p = C.parseInput(text);
    if (!p) { convOut.innerHTML = '<p class="error">' + esc(T.err.format) + '</p>'; return; }
    var now = today();
    var html = '';
    if (p.kind === 'wareki') {
      var r = C.toSeireki(p.era, p.year, p.m, p.d);
      var era = C.eraByKey(p.era);
      if (!r.ok) {
        if (r.error === 'outOfEra' && r.correct) {
          var inputTxt = LANG === 'en' ? era.romaji + ' ' + p.year + ', ' + C.MONTHS_EN[p.m - 1] + ' ' + (p.d || 1) : C.formatEraYear(era, p.year) + p.m + '月' + (p.d || 1) + '日';
          html = '<p class="error">' + fmt(T.outOfEra, { input: esc(inputTxt), correct: esc(warekiDate(r.date)) }) + '</p>';
          html += '<p class="big">' + esc(dateText(r.date)) + '</p>';
        } else if (r.error === 'year' && r.last) {
          html = '<p class="error">' + esc(fmt(T.lastYear, { era: LANG === 'en' ? era.romaji : era.kanji, n: r.last })) + '</p>';
        } else html = '<p class="error">' + esc(T.err[r.error] || T.err.format) + '</p>';
        convOut.innerHTML = html; return;
      }
      if (r.date) {
        html += '<p class="big"><span>' + esc(warekiDate(r.date)) + '</span> = <strong>' + esc(dateText(r.date)) + '</strong></p>';
        html += '<table class="result-table"><tbody>';
        html += row(T.weekday, esc(weekday(r.date)));
        html += row(T.abbr, esc(C.formatAbbr(r.date)));
        html += row(T.eto, esc(etoText(r.date.y)));
        html += '</tbody></table>';
      } else {
        html += '<p class="big"><span>' + esc(eraYearText(r.era, r.year)) + '</span> = <strong>' + esc(fmt(T.year, { y: r.y })) + '</strong></p>';
        if (r.partial) html += '<p class="note">' + esc(fmt(T.partial, { w: eraYearShort(r.era, r.year), from: dateText(r.partial.from), to: dateText(r.partial.to) })) + '</p>';
        if (r.lunar) html += '<p class="note">' + esc(T.lunarNote) + (r.dateIgnored ? ' ' + esc(T.err.lunar) : '') + '</p>';
        html += '<table class="result-table"><tbody>';
        html += row(T.eto, esc(etoText(r.y)));
        if (r.y <= now.y) html += row('', esc(fmt(T.ageThisYear, { y: r.y, now: now.y, a: now.y - r.y })));
        html += '</tbody></table>';
      }
    } else {
      if (p.m) {
        var d = { y: p.y, m: p.m, d: p.d || 1 };
        if (!C.validDate(d.y, d.m, d.d)) { convOut.innerHTML = '<p class="error">' + esc(T.err.date) + '</p>'; return; }
        var w = C.eraOf(d);
        if (!w) { convOut.innerHTML = '<p class="error">' + esc(T.err.before) + '</p>'; return; }
        html += '<p class="big"><span>' + esc(dateText(d)) + '</span> = <strong>' + esc(w.lunar ? eraYearText(w.era, w.year) : warekiDate(d)) + '</strong></p>';
        if (w.lunar) html += '<p class="note">' + esc(T.lunarNote) + '</p>';
        html += '<table class="result-table"><tbody>';
        html += row(T.weekday, esc(weekday(d)));
        if (!w.lunar) html += row(T.abbr, esc(C.formatAbbr(d)));
        html += row(T.eto, esc(etoText(d.y)));
        html += '</tbody></table>';
      } else {
        var list = C.erasOfYear(p.y);
        if (!list.length) { convOut.innerHTML = '<p class="error">' + esc(T.err.before) + '</p>'; return; }
        html += '<p class="big"><span>' + esc(fmt(T.year, { y: p.y })) + '</span> = <strong>' + list.map(function (x) { return esc(eraYearText(x.era, x.year)); }).join(LANG === 'en' ? ' / ' : '・') + '</strong></p>';
        if (list.length > 1) {
          html += '<ul class="note">' + list.map(function (x) { return '<li>' + esc(eraYearShort(x.era, x.year)) + ': ' + esc(dateText(x.from)) + ' – ' + esc(dateText(x.to)) + '</li>'; }).join('') + '</ul>';
        }
        if (list[0].lunar) html += '<p class="note">' + esc(T.lunarNote) + '</p>';
        html += '<table class="result-table"><tbody>';
        html += row(T.eto, esc(etoText(p.y)));
        if (p.y <= now.y) html += row('', esc(fmt(T.ageThisYear, { y: p.y, now: now.y, a: now.y - p.y })));
        html += '</tbody></table>';
      }
    }
    convOut.innerHTML = html;
  }
  conv.addEventListener('input', renderConv);
  Array.prototype.forEach.call(document.querySelectorAll('[data-example]'), function (b) {
    b.addEventListener('click', function () { conv.value = b.getAttribute('data-example'); renderConv(); conv.focus(); });
  });

  // --- 元号の一覧（constants.js から作る） ---
  var eraBody = $('era-list');
  if (eraBody) {
    eraBody.innerHTML = C.ERAS.slice().reverse().map(function (e) {
      var years = C.lastYearOf(e);
      return '<tr><th scope="row">' + (LANG === 'en' ? esc(e.romaji) + ' <span lang="ja">' + esc(e.kanji) + '</span>' : esc(e.kanji)) + '</th><td>' +
        (LANG === 'en' ? '<span lang="ja">' + esc(e.kana) + '</span> (' + esc(e.abbr) + ')' : esc(e.kana) + '（' + esc(e.romaji) + '・' + esc(e.abbr) + '）') + '</td><td>' +
        esc(dateText(e.startD)) + '</td><td>' + (e.endD ? esc(dateText(e.endD)) : '—') + '</td><td>' + (years ? years : '—') + '</td></tr>';
    }).join('');
  }

  // --- 年齢 ---
  var birthIn = $('birth'), refIn = $('ref'), ageOut = $('age-result');
  var t0 = today();
  refIn.value = C.ymdStr(t0);
  function renderAge() {
    if (!birthIn.value.trim()) { ageOut.innerHTML = ''; return; }
    var b = C.inputToDate(birthIn.value);
    if (!b.ok) {
      var msg = T.err[b.error] || T.err.format;
      if (b.error === 'outOfEra' && b.correct) msg = T.err.date + ' → ' + warekiDate(b.date);
      ageOut.innerHTML = '<p class="error">' + esc(msg) + '</p>'; return;
    }
    var ref = C.parseYmd(refIn.value) || today();
    var birth = b.date;
    var a = C.ageAt(birth, ref);
    if (!a) { ageOut.innerHTML = '<p class="error">' + esc(T.err.date) + '</p>'; return; }
    var html = '<p class="big"><strong>' + esc(fmt(T.age, { n: a.years })) + '</strong> <span class="small">' + esc(fmt(T.kazoe, { n: a.kazoe })) + '</span></p>';
    html += '<table class="result-table"><tbody>';
    html += row(T.born, esc(dateText(birth) + ' / ' + warekiDate(birth)) + ' (' + esc(weekday(birth)) + ')');
    html += row(T.eto, esc(etoText(birth.y)));
    html += row('', esc(fmt(T.next, { d: dateText(a.nextBirthday), n: a.years + 1 })));
    html += row('', esc(fmt(T.reach, { n: a.years + 1, d: dateText(a.reach) })));
    if (birth.m === 2 && birth.d === 29) html += row('', esc(fmt(T.leapNote, { n: a.years + 1 })));
    html += row('', esc(fmt(T.lived, { n: a.daysLived.toLocaleString(LANG) })));
    var g = C.gradeAt(birth, ref);
    var gs;
    if (g.stage === 'preschool') gs = g.grade >= -2 ? T.stage.preschool[g.grade + 2] : T.stage.before;
    else gs = fmt(T.stage[g.stage], { g: g.grade });
    html += row(fmt(T.grade, { ref: dateText(ref) }), esc(gs) + '<br><span class="small">' + esc(C.isHayaumare(birth) ? T.hayaumare : T.notHaya) + '</span>');
    html += '</tbody></table>';
    var hist = C.schoolHistory(birth);
    html += '<details class="history" open><summary>' + (LANG === 'ja' ? '入学・卒業の年（履歴書用・浪人や留年がない場合）' : 'Year of entering and graduating (Japanese school system, no gap years)') + '</summary>';
    html += '<div class="table-wrap"><table class="hist-table"><thead><tr><th>' + T.histHead.map(esc).join('</th><th>') + '</th></tr></thead><tbody>';
    html += hist.map(function (h) {
      var w = C.eraOf(h.date);
      var ym = LANG === 'en' ? C.MONTHS_EN[h.date.m - 1].slice(0, 3) + ' ' + h.date.y : h.date.y + '年' + h.date.m + '月';
      var wy = w ? (LANG === 'en' ? w.era.romaji + ' ' + w.year : C.formatEraYear(w.era, w.year) + h.date.m + '月') : '';
      return '<tr><td>' + esc(T.school[h.key]) + '</td><td>' + esc(h.event === 'in' ? T.evIn : T.evOut) + '</td><td>' + esc(ym) + '</td><td>' + esc(wy) + '</td></tr>';
    }).join('');
    html += '</tbody></table></div></details>';
    ageOut.innerHTML = html;
  }
  birthIn.addEventListener('input', renderAge);
  refIn.addEventListener('input', renderAge);
  $('ref-today').addEventListener('click', function () { refIn.value = C.ymdStr(today()); renderAge(); });

  // --- 年齢早見表 ---
  var yearSel = $('table-year'), maxSel = $('table-max'), creditChk = $('credit'), tableOut = $('hayami');
  var opts = [];
  for (var y = t0.y + 10; y >= 1990; y--) opts.push('<option value="' + y + '">' + y + (LANG === 'ja' ? '年（' + C.erasOfYear(y).map(function (x) { return C.formatEraYear(x.era, x.year); }).join('・') + '）' : ' (' + C.erasOfYear(y).map(function (x) { return x.era.romaji + ' ' + x.year; }).join(' / ') + ')') + '</option>');
  yearSel.innerHTML = opts.join('');
  yearSel.value = String(t0.y);

  function eraCell(r) {
    return r.eras.map(function (x) {
      return LANG === 'en' ? x.era.abbr + x.year : C.formatEraYear(x.era, x.year).replace(/年$/, '');
    }).join(LANG === 'en' ? '/' : '・');
  }
  function renderTable() {
    var ry = Number(yearSel.value) || t0.y;
    var rows = C.ageTable(ry, Number(maxSel.value) || 100);
    var half = Math.ceil(rows.length / 2);
    var head = '<thead><tr><th>' + T.tableHead.map(esc).join('</th><th>') + '</th></tr></thead>';
    function tbl(part) {
      return '<table class="hayami-table">' + head + '<tbody>' + part.map(function (r) {
        var e = C.eto(r.birthYear);
        return '<tr' + (r.eras.length > 1 ? ' class="change"' : '') + '><td>' + r.birthYear + '</td><td>' + esc(eraCell(r)) + '</td><td>' + esc(LANG === 'en' ? e.animalEn : e.branch) + '</td><td>' + esc(fmt(T.ageUnit, { n: r.after })) + '</td><td>' + (r.before >= 0 ? esc(fmt(T.ageUnit, { n: r.before })) : '—') + '</td></tr>';
      }).join('') + '</tbody></table>';
    }
    var w = C.erasOfYear(ry).map(function (x) { return LANG === 'en' ? x.era.romaji + ' ' + x.year : C.formatEraYear(x.era, x.year); }).join(LANG === 'en' ? ' / ' : '・');
    tableOut.innerHTML = '<h3 class="hayami-title">' + esc(fmt(T.tableTitle, { y: ry, w: w })) + '</h3>' +
      '<div class="hayami-cols">' + tbl(rows.slice(0, half)) + tbl(rows.slice(half)) + '</div>' +
      (creditChk.checked ? '<p class="credit">' + esc(T.credit) + '</p>' : '');
    // 早見表の details（SCREEN.md 1.1 の 4）の summary に、何年の表か・年齢の範囲（選択肢の文字のまま）
    window.YorozuScreen.detailsSummary({ 'sec-hayami': yearSel.options[yearSel.selectedIndex].text + (LANG === 'en' ? ', ' : '・') + maxSel.options[maxSel.selectedIndex].text });
  }
  yearSel.addEventListener('change', renderTable);
  maxSel.addEventListener('change', renderTable);
  creditChk.addEventListener('change', renderTable);
  $('print').addEventListener('click', function () { renderTable(); window.print(); });
  // 早見表は details の中にあるので、ブラウザのメニューから印刷したときも閉じたままにしない
  window.addEventListener('beforeprint', function () { $('sec-hayami').open = true; });

  renderConv();
  renderTable();
})();
