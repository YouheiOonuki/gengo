// ===========================
// 家族の年表（nenpyo/index.html）の画面
// 計算は ./nenpyo-calc.js（年齢・学年・節目）、和暦は ../calc.js。保存は localStorage の gengo_nenpyo だけ
// ===========================
(function () {
  'use strict';

  var C = window.Calc, N = window.Nenpyo;
  var KEY = 'gengo_nenpyo';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var thisYear = new Date().getFullYear();
  var ERR = {
    format: '読み取れません（例: 昭和60年3月5日／1985-03-05）', needDate: '年・月・日まで入れてください', date: 'ありえない日付です',
    lunar: '明治5年12月2日までは旧暦のため変換できません', year: 'その元号にその年はありません', era: '元号が分かりませんでした'
  };

  var st = load();
  function load() {
    try { return N.normalize(JSON.parse(localStorage.getItem(KEY) || 'null'), thisYear); } catch (e) { return N.normalize(null, thisYear); }
  }
  var saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 保存できなくても動く */ } }, 300);
  }

  function eraYears(y) {
    return C.erasOfYear(y).map(function (x) { return C.formatEraYear(x.era, x.year).replace(/年$/, ''); }).join('・');
  }

  // ---- 選択肢 ----
  (function () {
    var o = [];
    for (var y = thisYear - 30; y <= thisYear + 30; y++) o.push('<option value="' + y + '">' + y + '年（' + esc(eraYears(y)) + '）</option>');
    $('start').innerHTML = o.join('');
    $('span').innerHTML = N.SPANS.map(function (s) { return '<option value="' + s + '">' + s + ' 年分</option>'; }).join('');
  })();

  // ---- 家族の行 ----
  function renderPeople() {
    $('people').innerHTML = st.people.map(function (p, i) {
      return '<div class="np-person" data-i="' + i + '">' +
        '<div class="field np-name"><label for="name-' + i + '">呼び名</label><input type="text" id="name-' + i + '" data-k="name" maxlength="12" placeholder="例：父・長女" value="' + esc(p.name) + '"></div>' +
        '<div class="field np-birth"><label for="birth-' + i + '">生年月日</label><input type="text" id="birth-' + i + '" data-k="birth" autocomplete="off" placeholder="例：昭和60年3月5日" value="' + esc(p.birth) + '"><span class="np-err" id="err-' + i + '" aria-live="polite"></span></div>' +
        '<div class="field np-retire"><label for="retire-' + i + '">定年（任意）</label><input type="number" id="retire-' + i + '" data-k="retire" min="50" max="80" inputmode="numeric" placeholder="例：65" value="' + esc(p.retire) + '"></div>' +
        (st.people.length > 1 ? '<button type="button" class="btn np-del" data-del="' + i + '" aria-label="' + (i + 1) + ' 人目を消す">×</button>' : '') +
        '</div>';
    }).join('');
    $('add-person').hidden = st.people.length >= N.MAX_PEOPLE;
  }
  $('people').addEventListener('input', function (e) {
    var row = e.target.closest('.np-person');
    if (!row || !e.target.dataset.k) return;
    var p = st.people[Number(row.dataset.i)];
    var k = e.target.dataset.k;
    p[k] = k === 'retire' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
    render(); save();
  });
  $('people').addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]');
    if (!b) return;
    st.people.splice(Number(b.dataset.del), 1);
    renderPeople(); render(); save();
  });
  $('add-person').addEventListener('click', function () {
    if (st.people.length >= N.MAX_PEOPLE) return;
    st.people.push({ name: '', birth: '', retire: '' });
    renderPeople(); render(); save();
    var inp = $('name-' + (st.people.length - 1));
    if (inp) inp.focus();
  });

  // ---- 家の予定 ----
  function renderEvents() {
    $('family-events').innerHTML = st.events.map(function (ev, i) {
      return '<div class="np-event" data-i="' + i + '">' +
        '<div class="field"><label for="ev-year-' + i + '">年（西暦）</label><input type="number" id="ev-year-' + i + '" data-k="year" min="1900" max="2200" inputmode="numeric" placeholder="例：2045" value="' + esc(ev.year) + '"></div>' +
        '<div class="field"><label for="ev-text-' + i + '">予定</label><input type="text" id="ev-text-' + i + '" data-k="text" maxlength="30" placeholder="例：住宅ローン完済" value="' + esc(ev.text) + '"></div>' +
        '<button type="button" class="btn np-del" data-del="' + i + '" aria-label="' + (i + 1) + ' 件目の予定を消す">×</button></div>';
    }).join('');
    $('add-event').hidden = st.events.length >= N.MAX_EVENTS;
  }
  $('family-events').addEventListener('input', function (e) {
    var row = e.target.closest('.np-event');
    if (!row || !e.target.dataset.k) return;
    var ev = st.events[Number(row.dataset.i)];
    ev[e.target.dataset.k] = e.target.dataset.k === 'year' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
    render(); save();
  });
  $('family-events').addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]');
    if (!b) return;
    st.events.splice(Number(b.dataset.del), 1);
    renderEvents(); render(); save();
  });
  $('add-event').addEventListener('click', function () {
    st.events.push({ year: '', text: '' });
    renderEvents(); render(); save();
  });

  // ---- 設定 ----
  function syncOpts() {
    $('start').value = String(st.start);
    if ($('start').value !== String(st.start)) { $('start').insertAdjacentHTML('afterbegin', '<option value="' + st.start + '">' + st.start + '年</option>'); $('start').value = String(st.start); }
    $('span').value = String(st.span);
    $('school').checked = st.school;
    $('preschool').value = String(st.preschool);
    $('preschool').disabled = !st.school;
    $('adult').checked = st.adult;
    $('iwai').checked = st.iwai;
    $('pension').checked = st.pension;
  }
  ['start', 'span', 'preschool'].forEach(function (id) {
    $(id).addEventListener('change', function () { st[id] = Number($(id).value); syncOpts(); render(); save(); });
  });
  ['school', 'adult', 'iwai', 'pension'].forEach(function (id) {
    $(id).addEventListener('change', function () { st[id] = $(id).checked; syncOpts(); render(); save(); });
  });
  $('credit').addEventListener('change', render);

  // ---- 年表 ----
  var bar = window.YorozuScreen.fixedBar({ bar: 'fixbar', watch: 'print', text: 'fixbar-text', onClick: doPrint });

  function render() {
    var people = st.people.map(function (p, i) {
      var label = p.name.trim() || (i + 1) + ' 人目';
      var errEl = $('err-' + i);
      var birth = null;
      if (p.birth.trim()) {
        var r = C.inputToDate(p.birth);
        if (r.ok) birth = r.date;
        if (errEl) errEl.textContent = r.ok ? C.formatWareki(r.date) + '生まれ' : (ERR[r.error] || ERR.format);
        if (errEl) errEl.className = 'np-err' + (r.ok ? '' : ' bad');
      } else if (errEl) errEl.textContent = '';
      return { label: label, birth: birth, retire: p.retire === '' ? null : Number(p.retire) };
    });
    var events = st.events.filter(function (e) { return e.year !== '' && e.text.trim(); }).map(function (e) { return { year: Number(e.year), text: e.text.trim() }; });
    var rows = N.buildRows(people, { start: st.start, span: st.span, preschool: st.preschool, school: st.school, adult: st.adult, iwai: st.iwai, pension: st.pension, events: events });
    var hasFamily = events.length > 0;

    $('np-head').innerHTML = '<tr><th scope="col">年</th>' + people.map(function (p) { return '<th scope="col">' + esc(p.label) + '</th>'; }).join('') +
      (hasFamily ? '<th scope="col">家の予定</th>' : '') + '</tr>';
    $('np-body').innerHTML = rows.map(function (r) {
      var mark = r.cells.some(function (c) { return c.events.length; }) || r.family.length;
      return '<tr' + (r.year === thisYear ? ' class="me"' : '') + '><th scope="row"><span class="np-y">' + r.year + '</span><span class="np-w">' + esc(eraYears(r.year)) + '</span></th>' +
        r.cells.map(function (c) {
          if (c.age === null) return '<td></td>';
          return '<td' + (c.events.length ? ' class="ev"' : '') + '><span class="np-age">' + (c.age === 0 ? '0 歳' : c.age + ' 歳') + (c.grade ? ' <span class="np-g">' + esc(c.grade) + '</span>' : '') + '</span>' +
            (c.events.length ? '<span class="np-e">' + c.events.map(esc).join('<br>') + '</span>' : '') + '</td>';
        }).join('') +
        (hasFamily ? '<td' + (r.family.length ? ' class="ev"' : '') + '>' + r.family.map(esc).join('<br>') + '</td>' : '') +
        '</tr>' + (mark ? '' : '');
    }).join('');
    $('sheet-title').textContent = '家族の年表（' + st.start + '〜' + (st.start + st.span - 1) + '年）';
    $('credit-line').hidden = !$('credit').checked;

    var opts = [];
    if (st.school) opts.push('学校');
    if (st.adult) opts.push('成人');
    if (st.iwai) opts.push('年祝い');
    if (st.pension) opts.push('年金');
    window.YorozuScreen.detailsSummary({
      'opt-range': (st.start === thisYear ? '今年' : st.start + '年') + 'から ' + st.span + ' 年',
      'opt-events': opts.length ? opts.join('・') : 'なし',
      'opt-family': events.length + ' 件'
    });
    var named = people.filter(function (p) { return p.birth; }).length;
    bar.set(named ? '印刷する（' + named + ' 人・' + st.span + ' 年分）' : '');
  }
  function doPrint() { window.print(); }
  $('print').addEventListener('click', doPrint);

  // ---- 書き出し・読み込み（README「ツールを追加するとき」20） ----
  $('export').addEventListener('click', function () {
    var d = new Date();
    var ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    var json = JSON.stringify({ tool: 'gengo', version: 1, exportedAt: d.toISOString(), data: { gengo_nenpyo: st } }, null, 1);
    var url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url; a.download = 'gengo-backup-' + ymd + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    $('save-msg').textContent = 'ファイルに書き出しました。';
  });
  $('import').addEventListener('click', function () { $('import-file').click(); });
  $('import-file').addEventListener('change', function () {
    var f = $('import-file').files[0];
    $('import-file').value = '';
    if (!f) return;
    f.text().then(function (t) {
      var obj = JSON.parse(t);
      if (!obj || obj.tool !== 'gengo' || !obj.data || !obj.data.gengo_nenpyo) throw new Error('tool');
      if (!window.confirm('ファイルの内容で、いまの入力を上書きしますか？')) return;
      st = N.normalize(obj.data.gengo_nenpyo, thisYear);
      renderPeople(); renderEvents(); syncOpts(); render(); save();
      $('save-msg').textContent = 'ファイルから読み込みました。';
    }).catch(function () { $('save-msg').textContent = 'このファイルは読み込めません（家族の年表で書き出したファイルを選んでください）。'; });
  });

  renderPeople(); renderEvents(); syncOpts(); render();
})();
