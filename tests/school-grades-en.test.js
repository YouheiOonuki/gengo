// 学年早見表の英語版（en/school-grades/）のテスト: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../calc.js');
const K = require('../constants.js');
const E = require('../en/school-grades/school-grades.js');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const JA = /[぀-ヿ㐀-鿿＀-￯]/;
const S = (o) => C.ymdStr(o);

test('表は calc.js の gradeTable と同じ行・同じ日付（値を写していない）', () => {
  for (const fy of [1990, 2019, 2026, 2036]) {
    const t = C.gradeTable(fy), r = E.rows(fy);
    assert.equal(r.length, t.length);
    r.forEach((row, i) => {
      assert.equal(row.key, t[i].key);
      assert.equal(row.from, E.fmt(t[i].from));
      assert.equal(row.to, E.fmt(t[i].to));
      assert.equal(row.ages, t[i].age + '–' + (t[i].age + 1));
      assert.ok(E.GRADE[row.key], row.key);
    });
  }
});

test('2026–27 の行（手で確かめた値。日本語版の tests/gakunen.test.js と同じ）', () => {
  const r = Object.fromEntries(E.rows(2026).map((x) => [x.key, x]));
  assert.deepEqual([r.k3.from, r.k3.to, r.k3.ages], ['2 Apr 2022', '1 Apr 2023', '3–4']);
  assert.deepEqual([r.e1.from, r.e1.to, r.e1.ages, r.e1.ja], ['2 Apr 2019', '1 Apr 2020', '6–7', 'shōgakkō 1']);
  assert.deepEqual([r.h3.from, r.h3.to, r.h3.name], ['2 Apr 2008', '1 Apr 2009', 'High school 3']);
  assert.deepEqual([r.d3.from, r.d3.to, r.d3.ages], ['2 Apr 1999', '1 Apr 2000', '26–27']);
  assert.equal(r.m1.ja, 'shūshi 1');
});

test('生年月日から学年（4 月 1 日と 4 月 2 日の境目、早生まれ）', () => {
  const a = E.lookup({ y: 2019, m: 4, d: 1 }, 2026);
  assert.deepEqual([a.grade, a.ja, a.early, a.entryYear, a.era], ['Elementary 2', 'shōgakkō 2', true, 2025, 'Heisei 31']);
  assert.deepEqual(a.same, { from: '2 Apr 2018', to: '1 Apr 2019' });
  const b = E.lookup({ y: 2019, m: 4, d: 2 }, 2026);
  assert.deepEqual([b.grade, b.early, b.entryYear], ['Elementary 1', false, 2026]);
  const c = E.lookup({ y: 2019, m: 1, d: 15 }, 2026);   // FAQ: 2019 年 1〜4/1 生まれは 2026–27 に 2 年
  assert.equal(c.grade, 'Elementary 2');
  assert.equal(E.lookup({ y: 2025, m: 6, d: 1 }, 2026).before, true);
  assert.equal(E.lookup({ y: 1990, m: 6, d: 1 }, 2026).after, true);
});

test('年度の名前（改元の年は 2 つの元号）', () => {
  assert.equal(E.fyLabel(2026), '2026–27 (Reiwa 8)');
  assert.equal(E.fyLabel(2019), '2019–20 (Heisei 31 / Reiwa 1)');
  assert.equal(E.fyLabel(1999), '1999–00 (Heisei 11)');
});

// --- ページ（ACCEPTANCE 3 章「K79・K83 の英語版」・A2） ---
const pages = { 'en/school-grades/index.html': 'gakunen/', 'en/school-grades/guide.html': 'gakunen/guide.html' };
const visible = (html) => html
  .replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<a [^>]*hreflang="ja"[^>]*>[^<]*<\/a>/g, '')   // 言語の切り替え（日本語）は除く
  .replace(/<[^>]+>/g, ' ');

test('英語のページに日本語の文字が無い（言語の切り替えのリンクだけ）。画面の JS の文字列も', () => {
  for (const p of Object.keys(pages)) {
    const t = visible(read(p));
    const m = t.match(JA);
    assert.equal(m, null, p + ': ' + (m && t.slice(Math.max(0, m.index - 30), m.index + 30)));
    // JSON-LD と meta（検索結果に出る文）
    const head = (read(p).match(/<head>[\s\S]*<\/head>/) || [''])[0].replace(/<!--[\s\S]*?-->/g, '');
    assert.equal(head.match(JA), null, p + ' head');
  }
  const js = read('en/school-grades/school-grades.js').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  const strings = js.match(/'(?:[^'\\]|\\.)*'/g) || [];
  for (const s of strings) assert.equal(JA.test(s), false, s);
});

test('「japan school grades by age」が title と h1 にある', () => {
  const h = read('en/school-grades/index.html');
  assert.match(h.match(/<title>([^<]*)<\/title>/)[1], /japan school grades by age/i);
  assert.match(h.match(/<h1>([^<]*)<\/h1>/)[1], /japan school grades by age/i);
});

test('hreflang: 日英が互いを指し、sitemap にも同じ組', () => {
  const sm = read('sitemap.xml');
  const B = 'https://yorozu-craft.com/gengo/';
  for (const [en, ja] of Object.entries(pages)) {
    const enUrl = B + en.replace(/index\.html$/, ''), jaUrl = B + ja;
    for (const file of [en, ja + (ja.endsWith('/') ? 'index.html' : '')]) {
      const h = read(file);
      assert.ok(h.includes(`hreflang="ja" href="${jaUrl}"`), file + ' ja');
      assert.ok(h.includes(`hreflang="en" href="${enUrl}"`), file + ' en');
      assert.ok(h.includes(`hreflang="x-default" href="${jaUrl}"`), file + ' x-default');
    }
    assert.match(read(en), new RegExp(`<link rel="canonical" href="${enUrl}">`));
    assert.match(read(en), /<html lang="en">/);
    for (const loc of [enUrl, jaUrl]) {
      const block = sm.split('<url>').find((b) => b.includes(`<loc>${loc}</loc>`));
      assert.ok(block, 'sitemap ' + loc);
      assert.ok(block.includes(`hreflang="en" href="${enUrl}"`) && block.includes(`hreflang="ja" href="${jaUrl}"`), 'sitemap pair ' + loc);
    }
  }
});

test('英語のトップ（https://yorozu-craft.com/en/）へのリンクと、免責・出典と確認日・データの扱い（A2）', () => {
  for (const p of Object.keys(pages)) assert.ok(read(p).includes('href="https://yorozu-craft.com/en/"'), p);
  const g = read('en/school-grades/guide.html');
  assert.match(g, /This chart is a guide\./);
  assert.match(g, /last checked 2026-09-25/);
  assert.match(g, new RegExp('checked ' + K.schoolLawEn.checked));
  assert.match(g, /not stored or sent anywhere/);
  for (const u of Object.values(K.schoolLawEn.value)) assert.ok(g.includes(u), u);
  for (const k of ['schoolEntry', 'schoolYear', 'schoolLength', 'gradSchoolLength']) assert.ok(g.includes(K[k].url), k);
});

test('使い方の年数の表が constants.js の修業年限と同じ', () => {
  const g = read('en/school-grades/guide.html');
  const L = K.schoolLength.value, G = K.gradSchoolLength.value;
  const row = (name) => g.match(new RegExp('<tr><td><i>' + name + '[\\s\\S]*?</tr>'))[0];
  assert.match(row('shōgakkō'), new RegExp('>' + L.elementary + ' years<'));
  assert.match(row('chūgakkō'), new RegExp('>' + L.junior + ' years<'));
  assert.match(row('kōtō gakkō'), new RegExp('>' + L.high + ' years full-time'));
  assert.match(row('kōtō senmon'), new RegExp('>' + L.kosen + ' years<'));
  assert.match(row('daigaku<'), new RegExp('>' + L.univ4 + ' years; ' + L.univ6 + ' for'));
  assert.match(row('daigakuin'), new RegExp("Master's " + G.master + ' years; doctoral ' + (G.master + G.doctorLater) + ' years, which may be split ' + G.master + ' \\+ ' + G.doctorLater));
});
