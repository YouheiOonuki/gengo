// ===========================
// 回忌の計算（kaiki/index.html）の画面
// 計算は ../calc.js（kaikiList・chuinList・kaikiYearTable）、数え方と出典は ../constants.js（kaiki・chuin）
// 入力した命日・名前は保存も送信もしない。日本語だけ。広告なしのページ（D118）
// ===========================
(function () {
  'use strict';

  var C = window.Calc;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function today() { var n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }; }
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  function ymd(o) { return o.y + '年' + o.m + '月' + o.d + '日'; }
  function wa(o) { return C.formatWareki(o); }
  function eraYear(o) { var w = C.eraOf(o); return w ? C.formatEraYear(w.era, w.year) : ''; }
  function wd(o) { return WD[C.weekdayOf(o)]; }
  var CHUIN_NAME = { 7: '初七日', 14: '二七日', 21: '三七日', 28: '四七日', 35: '五七日', 42: '六七日', 49: '四十九日（七七日）', 100: '百か日' };
  var N2X_STATE = { both: '二十三・二十五・二十七回忌', split: '二十三・二十七回忌', n25: '二十五回忌' };
  var ERR = {
    format: '読み取れませんでした。「令和8年5月1日」「2026-05-01」のように入れてください。',
    needDate: '年・月・日まで入れてください。', date: 'ありえない日付です。',
    lunar: '明治5年12月2日までは旧暦のため、この計算では扱いません。', year: 'その元号にその年はありません。', era: '元号が分かりませんでした。'
  };
  var GREGORIAN = C.parseYmd(window.Constants.gregorianAdoption.value);

  var deathIn = $('death'), out = $('kaiki-result'), sheet = $('sheet');
  var n2xSel = $('n2x'), extraChk = $('extra'), nameIn = $('name'), creditChk = $('credit'), chuinPrintChk = $('chuin-print-chk');
  var kyearSel = $('kyear');
  var t0 = today();
  var opts = [];
  for (var y = t0.y + 10; y >= t0.y - 10; y--) opts.push('<option value="' + y + '">' + y + '年（' + C.erasOfYear(y).map(function (x) { return C.formatEraYear(x.era, x.year); }).join('・') + '）</option>');
  kyearSel.innerHTML = opts.join('');
  kyearSel.value = String(t0.y);

  function readDeath() {
    if (!deathIn.value.trim()) return null;
    var b = C.inputToDate(deathIn.value);
    if (!b.ok) {
      var msg = ERR[b.error] || ERR.format;
      if (b.error === 'outOfEra' && b.correct) msg = ERR.date + ' → ' + wa(b.date);
      return { error: msg };
    }
    if (C.cmp(b.date, GREGORIAN) < 0) return { error: ERR.lunar };
    return { date: b.date };
  }
  function chuinMode() {
    var r = document.querySelector('input[name="chuin"]:checked');
    return r && r.value === 'taiya' ? 'taiya' : 'shoto';
  }
  function kaikiOpt() { return { n2x: n2xSel.value, extra: extraChk.checked }; }

  function chuinTable(list) {
    return '<table class="gk-table kk-table"><thead><tr><th scope="col">忌日</th><th scope="col">月日</th><th scope="col">曜日</th></tr></thead><tbody>' +
      list.map(function (r) {
        return '<tr' + (r.day === 49 ? ' class="hon"' : '') + '><th scope="row">' + esc(CHUIN_NAME[r.day]) + '</th><td>' + esc(ymd(r.date)) + '</td><td>' + wd(r.date) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function render() {
    var opt = kaikiOpt(), mode = chuinMode();
    window.YorozuScreen.detailsSummary({
      'opt-count': N2X_STATE[opt.n2x] + (opt.extra ? '・三十七〜四十七回忌' : ''),
      'opt-chuin': mode === 'taiya' ? '前日から（逮夜）' : '命日を 1 日目',
      'opt-print': (nameIn.value.trim() ? '名前あり' : '名前なし') + (creditChk.checked ? '' : '・クレジットなし')
    });
    renderYear();

    var d = readDeath();
    if (!d) { out.innerHTML = '<p class="empty">—</p>'; sheet.hidden = true; $('chuin-result').innerHTML = ''; return; }
    if (d.error) { out.innerHTML = '<p class="error">' + esc(d.error) + '</p>'; sheet.hidden = true; $('chuin-result').innerHTML = ''; return; }
    var death = d.date, list = C.kaikiList(death, opt), chuin = C.chuinList(death, mode);

    // いちばん近い、今日以後の法要（忌日を含む）
    var next = null;
    chuin.forEach(function (r) { if (!next && C.cmp(r.date, t0) >= 0) next = { name: CHUIN_NAME[r.day], date: r.date }; });
    list.forEach(function (r) { if (!next && C.cmp(r.date, t0) >= 0) next = { name: r.name, date: r.date }; });
    var html = '';
    if (next) html += '<p class="big">次は <strong>' + esc(next.name) + '</strong> ' + esc(ymd(next.date)) + '（' + wd(next.date) + '）</p>';
    html += '<p class="small">命日 ' + esc(ymd(death) + '（' + wa(death) + '・' + wd(death) + '曜日）') + '</p>';
    html += '<p class="small">この計算は目安です。法要の日取りは、お寺とご家族で決めます。<button type="button" class="btn kk-print" id="print">この表を印刷する（A4 1 枚）</button></p>';
    out.innerHTML = html;
    $('print').addEventListener('click', function () { doPrint('sheet'); });

    var nm = nameIn.value.trim();
    $('sheet-title').textContent = (nm ? '故 ' + nm + ' 様　' : '') + '年回法要の表';
    $('sheet-sub').textContent = '命日 ' + ymd(death) + '（' + wa(death) + '）';
    var hasNoLeap = false, hasFuture = false;
    $('kaiki-body').innerHTML = list.map(function (r) {
      if (r.noLeap) hasNoLeap = true;
      if (!C.eraOf(r.date) || C.cmp(r.date, t0) > 0) hasFuture = true;
      var past = C.cmp(r.date, t0) < 0;
      return '<tr' + (past ? ' class="grad"' : '') + '><th scope="row">' + esc(r.name) + '<span class="small">（' + r.years + ' 年後）</span></th>' +
        '<td>' + esc(ymd(r.date)) + (r.noLeap ? '＊' : '') + '</td><td>' + esc(eraYear(r.date)) + '</td><td>' + wd(r.date) + '</td></tr>';
    }).join('');
    var foot = ['亡くなった年を 1 回と数えるので、三回忌は 2 年後、七回忌は 6 年後です。五十回忌の後は 50 年ごと。'];
    if (hasFuture) foot.push('先の年の和暦は、令和が続いた場合の年です。');
    if (hasNoLeap) foot.push('＊ 2 月 29 日が無い年は 2 月 28 日と書いています。日取りはお寺に確かめてください。');
    $('sheet-foot').textContent = foot.join(' ');
    $('credit-line').hidden = !creditChk.checked;
    $('chuin-result').innerHTML = chuinTable(chuin);
    $('chuin-print').innerHTML = chuinPrintChk.checked ? '<h3 class="yk-h">四十九日・百か日（' + (mode === 'taiya' ? '前日から数える' : '亡くなった日を 1 日目') + '）</h3>' + chuinTable(chuin) : '';
    sheet.hidden = false;
  }

  function renderYear() {
    var yr = Number(kyearSel.value) || t0.y;
    var rows = C.kaikiYearTable(yr, kaikiOpt());
    $('year-title').textContent = yr + '年（' + C.erasOfYear(yr).map(function (x) { return C.formatEraYear(x.era, x.year); }).join('・') + '）の回忌早見表';
    $('year-body').innerHTML = rows.map(function (r) {
      var eras = C.erasOfYear(r.deathYear).map(function (x) { return C.formatEraYear(x.era, x.year); }).join('・');
      return '<tr><th scope="row">' + esc(r.name) + '</th><td>' + r.deathYear + '年（' + esc(eras) + '）に亡くなった方</td></tr>';
    }).join('');
    $('year-credit').hidden = !creditChk.checked;
    window.YorozuScreen.detailsSummary({ 'opt-year': yr + '年' });
  }

  // 印刷する表を 1 つにする（body の class で、もう一方を印刷から外す）
  function doPrint(which) {
    document.body.classList.toggle('print-year', which === 'year');
    if (which === 'year') $('opt-year').open = true;
    window.print();
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('print-year'); });

  deathIn.addEventListener('input', render);
  n2xSel.addEventListener('change', render);
  extraChk.addEventListener('change', render);
  nameIn.addEventListener('input', render);
  creditChk.addEventListener('change', render);
  chuinPrintChk.addEventListener('change', render);
  kyearSel.addEventListener('change', renderYear);
  Array.prototype.forEach.call(document.querySelectorAll('input[name="chuin"]'), function (r) { r.addEventListener('change', render); });
  $('print-year').addEventListener('click', function () { doPrint('year'); });
  render();
})();
