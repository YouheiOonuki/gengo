// ===========================
// 厄年・還暦 早見表（yakudoshi/index.html）の画面
// 計算は ../calc.js（yakuTable・yakuOf・toshiiwaiTable・toshiiwaiOf）、年齢の例と出典は ../constants.js（yakudoshi・toshiiwai）
// 入力した生年月日は保存も送信もしない。日本語だけ
// ===========================
(function () {
  'use strict';

  var C = window.Calc;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function today() { var n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }; }
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  var KIND = { mae: '前厄', hon: '本厄', ato: '後厄' };
  var ERR = {
    format: '読み取れませんでした。「昭和60年3月5日」「1985-03-05」のように入れてください。',
    needDate: '年・月・日まで入れてください。', date: 'ありえない日付です。',
    lunar: '明治5年12月2日までは旧暦のため、月日は変換できません。', year: 'その元号にその年はありません。', era: '元号が分かりませんでした。'
  };

  /** 生まれ年の和暦（改元の年は 2 つ: 昭和64・平成元） */
  function eraYears(y) {
    return C.erasOfYear(y).map(function (x) { return C.formatEraYear(x.era, x.year).replace(/年$/, ''); }).join('・');
  }
  function yearLabel(y) { return y + '年（' + eraYears(y) + '年）'; }

  var yearSel = $('year'), birthIn = $('birth'), out = $('birth-result'), creditChk = $('credit'), ruleSel = $('rule');
  var y0 = today().y;
  var opts = [];
  for (var y = y0 + 10; y >= y0 - 10; y--) opts.push('<option value="' + y + '">' + esc(yearLabel(y)) + '</option>');
  yearSel.innerHTML = opts.join('');
  yearSel.value = String(y0);

  var bar = window.YorozuScreen.fixedBar({ bar: 'fixbar', watch: 'print', text: 'fixbar-text', onClick: doPrint });

  function cell(r, mine) {
    var me = mine === r.birthYear;
    return '<td class="' + (r.kind === 'hon' ? 'hon' : '') + (me ? ' me' : '') + '"' + (me ? ' aria-current="true"' : '') + '>' +
      '<span class="yk-age">' + r.age + '歳' + (r.kind === 'hon' && r.taiyaku ? '（大厄）' : '') + (me ? ' ◀' : '') + '</span>' +
      '<span class="yk-by">' + r.birthYear + '年<br>' + esc(eraYears(r.birthYear)) + '年・' + esc(C.eto(r.birthYear).branch) + '</span></td>';
  }
  function yakuRows(rows, sex, mine) {
    var list = rows.filter(function (r) { return r.sex === sex; }), html = '';
    for (var i = 0; i < list.length; i += 3) {
      html += '<tr' + (list[i + 1].optional ? ' class="optional"' : '') + '>' + cell(list[i], mine) + cell(list[i + 1], mine) + cell(list[i + 2], mine) + '</tr>';
    }
    return html;
  }

  function readBirth() {
    if (!birthIn.value.trim()) return null;
    var b = C.inputToDate(birthIn.value);
    if (b.ok) return { date: b.date };
    var msg = ERR[b.error] || ERR.format;
    if (b.error === 'outOfEra' && b.correct) msg = ERR.date + ' → ' + C.formatWareki(b.date);
    return { error: msg };
  }

  /** その人の、その年の厄（男性・女性それぞれ） */
  function yakuText(by, sex, yr, rule) {
    var r = C.yakuOf(by, sex, yr, rule)[0];
    if (!r) return '厄年ではない';
    return KIND[r.kind] + (r.kind === 'hon' && r.taiyaku ? '（大厄）' : '') + (r.optional ? '（37 歳は寺社による）' : '');
  }

  function render() {
    var yr = Number(yearSel.value) || y0, rule = ruleSel.value === 'mannen' ? 'mannen' : 'kazoe';
    var b = readBirth(), mine = b && b.date ? b.date.y : null;
    var rows = C.yakuTable(yr, rule);
    $('sheet-title').textContent = yearLabel(yr) + ' 厄年・年祝い 早見表';
    $('yk-male').innerHTML = yakuRows(rows, 'male', mine);
    $('yk-female').innerHTML = yakuRows(rows, 'female', mine);
    $('yk-note').textContent = rule === 'mannen'
      ? '年齢は「その年の満年齢」（その年の誕生日を迎えた後の年齢）。川崎大師の数え方で、数え年の寺社とは 25・42・19・33 歳の生まれ年が 1 年ずれます。'
      : '年齢は数え年（生まれた年を 1 歳とし、元日で 1 つ増える）。37 歳は厄年としない寺社もあります（薄い色）。数え方は寺社によって違います。';
    $('iwai-body').innerHTML = C.toshiiwaiTable(yr).map(function (t) {
      function by(v) { return '<td' + (mine === v ? ' class="me"' : '') + '>' + v + '年<br>' + esc(eraYears(v)) + '年</td>'; }
      var age = t.age + ' 歳' + (t.manAge !== t.age ? '（満 ' + t.manAge + '）' : '');
      return '<tr><th scope="row">' + esc(t.name) + '<br><span class="small">' + esc(t.kana + '・' + age) + '</span></th>' +
        by(t.kazoeBirth) + by(t.manBirth) + '</tr>';
    }).join('');
    $('credit-line').hidden = !creditChk.checked;
    window.YorozuScreen.detailsSummary({ 'opt-rule': rule === 'mannen' ? 'その年の満年齢（川崎大師）' : '数え年' });

    if (!b) out.innerHTML = '';
    else if (b.error) out.innerHTML = '<p class="error">' + esc(b.error) + '</p>';
    else {
      var d = b.date, kz = C.kazoeAge(d.y, yr);
      var html = '<p class="small">' + esc(d.y + '年' + d.m + '月' + d.d + '日（' + C.formatWareki(d) + '）') + ' は ' +
        '<strong>' + WD[C.weekdayOf(d)] + '曜日</strong>・干支 ' + esc(C.eto(d.y).kanji + '（' + C.eto(d.y).kana + '）') + '</p>';
      if (kz < 1) html += '<p class="small">' + yr + '年はまだ生まれていません。</p>';
      else {
        html += '<p class="big">' + yr + '年は <strong>数え ' + kz + ' 歳</strong> <span class="small">満 ' + Math.max(0, kz - 2) + '〜' + (kz - 1) + ' 歳（誕生日の前・後）</span></p>';
        html += '<p class="small">厄年: 男性なら <strong>' + esc(yakuText(d.y, 'male', yr, rule)) + '</strong>、女性なら <strong>' + esc(yakuText(d.y, 'female', yr, rule)) + '</strong></p>';
        var iw = C.toshiiwaiOf(d.y, yr);
        if (iw.length) html += '<p class="small">年祝い: ' + iw.map(function (t) {
          return esc(t.name) + (t.kazoe && t.man ? '' : t.kazoe ? '（数え年で祝う場合）' : '（満年齢で祝う場合）');
        }).join('、') + '</p>';
      }
      out.innerHTML = html;
    }
    bar.set('印刷する（' + yr + '年の厄年・年祝い 早見表）');
  }
  function doPrint() { window.print(); }

  yearSel.addEventListener('change', render);
  ruleSel.addEventListener('change', render);
  birthIn.addEventListener('input', render);
  creditChk.addEventListener('change', render);
  $('print').addEventListener('click', doPrint);
  render();
})();
