// 公開データ（data/gengo.json・data/gakunen.json。CC0）のテスト: node --test tests/*.test.js
// constants.js と calc.js（画面と同じ関数）から機械で書き出すもの。ファイルが書き出しの結果と同じか、
// license・checked・generated・source（ACCEPTANCE 7.10.3 e の規則）があるか、表が計算と食い違っていないかを確かめる
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const K = require('../constants.js');
const C = require('../calc.js');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const load = () => import(path.join(root, 'tools', 'build-data.mjs'));

test('data/gengo.json・data/gakunen.json が書き出した結果と同じ（node tools/build-data.mjs）', async () => {
  const B = await load();
  const out = B.outputs();
  assert.equal(read('data/gengo.json'), out['data/gengo.json']);
  assert.equal(read('data/gakunen.json'), out['data/gakunen.json']);
});

test('頭に license（CC0）・checked・generated・source', () => {
  for (const f of ['data/gengo.json', 'data/gakunen.json']) {
    const d = JSON.parse(read(f));
    assert.equal(d.license, 'CC0-1.0', f);
    assert.match(d.checked, /^\d{4}-\d{2}-\d{2}$/, f);
    assert.match(d.generated, /^\d{4}-\d{2}-\d{2}$/, f);
    assert.ok(d.generated >= d.checked, f);
    assert.ok(d.source.length > 0, f);
    for (const u of d.source) assert.match(u, /^https:\/\//, f);
  }
});

test('generated は中身が変わったときだけ変わる', async () => {
  const B = await load();
  const json = read('data/gengo.json');
  assert.equal(B.stamp(B.buildGengo, json), json);
  process.env.GENERATED = '2099-01-01';
  try {
    assert.match(B.stamp(B.buildGengo, json.replace('"title": "', '"title": "x')), /"generated": "2099-01-01"/);
  } finally { delete process.env.GENERATED; }
});

test('gengo.json: 元号の境目は constants.js と同じで、前の元号の終わりの翌日が次の始まり', () => {
  const d = JSON.parse(read('data/gengo.json'));
  assert.deepEqual(d.eras.map((e) => [e.kanji, e.start, e.end]), K.ERAS.map((e) => [e.kanji, e.start, e.end]));
  for (let i = 1; i < d.eras.length; i++) {
    assert.equal(C.ymdStr(C.addDays(C.parseYmd(d.eras[i - 1].end), 1)), d.eras[i].start, d.eras[i].kanji);
  }
  assert.equal(d.eras.at(-1).end, null);
  for (const e of d.eras) assert.match(e.source.url, /^https:\/\//);
});

test('gakunen.json: 2026 年度の小学 1 年は 2019-04-02〜2020-04-01 生まれ、4 月 1 日生まれは早生まれ', () => {
  const d = JSON.parse(read('data/gakunen.json'));
  const y = d.years.find((x) => x.fiscal_year === 2026);
  const e1 = y.grades.find((g) => g.key === 'e1');
  assert.deepEqual([e1.born_from, e1.born_to, e1.age_at_april_1], ['2019-04-02', '2020-04-01', 6]);
  for (const x of d.years) {
    for (const g of x.grades) {
      assert.equal(C.gradeNumber(C.parseYmd(g.born_from), x.fiscal_year), C.gradeNumber(C.parseYmd(g.born_to), x.fiscal_year), x.fiscal_year + ' ' + g.key);
    }
  }
});

test('data/LICENSE は CC0 1.0 の全文、README に CC0 とコードの MIT の区別', () => {
  assert.match(read('data/LICENSE'), /CC0 1\.0 Universal/);
  const readme = read('data/README.md');
  assert.match(readme, /CC0 1\.0/);
  assert.match(readme, /MIT License/);
  assert.match(readme, /node tools\/build-data\.mjs/);
});
