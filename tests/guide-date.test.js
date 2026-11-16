// guide の「最終確認日」が、そのページが挙げる出どころの checked（古いほう）と同じか（Q-255、yorozu-plans の QUEUE 2026-11-16 朝。otasuke の tests/guide-date.test.js と同じ型）。
// gengo の値は constants.js・gakunen-calc.js・yakudoshi-calc.js に値ごとの checked で持つので、比べる相手は「ファイルの最古」ではなく、
// guide に並ぶ外のリンク（yorozu-craft.com 以外）を url か sources の url に持つ値の checked の最古。
// 値ファイルに無いリンク（guide.html の恵方の出どころ・国会図書館のレファレンス）は、ページの中に別の確認日を書いているので比べない。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const CONSTANTS = require('../constants.js');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const GUIDES = ['guide.html', 'gakunen/guide.html', 'kaiki/guide.html', 'yakudoshi/guide.html'];
// 比べない guide と理由（日付は動かさない）
const NOT_TIED = {
  'nenpyo/guide.html': '年祝いの出どころの神社本庁「長寿を祝う神事」が 2026-11-16 に 503 で開けなかった（Q-255 の (3)。Q-070・Q-225 と同じ頁）',
};

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

// 「根拠と確認日」「出典と確認日」の節の日付（guide.html は恵方の段落にも別の最終確認日を持つので、節の見出しの後の 1 つ目）
const guideDate = (h) => (h.match(/確認日<\/h2>[\s\S]*?最終確認日 (\d{4}-\d{2}-\d{2})/) || [])[1];
const outLinks = (h) => [...new Set([...h.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')))]
  .filter((u) => !/^https:\/\/yorozu-craft\.com\//.test(u));

test('最終確認日のある guide は全部、比べるか比べないかのどちらかに入っている', () => {
  const found = [];
  (function walk(d) {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      if (['node_modules', '.git', 'tests', 'tools'].includes(e.name)) continue;
      const p = d ? `${d}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p);
      else if (e.name === 'guide.html' && guideDate(read(p))) found.push(p);
    }
  })('');
  assert.deepEqual(found.sort(), [...GUIDES, ...Object.keys(NOT_TIED)].sort());
});

for (const g of GUIDES) {
  test(`${g} の最終確認日が、挙げた出どころの checked（古いほう）と同じ`, () => {
    const h = read(g);
    const cs = outLinks(h).flatMap((u) => checkedByUrl.get(u) || []);
    assert.ok(cs.length > 0, `${g} の外のリンクが値ファイルに 1 つも無い`);
    assert.equal(guideDate(h), cs.sort()[0]);
  });
}
