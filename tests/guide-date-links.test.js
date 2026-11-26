// ページに書いた「最終確認日」が、値ファイルの checked と同じか（Q-255、yorozu-plans の QUEUE 2026-11-16 朝。otasuke の tests/guide-date.test.js と同じ型）。
// 2026-11-18 に guide 4 枚から、日付を書いた全ページに広げた（Q-347）。
// gengo の値は constants.js・gakunen-calc.js・yakudoshi-calc.js に値ごとの checked で持つ。比べる相手はページごとに EXPECT に書く:
// - guide と en/guide: ページに並ぶ外のリンク（yorozu-craft.com 以外）を url か sources の url に持つ値の checked の最古
// - リンクを持たないページ（index.html など）: ページが根拠に挙げる値の checked の最古
// 値ファイルに無いリンク（guide.html の恵方の出どころ・国会図書館のレファレンス）は、ページの中に別の確認日を書いているので比べない。
// 比べないページは NOT_TIED に理由を書く。日付を書いたページが増えたら、どちらにも無いと落ちる。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const CONSTANTS = require('../constants.js');
const G = require('../gakunen-calc.js');
const Y = require('../yakudoshi-calc.js');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// url → checked の並び（値の木を全部たどる。sources の行は親の checked を使う）
const checkedByUrl = new Map();
const add = (u, c) => { if (!checkedByUrl.has(u)) checkedByUrl.set(u, []); checkedByUrl.get(u).push(c); };
(function walk(o) {
  if (!o || typeof o !== 'object') return;
  if (Array.isArray(o)) { o.forEach(walk); return; }
  if (typeof o.url === 'string' && typeof o.checked === 'string') {
    add(o.url, o.checked);
    for (const s of o.sources || []) if (s && typeof s.url === 'string') add(s.url, o.checked);
  }
  for (const v of Object.values(o)) walk(v);
})(CONSTANTS);

const oldest = (cs) => { assert.ok(cs.length > 0, '比べる checked が 1 つも無い'); return [...cs].sort()[0]; };
const outLinks = (h) => [...new Set([...h.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')))]
  .filter((u) => !/^https:\/\/yorozu-craft\.com\//.test(u));
const byLinks = (p) => () => oldest(outLinks(read(p)).flatMap((u) => checkedByUrl.get(u) || []));
const checkedOf = (...vs) => () => oldest(vs.map((v) => v.checked));

const EXPECT = {
  'guide.html': byLinks('guide.html'),
  'en/guide.html': byLinks('en/guide.html'),
  'gakunen/guide.html': byLinks('gakunen/guide.html'),
  'kaiki/guide.html': byLinks('kaiki/guide.html'),
  'yakudoshi/guide.html': byLinks('yakudoshi/guide.html'),
  // 「根拠は元号を改める政令と国立公文書館の改元の記録など」
  'index.html': checkedOf(...CONSTANTS.ERAS),
  // 学校教育法・同施行規則・大学院設置基準（gakunen-calc.js）と年齢計算ニ関スル法律
  'gakunen/index.html': checkedOf(...Object.values(G.VALUES), CONSTANTS.ageLaw),
  'gakunen/rireki.html': checkedOf(...Object.values(G.VALUES), CONSTANTS.ageLaw),
  // 厄年・年祝いの寺社のページ（yakudoshi-calc.js）
  'yakudoshi/index.html': checkedOf(...Object.values(Y.VALUES)),
};
// 比べないページと理由（日付は動かさない）
const NOT_TIED = {
  'nenpyo/guide.html': '年祝いの出どころの神社本庁「長寿を祝う神事」が 2026-11-16・2026-11-20 に 503（メンテナンス中）で開けなかった（Q-225・Q-380）。学校教育法・同施行規則は 2026-11-20 に開き直した。神社本庁の値の checked は 2026-09-25 のままで、ページの 2026-10-03 は最古と合わない',
  'nenpyo/index.html': 'nenpyo/ に値ファイルが無い。出どころは nenpyo/guide.html と同じ（学校教育法・同施行規則は 2026-11-20、民法 4 条・国民年金法・高年齢者雇用安定法は 2026-10-03、神社本庁の年祝いは 2026-09-25 で 2026-11-20 も 503）で、ページの 2026-10-03 は最古と合わない（Q-380）',
};

const pad = (n) => String(n).padStart(2, '0');
// 「最終確認日」「Last checked」の直後（60 字以内）の日付を全部、ISO にして返す。<time> は datetime と表示も返す
function datesIn(h) {
  const out = [];
  for (const m of h.matchAll(/(?:最終確認日|Last checked)([\s\S]{0,60})/g)) {
    const s = m[1];
    const t = s.match(/^[^<。.]*<time datetime="([^"]*)">([^<]*)<\/time>/);
    if (t) { if (t[1]) out.push({ iso: t[1], shown: t[2] }); continue; }
    const a = s.match(/^[^。<]{0,8}?(\d{4})-(\d{2})-(\d{2})/);
    if (a) { out.push({ iso: `${a[1]}-${a[2]}-${a[3]}` }); continue; }
    const b = s.match(/^[^。<]{0,8}?(\d{4}) ?年 ?(\d{1,2}) ?月 ?(\d{1,2}) ?日/);
    if (b) out.push({ iso: `${b[1]}-${pad(b[2])}-${pad(b[3])}` });
  }
  return out;
}
// 「根拠と確認日」「出典と確認日」の節があれば、見出しの後の 1 つ目（guide.html は恵方の段落にも別の最終確認日を持つ）。無ければページの 1 つ目
const pageDate = (h) => (h.match(/確認日<\/h2>[\s\S]*?最終確認日 (\d{4}-\d{2}-\d{2})/) || [])[1] || (datesIn(h)[0] || {}).iso;
const shownOk = (iso, shown) => {
  const [y, m, d] = iso.split('-').map(Number);
  const en = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  return [iso, `${y}年${m}月${d}日`, en].includes(shown);
};

const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    if (['node_modules', '.git', 'tests', 'tools', '.github'].includes(e.name)) continue;
    const p = d ? `${d}/${e.name}` : e.name;
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html') && datesIn(read(p)).length) pages.push(p);
  }
})('');

test('日付を書いたページは全部 EXPECT か NOT_TIED にある（増えたらここに足す）', () => {
  assert.deepEqual(pages.sort(), [...Object.keys(EXPECT), ...Object.keys(NOT_TIED)].sort());
});

for (const [p, want] of Object.entries(EXPECT)) {
  test(`${p} の最終確認日が値ファイルの checked（古いほう）と同じ`, () => {
    const h = read(p);
    const got = pageDate(h);
    assert.ok(got, `${p} に日付が無い`);
    const w = want();
    assert.match(w, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(got, w);
    for (const x of datesIn(h)) if (x.shown !== undefined) assert.ok(shownOk(x.iso, x.shown), `${p}: datetime ${x.iso} と表示「${x.shown}」が違う`);
  });
}
