// ===========================
// 学年早見表（gakunen/index.html）と履歴書の学歴 計算（gakunen/rireki.html）の画面
// 計算は ../calc.js（gradeTable・gradeNumber・resumeHistory）、修業年限と法令は ../constants.js
// 入力した生年月日は保存も送信もしない。日本語だけ（英語版は未作成）
// ===========================
(function () {
  'use strict';

  var C = window.Calc;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function today() { var n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() }; }
  function ymd(o) { return o.y + '年' + o.m + '月' + o.d + '日'; }
  function wareki(o) { return C.formatWareki(o); }
  function dot(o) { return o.y + '.' + o.m + '.' + o.d; }
  function dotWa(o) { var w = C.eraOf(o); return w ? w.era.kanji + w.year + '.' + o.m + '.' + o.d : ''; }
  function eraYear(o) { var w = C.eraOf(o); return w ? C.formatEraYear(w.era, w.year) : ''; }

  var ERR = {
    format: '読み取れませんでした。「平成12年5月1日」「2000-05-01」のように入れてください。',
    needDate: '年・月・日まで入れてください。', date: 'ありえない日付です。',
    lunar: '明治5年12月2日までは旧暦のため、月日は変換できません。', year: 'その元号にその年はありません。', era: '元号が分かりませんでした。'
  };
  /** 生年月日の欄を読む。空なら null、読めなければ { error } */
  function readBirth(input) {
    if (!input.value.trim()) return null;
    var b = C.inputToDate(input.value);
    if (b.ok) return { date: b.date };
    var msg = ERR[b.error] || ERR.format;
    if (b.error === 'outOfEra' && b.correct) msg = ERR.date + ' → ' + wareki(b.date);
    return { error: msg };
  }
  function hayaText(b) {
    return C.isHayaumare(b) ? '早生まれ（1 月 1 日〜4 月 1 日生まれ）' : '4 月 2 日〜12 月 31 日生まれ';
  }

  // 学年の名前（calc.js の gradeTable のキー）
  var GRADE_NAME = {
    k3: '年少（3 歳児）', k4: '年中', k5: '年長',
    e1: '小学 1 年', e2: '小学 2 年', e3: '小学 3 年', e4: '小学 4 年', e5: '小学 5 年', e6: '小学 6 年',
    j1: '中学 1 年', j2: '中学 2 年', j3: '中学 3 年', h1: '高校 1 年', h2: '高校 2 年', h3: '高校 3 年',
    u1: '大学 1 年', u2: '大学 2 年', u3: '大学 3 年', u4: '大学 4 年',
    m1: '修士 1 年', m2: '修士 2 年', d1: '博士 1 年', d2: '博士 2 年', d3: '博士 3 年'
  };
  var STAGE_START = { k3: 1, e1: 1, j1: 1, h1: 1, u1: 1, m1: 1 };

  /** 年度の名前: 2026年度（令和8年度）。4 月〜12 月に改元があった年は 2019年度（平成31年度・令和元年度） */
  function fyLabel(fy) {
    var names = C.erasOfYear(fy).filter(function (x) { return x.to.m >= 4; }).map(function (x) { return C.formatEraYear(x.era, x.year) + '度'; });
    return fy + '年度（' + names.join('・') + '）';
  }

  // ===== 学年早見表 =====
  var body = $('gk-body');
  if (body) {
    var fySel = $('fy'), birthIn = $('birth'), out = $('birth-result'), creditChk = $('credit');
    var fy0 = C.fiscalYearOf(today());
    var opts = [];
    for (var y = fy0 + 10; y >= 1990; y--) opts.push('<option value="' + y + '">' + esc(fyLabel(y)) + '</option>');
    fySel.innerHTML = opts.join('');
    fySel.value = String(fy0);

    var bar = window.YorozuScreen.fixedBar({ bar: 'fixbar', watch: 'print', text: 'fixbar-text', onClick: doPrint });

    var render = function () {
      var fy = Number(fySel.value) || fy0;
      var rows = C.gradeTable(fy);
      var b = readBirth(birthIn);
      var mine = b && b.date ? C.gradeNumber(b.date, fy) : null;
      $('sheet-title').textContent = fyLabel(fy) + ' 学年早見表';
      body.innerHTML = rows.map(function (r) {
        var me = r.n === mine;
        var cls = (STAGE_START[r.key] ? 'stage-start' : '') + (me ? ' me' : '') + (r.n >= 17 ? ' grad' : '');
        return '<tr' + (cls.trim() ? ' class="' + cls.trim() + '"' : '') + (me ? ' aria-current="true"' : '') + '>' +
          '<th scope="row">' + esc(GRADE_NAME[r.key]) + (me ? ' <span class="me-mark">◀</span>' : '') + '</th>' +
          // 画面の狭いときは短い形（2019.4.2〜2020.4.1 と 平成31.4.2〜令和2.4.1 を 2 行）、印刷と広い画面は西暦・和暦の 2 列
          '<td><span class="gk-long">' + esc(ymd(r.from)) + '〜<wbr>' + esc(ymd(r.to)) + '</span>' +
          '<span class="gk-short">' + esc(dot(r.from)) + '〜' + esc(dot(r.to)) + '<br>' + esc(dotWa(r.from)) + '〜' + esc(dotWa(r.to)) + '</span></td>' +
          '<td class="gk-wa">' + esc(wareki(r.from)) + '〜<wbr>' + esc(wareki(r.to)) + '</td>' +
          '<td>' + r.age + '〜' + (r.age + 1) + '歳</td></tr>';
      }).join('');
      $('credit-line').hidden = !creditChk.checked;

      if (!b) out.innerHTML = '';
      else if (b.error) out.innerHTML = '<p class="error">' + esc(b.error) + '</p>';
      else {
        var row = rows.filter(function (r) { return r.n === mine; })[0];
        var what = row ? GRADE_NAME[row.key] + (row.n >= 1 && row.n <= 16 ? '生' : '') :
          (mine < -2 ? '年少より前' : '博士 3 年より上の年代');
        var entry = C.schoolEntryYear(b.date);
        var same = { from: { y: entry - 7, m: 4, d: 2 }, to: { y: entry - 6, m: 4, d: 1 } };
        out.innerHTML = '<p class="big">' + esc(fy + '年度は ') + '<strong>' + esc(what) + '</strong></p>' +
          '<p class="small">' + esc(hayaText(b.date)) + '。同じ学年は ' + esc(ymd(same.from)) + '〜' + esc(ymd(same.to)) + ' 生まれ</p>';
      }
      bar.set('印刷する（' + fy + '年度の学年早見表）');
    };
    fySel.addEventListener('change', render);
    birthIn.addEventListener('input', render);
    creditChk.addEventListener('change', render);
    $('print').addEventListener('click', doPrint);
    render();
  }
  function doPrint() { window.print(); }

  // ===== 履歴書の学歴 =====
  var resOut = $('rireki-result');
  if (resOut) {
    var bIn = $('birth'), finalSel = $('final'), roninSel = $('ronin'), yearsBox = $('years');
    var NAME = {
      elementary: '小学校', junior: '中学校', high: '高等学校', senmon: '専門学校', tandai: '短期大学', kosen: '高等専門学校',
      univ4: '大学', univ6: '大学', master: '大学院 修士課程', doctorLater: '大学院 博士後期課程', doctor6: '大学院 博士課程'
    };
    var GRAD = { master: 1, doctorLater: 1, doctor6: 1 };
    var chosen = {};   // 学校ごとに選んだ在学年数（最終学歴を変えても残す）
    var lastRows = [];

    // 最終学歴の学校の並びと標準の年数（生年月日によらないので、仮の日付で calc.js に聞く）
    var pathOf = function (final) {
      var h = C.resumeHistory({ y: 2000, m: 5, d: 1 }, { final: final });
      var list = [];
      for (var i = 0; i < h.length; i += 2) list.push({ key: h[i].key, std: h[i + 1].date.y - h[i].date.y });
      return list;
    };
    var buildYears = function () {
      yearsBox.innerHTML = pathOf(finalSel.value).map(function (s) {
        var max = Math.max(s.std + 4, 6), cur = chosen[s.key] || s.std, o = [];
        for (var n = 1; n <= max; n++) o.push('<option value="' + n + '"' + (n === cur ? ' selected' : '') + '>' + n + ' 年' + (n === s.std ? '（標準）' : '') + '</option>');
        return '<div class="field"><label for="yr-' + s.key + '">' + esc(NAME[s.key]) + '</label><select id="yr-' + s.key + '" data-key="' + s.key + '">' + o.join('') + '</select></div>';
      }).join('');
    };

    var renderR = function () {
      var path = pathOf(finalSel.value);
      var years = {}, changed = [];
      path.forEach(function (s) {
        var el = $('yr-' + s.key);
        var v = el ? Number(el.value) : s.std;
        years[s.key] = v;
        if (v !== s.std) changed.push(NAME[s.key].replace('大学院 ', '') + ' ' + v + ' 年');
      });
      var ronin = Number(roninSel.value) || 0;
      if (ronin) changed.unshift(ronin + ' 浪');
      window.YorozuScreen.detailsSummary({ 'opt-years': changed.length ? changed.join('・') : 'なし' });

      var b = readBirth(bIn);
      if (!b) { resOut.innerHTML = '<p class="empty">—</p>'; lastRows = []; return; }
      if (b.error) { resOut.innerHTML = '<p class="error">' + esc(b.error) + '</p>'; lastRows = []; return; }
      var h = C.resumeHistory(b.date, { final: finalSel.value, years: years, ronin: ronin });
      lastRows = h.map(function (r) {
        var w = C.eraOf(r.date);
        return {
          sei: r.date.y + '年', wa: w ? C.formatEraYear(w.era, w.year) : '', m: r.date.m + '月',
          what: NAME[r.key] + ' ' + (r.event === 'in' ? '入学' : (GRAD[r.key] ? '修了' : '卒業'))
        };
      });
      var last = h[h.length - 1];
      var html = '<p class="big"><strong>' + esc(lastRows[lastRows.length - 1].sei + lastRows[lastRows.length - 1].m) + '</strong> ' +
        esc(NAME[last.key] + (GRAD[last.key] ? ' 修了' : ' 卒業')) + '</p>';
      html += '<p class="small">' + esc(ymd(b.date) + '（' + wareki(b.date) + '）生まれ・' + hayaText(b.date)) + '</p>';
      html += '<div class="table-wrap"><table class="hist-table rireki-table"><thead><tr><th scope="col">西暦</th><th scope="col">和暦</th><th scope="col">月</th><th scope="col">学歴</th></tr></thead><tbody>';
      html += lastRows.map(function (r) {
        return '<tr><td>' + esc(r.sei) + '</td><td>' + esc(r.wa) + '</td><td>' + esc(r.m) + '</td><td>' + esc(r.what) + '</td></tr>';
      }).join('');
      html += '</tbody></table></div>';
      html += '<p class="inline-row copy-row"><button type="button" class="btn btn-sub" data-copy="sei">西暦でコピー</button><button type="button" class="btn btn-sub" data-copy="wa">和暦でコピー</button><span class="small" id="copied" role="status"></span></p>';
      html += '<p class="small">この計算は目安です。学校名を足して使ってください。根拠と注意は<a href="./guide.html">使い方ページ</a>に。</p>';
      resOut.innerHTML = html;
    };

    // コピー: 1 行 1 項目、年・月・学歴をタブで区切る（表計算の履歴書にそのまま貼れる）
    resOut.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-copy]');
      if (!btn || !lastRows.length) return;
      var k = btn.getAttribute('data-copy');
      var text = lastRows.map(function (r) { return r[k] + '\t' + r.m + '\t' + r.what; }).join('\n');
      var done = function () { var s = $('copied'); if (s) s.textContent = 'コピーしました'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      else { fallbackCopy(text); done(); }
    });
    var fallbackCopy = function (text) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (err) { /* コピーできない環境では何もしない */ }
      document.body.removeChild(ta);
    };

    yearsBox.addEventListener('change', function (e) {
      var k = e.target.getAttribute('data-key');
      if (k) chosen[k] = Number(e.target.value);
      renderR();
    });
    finalSel.addEventListener('change', function () { buildYears(); renderR(); });
    roninSel.addEventListener('change', renderR);
    bIn.addEventListener('input', renderR);
    buildYears();
    renderR();
  }
})();
