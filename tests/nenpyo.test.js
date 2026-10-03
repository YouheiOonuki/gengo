// 家族の年表（nenpyo/）のテスト: node --test tests/*.test.js
// 期待値は条文（constants.js の出典）から手で数えたもの
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../calc.js');
const K = require('../constants.js');
const N = require('../nenpyo/nenpyo-calc.js');

const D = (s) => C.parseYmd(s);
const ALL = { school: true, preschool: 3, adult: true, iwai: true, pension: true };
const yearsOf = (birth, text, opt) => {
  const out = [];
  for (let y = birth.y; y <= birth.y + 101; y++) if (N.eventsOf(birth, y, Object.assign({}, ALL, opt)).some((e) => e.startsWith(text))) out.push(y);
  return out;
};

test('値は constants.js（民法 4 条 18 歳・国民年金法 26 条 65 歳・高年齢者雇用安定法 8 条 60 歳）', () => {
  assert.equal(K.adultAge.value, 18);
  assert.equal(K.pensionAge.value, 65);
  assert.equal(K.retirementAge.value.min, 60);
  for (const k of ['adultAge', 'pensionAge', 'retirementAge']) {
    assert.match(K[k].url, /^https:\/\/laws\.e-gov\.go\.jp\/law\//);
    assert.match(K[k].checked, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('学校: 2018-05-10 生まれは 2025 年に小学校入学、早生まれ 2019-04-01 も 2025 年', () => {
  const a = D('2018-05-10');
  assert.deepEqual(yearsOf(a, '小学校入学'), [2025]);
  assert.deepEqual(yearsOf(a, '中学校入学'), [2031]);
  assert.deepEqual(yearsOf(a, '高校入学'), [2034]);
  assert.deepEqual(yearsOf(a, '大学入学'), [2037]);
  assert.deepEqual(yearsOf(a, '大学卒業'), [2041]);
  assert.deepEqual(yearsOf(a, '入園（3 年保育）'), [2022]);
  assert.deepEqual(yearsOf(a, '入園（2 年保育）', { preschool: 2 }), [2023]);
  assert.deepEqual(yearsOf(a, '入園', { preschool: 0 }), []);
  assert.deepEqual(yearsOf(D('2019-04-01'), '小学校入学'), [2025]);
  assert.deepEqual(yearsOf(D('2019-04-02'), '小学校入学'), [2026]);
  assert.deepEqual(yearsOf(a, '小学校入学', { school: false }), []);
});

test('成人: 18 歳に達する年（誕生日の前日）。1 月 1 日生まれは前の年', () => {
  assert.deepEqual(yearsOf(D('2008-05-10'), '成人'), [2026]);
  assert.deepEqual(yearsOf(D('2008-01-02'), '成人'), [2026]);
  assert.deepEqual(yearsOf(D('2008-01-01'), '成人'), [2025]);
  assert.deepEqual(C.ymdStr(N.reachDate(D('2008-01-01'), 18)), '2025-12-31');
  assert.deepEqual(C.ymdStr(N.reachDate(D('2008-02-29'), 18)), '2026-02-28');
  assert.deepEqual(yearsOf(D('2008-05-10'), '成人', { adult: false }), []);
});

test('年金 65 歳・定年（入れた年齢）', () => {
  const b = D('1966-07-20');
  assert.deepEqual(yearsOf(b, '年金'), [2031]);
  assert.deepEqual(yearsOf(b, '年金', { pension: false }), []);
  assert.deepEqual(yearsOf(b, '定年（60 歳）', { retire: 60 }), [2026]);
  assert.deepEqual(yearsOf(b, '定年（65 歳）', { retire: 65 }), [2031]);
  assert.deepEqual(yearsOf(D('1966-01-01'), '定年（60 歳）', { retire: 60 }), [2025]);
  assert.deepEqual(yearsOf(b, '定年'), []);
});

test('年祝い: 還暦は数え 61＝満 60 の年、古希などは数え年の年（yakudoshi の表と同じ）', () => {
  const b = D('1966-07-20');
  assert.deepEqual(yearsOf(b, '還暦'), [2026]);
  assert.deepEqual(yearsOf(b, '古希'), [2035]); // 数え 70 = 1966 + 69
  assert.deepEqual(yearsOf(b, '米寿'), [2053]);
  const y = N.eventsOf(b, 2035, ALL);
  assert.ok(y.includes('古希（数え 70）'), y.join(','));
  assert.ok(N.eventsOf(b, 2026, ALL).includes('還暦'));
  assert.deepEqual(yearsOf(b, '還暦', { iwai: false }), []);
});

test('学年の短い名前: 年少〜大 4（入園の年数で年少・年中を出すか決める）', () => {
  assert.equal(N.gradeShort(-2, 3), '年少');
  assert.equal(N.gradeShort(-1, 3), '年中');
  assert.equal(N.gradeShort(0, 3), '年長');
  assert.equal(N.gradeShort(-2, 2), '');
  assert.equal(N.gradeShort(-1, 2), '年中');
  assert.equal(N.gradeShort(0, 0), '');
  assert.equal(N.gradeShort(1, 3), '小1');
  assert.equal(N.gradeShort(7, 3), '中1');
  assert.equal(N.gradeShort(12, 3), '高3');
  assert.equal(N.gradeShort(16, 3), '大4');
  assert.equal(N.gradeShort(17, 3), '');
});

test('年表の行: 年齢・学年・家の予定', () => {
  const people = [
    { label: '父', birth: D('1990-06-01'), retire: 65 },
    { label: '長女', birth: D('2020-10-10'), retire: null },
    { label: '未入力', birth: null, retire: null }
  ];
  const rows = N.buildRows(people, { start: 2026, span: 10, preschool: 3, school: true, adult: true, iwai: true, pension: false, events: [{ year: 2030, text: '住宅ローン完済' }] });
  assert.equal(rows.length, 10);
  assert.equal(rows[0].year, 2026);
  assert.equal(rows[0].cells[0].age, 36);
  assert.equal(rows[0].cells[1].age, 6);
  assert.equal(rows[0].cells[1].grade, '年長'); // 2020-10 生まれ: 小学校入学 2027
  assert.equal(rows[1].cells[1].grade, '小1');
  assert.deepEqual(rows[1].cells[1].events, ['小学校入学']);
  assert.equal(rows[0].cells[2].age, null);
  assert.deepEqual(rows[4].family, ['住宅ローン完済']);
  assert.deepEqual(rows[0].family, []);
  const born = N.buildRows([{ label: 'x', birth: D('2027-03-01'), retire: null }], { start: 2026, span: 3, preschool: 3, school: true, adult: true, iwai: true, pension: false, events: [] });
  assert.equal(born[0].cells[0].age, null);
  assert.equal(born[1].cells[0].age, 0);
  assert.deepEqual(born[1].cells[0].events, ['誕生']);
});

test('正規化: 人数・年・予定の上限、壊れた値を直す', () => {
  const d = N.normalize(null, 2026);
  assert.equal(d.start, 2026);
  assert.equal(d.span, 30);
  assert.equal(d.people.length, 1);
  const s = N.normalize({ people: Array(12).fill({ name: 'あいうえおかきくけこさしすせ', birth: 7, retire: 120 }), start: 'x', span: 33, preschool: 9, school: 'yes', pension: true, events: [{ year: 99999, text: 'a'.repeat(50) }] }, 2026);
  assert.equal(s.people.length, N.MAX_PEOPLE);
  assert.equal(s.people[0].name.length, 12);
  assert.equal(s.people[0].birth, '');
  assert.equal(s.people[0].retire, 80);
  assert.equal(s.start, 2026);
  assert.equal(s.span, 30);
  assert.equal(s.preschool, 3);
  assert.equal(s.school, true);
  assert.equal(s.pension, true);
  assert.equal(s.events[0].year, 2200);
  assert.equal(s.events[0].text.length, 30);
  assert.equal(N.normalize({ people: [{ retire: '' }] }, 2026).people[0].retire, '');
});

test('ページの決まり: 保存キーは gengo_nenpyo、消すボタン、出典の URL が constants と同じ', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'nenpyo/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'nenpyo/nenpyo.js'), 'utf8');
  assert.ok(html.includes('data-reset-storage="gengo_nenpyo"'));
  assert.ok(html.includes('<link rel="canonical" href="https://yorozu-craft.com/gengo/nenpyo/">'));
  assert.match(js, /var KEY = 'gengo_nenpyo';/);
  const guide = fs.readFileSync(path.join(root, 'nenpyo/guide.html'), 'utf8');
  for (const k of ['adultAge', 'pensionAge', 'retirementAge', 'schoolEntry', 'kindergarten']) assert.ok(guide.includes(K[k].url), k);
  assert.ok(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').includes('https://yorozu-craft.com/gengo/nenpyo/'));
});
