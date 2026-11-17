// 学年早見表の上の「何歳は何年生」（calc.js の gradeByAge、yorozu-plans QUEUE Q-312）のテスト: node --test tests/*.test.js
// 表の行が、gakunen-calc.js（正本は root の tools/common/calc/gakunen.js）に生まれた日を入れた結果と同じかを、
// その年齢の人の生まれた日を 1 日ずつ全部入れて確かめる。きょうは年度の境（3/31・4/1・4/2）と年の境を含む
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../calc.js');
const G = require('../gakunen-calc.js');

const D = (s) => C.parseYmd(s);
const S = (o) => C.ymdStr(o);
// gradeAt の { stage, grade } を通し番号（小 1 が 1、年長 0）に
const OFFSET = { preschool: 0, elementary: 0, junior: 6, high: 9, university: 12 };
const numOf = (g) => g.grade + OFFSET[g.stage];

const TODAYS = ['2026-11-17', '2026-03-31', '2026-04-01', '2026-04-02', '2027-01-01', '2026-12-31', '2028-02-29'];

for (const t of TODAYS) {
  test(`きょう ${t}: 6〜18 歳の行が gakunen-calc.js の gradeAt と同じ`, () => {
    const today = D(t);
    const { fy, rows } = C.gradeByAge(today);
    assert.equal(fy, G.fiscalYearOf(today));
    assert.deepEqual(rows.map(r => r.age), [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    for (const r of rows) {
      // その年齢の人の生まれた日: (きょう − (age+1) 年 + 1 日) 〜 (きょう − age 年) を 1 日ずつ
      let b = C.addDays({ y: today.y - r.age - 1, m: today.m, d: today.m === 2 && today.d === 29 ? 28 : today.d }, 1);
      const last = { y: today.y - r.age, m: today.m, d: today.d };
      const seen = { a: 0, b: 0 };
      for (; C.cmp(b, last) <= 0; b = C.addDays(b, 1)) {
        if (!C.validDate(b.y, b.m, b.d)) continue;
        const age = C.ageAt(b, today);
        if (!age || age.years !== r.age) continue;
        // 今年度（4/2〜翌 4/1）の誕生日がきょうまでに来たか
        const bdY = (b.m > 4 || (b.m === 4 && b.d >= 2)) ? fy : fy + 1;
        const passed = C.cmp({ y: bdY, m: b.m, d: b.d }, today) <= 0;
        const want = numOf(G.gradeAt(b, today));
        if (passed) { assert.ok(r.a, `${t} ${r.age} 歳 ${S(b)}: a が無いのに、誕生日が来た人がいる`); assert.equal(r.a.n, want, `${t} ${r.age} 歳 ${S(b)}（a）`); seen.a++; }
        else { assert.equal(r.b.n, want, `${t} ${r.age} 歳 ${S(b)}（b）`); seen.b++; }
      }
      if (r.a) assert.ok(seen.a > 0, `${t} ${r.age} 歳: a の人がいない`);
      assert.ok(seen.b > 0, `${t} ${r.age} 歳: b の人がいない`);
      // 学年の名のキーは早見表の行のキー
      for (const g of [r.a, r.b]) if (g) assert.equal(g.key, G.gradeTable(fy).find(x => x.n === g.n).key);
    }
  });
}

test('10・13・15 歳（2026-11-17、手で確かめた行）', () => {
  const rows = C.gradeByAge(D('2026-11-17')).rows;
  const at = (age) => rows.find(r => r.age === age);
  assert.deepEqual([at(10).a.key, at(10).b.key], ['e4', 'e5']);   // 10 歳: 誕生日の後は小 4、まだなら小 5
  assert.deepEqual([at(13).a.key, at(13).b.key], ['j1', 'j2']);
  assert.deepEqual([at(15).a.key, at(15).b.key], ['j3', 'h1']);
  assert.deepEqual([at(6).a.key, at(6).b.key], ['k5', 'e1']);
  assert.deepEqual([at(18).a.key, at(18).b.key], ['h3', 'u1']);
  // 境の生まれ: 2016-04-01 生まれ（10 歳、誕生日はまだ）は小 5、2016-04-02 生まれ（10 歳、誕生日の後）は小 4
  assert.equal(G.gradeNumber(D('2016-04-01'), 2026), at(10).b.n);
  assert.equal(G.gradeNumber(D('2016-04-02'), 2026), at(10).a.n);
});

test('4 月 1 日（年度の初日）は「4 月 2 日〜きょう」の人がいない（a は null）', () => {
  for (const r of C.gradeByAge(D('2026-04-01')).rows) assert.equal(r.a, null);
  for (const r of C.gradeByAge(D('2026-04-02')).rows) assert.ok(r.a);
});

test('年度はきょうの日付で決まり、年齢から引く学年は年度によらない', () => {
  // 10 歳で誕生日の後は、どの年度も小 4
  for (const t of ['2025-11-17', '2026-11-17', '2030-05-05']) {
    const r = C.gradeByAge(D(t)).rows.find(x => x.age === 10);
    assert.deepEqual([r.a.key, r.b.key], ['e4', 'e5']);
  }
  assert.equal(C.gradeByAge(D('2026-03-31')).fy, 2025);
  assert.equal(C.gradeByAge(D('2026-04-01')).fy, 2026);
});
