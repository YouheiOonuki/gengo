// 学年早見表・履歴書の学歴（gakunen/）のテスト: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../calc.js');
const K = require('../constants.js');

const D = (s) => C.parseYmd(s);
const S = (o) => C.ymdStr(o);

test('年度: 4 月 1 日から新しい年度', () => {
  assert.equal(C.fiscalYearOf(D('2026-03-31')), 2025);
  assert.equal(C.fiscalYearOf(D('2026-04-01')), 2026);
  assert.equal(C.fiscalYearOf(D('2026-09-25')), 2026);
});

test('学年早見表 2026 年度（手で確かめた行）', () => {
  const t = C.gradeTable(2026);
  const row = (k) => t.find(r => r.key === k);
  assert.equal(t.length, 24);
  assert.deepEqual([S(row('k3').from), S(row('k3').to), row('k3').age], ['2022-04-02', '2023-04-01', 3]);   // 年少
  assert.deepEqual([S(row('k5').from), S(row('k5').to), row('k5').age], ['2020-04-02', '2021-04-01', 5]);   // 年長
  assert.deepEqual([S(row('e1').from), S(row('e1').to), row('e1').age], ['2019-04-02', '2020-04-01', 6]);   // 小 1
  assert.deepEqual([S(row('j1').from), S(row('j1').to), row('j1').age], ['2013-04-02', '2014-04-01', 12]);
  assert.deepEqual([S(row('h3').from), S(row('h3').to), row('h3').age], ['2008-04-02', '2009-04-01', 17]);
  assert.deepEqual([S(row('u4').from), S(row('u4').to), row('u4').age], ['2004-04-02', '2005-04-01', 21]);
  assert.deepEqual([S(row('m1').from), S(row('m1').to), row('m1').age], ['2003-04-02', '2004-04-01', 22]);
  assert.deepEqual([S(row('d3').from), S(row('d3').to), row('d3').age], ['1999-04-02', '2000-04-01', 26]);
  // 行が途切れず重ならない（上の行の終わりの翌日が次の行の初め…の逆順）
  for (let i = 1; i < t.length; i++) assert.equal(S(C.addDays(t[i].to, 1)), S(t[i - 1].from));
});

test('学年早見表と学年の判定（gradeAt・gradeNumber）が一致する', () => {
  for (const fy of [1990, 2019, 2026, 2036]) {
    for (const r of C.gradeTable(fy)) {
      assert.equal(C.gradeNumber(r.from, fy), r.n, `${fy} ${r.key} from`);
      assert.equal(C.gradeNumber(r.to, fy), r.n, `${fy} ${r.key} to`);
      assert.equal(C.gradeNumber(C.addDays(r.to, 1), fy), r.n - 1, `${fy} ${r.key} 4/2`);
      // 年度の初め（4 月 1 日）の満年齢はどちらの端も age
      const apr1 = { y: fy, m: 4, d: 1 };
      if (r.from.y > 1900) {
        assert.equal(C.ageAt(r.from, apr1).years, r.age);
        assert.equal(C.ageAt(r.to, apr1).years, r.age);
      }
      if (r.n >= 1 && r.n <= 16) {
        const g = C.gradeAt(r.from, { y: fy, m: 10, d: 1 });
        assert.notEqual(g.stage, 'preschool');
      }
    }
  }
  assert.equal(C.gradeNumber(D('2019-04-01'), 2026), 2);   // 早生まれは上の学年
  assert.equal(C.gradeNumber(D('2019-04-02'), 2026), 1);
});

const pick = (h, k, e) => { const x = h.find(r => r.key === k && r.event === e); return x ? x.date.y + '-' + x.date.m : null; };

test('履歴書の学歴: 大学 4 年（既存の schoolHistory と同じ）', () => {
  const b = D('1990-06-15');
  const h = C.resumeHistory(b);
  const old = C.schoolHistory(b);
  for (const k of ['elementary', 'junior', 'high']) {
    for (const e of ['in', 'out']) assert.equal(pick(h, k, e), pick(old, k, e));
  }
  assert.equal(pick(h, 'univ4', 'in'), pick(old, 'university', 'in'));
  assert.equal(pick(h, 'univ4', 'out'), pick(old, 'university', 'out'));
  assert.equal(h.length, 8);
});

test('履歴書の学歴: 1990-04-01 生まれ（早生まれ）・1 浪・修士（学歴早見表.jp の出力と同じ年）', () => {
  const h = C.resumeHistory(D('1990-04-01'), { final: 'master', ronin: 1 });
  assert.deepEqual(h.map(r => r.key + ':' + r.event + ':' + r.date.y + '-' + r.date.m), [
    'elementary:in:1996-4', 'elementary:out:2002-3', 'junior:in:2002-4', 'junior:out:2005-3',
    'high:in:2005-4', 'high:out:2008-3', 'univ4:in:2009-4', 'univ4:out:2013-3', 'master:in:2013-4', 'master:out:2015-3'
  ]);
});

test('履歴書の学歴: 高専・6 年制・博士・短大・専門・高校', () => {
  let h = C.resumeHistory(D('2000-05-01'), { final: 'kosen' });
  assert.equal(pick(h, 'junior', 'out'), '2016-3');
  assert.equal(pick(h, 'kosen', 'in'), '2016-4');
  assert.equal(pick(h, 'kosen', 'out'), '2021-3');
  assert.equal(pick(h, 'high', 'in'), null);

  h = C.resumeHistory(D('1995-10-10'), { final: 'doctor6' });
  assert.equal(pick(h, 'univ6', 'in'), '2014-4');
  assert.equal(pick(h, 'univ6', 'out'), '2020-3');
  assert.equal(pick(h, 'doctor6', 'out'), '2024-3');

  h = C.resumeHistory(D('2000-04-02'), { final: 'doctor' });
  assert.equal(pick(h, 'univ4', 'out'), '2023-3');
  assert.equal(pick(h, 'master', 'out'), '2025-3');
  assert.equal(pick(h, 'doctorLater', 'in'), '2025-4');
  assert.equal(pick(h, 'doctorLater', 'out'), '2028-3');

  h = C.resumeHistory(D('2005-01-20'), { final: 'tandai' });
  assert.equal(pick(h, 'elementary', 'in'), '2011-4');
  assert.equal(pick(h, 'tandai', 'out'), '2025-3');
  h = C.resumeHistory(D('2005-01-20'), { final: 'senmon', years: { senmon: 3 } });
  assert.equal(pick(h, 'senmon', 'out'), '2026-3');
  h = C.resumeHistory(D('2005-01-20'), { final: 'high' });
  assert.equal(h.length, 6);
  assert.equal(pick(h, 'high', 'out'), '2023-3');
});

test('履歴書の学歴: 留年・休学（在学年数）と浪人、おかしな値は既定に', () => {
  let h = C.resumeHistory(D('1990-06-15'), { years: { high: 4, univ4: 5 }, ronin: 2 });
  assert.equal(pick(h, 'high', 'out'), '2010-3');
  assert.equal(pick(h, 'univ4', 'in'), '2012-4');
  assert.equal(pick(h, 'univ4', 'out'), '2017-3');
  h = C.resumeHistory(D('1990-06-15'), { years: { univ4: 0, high: 'x' }, ronin: -3 });
  assert.equal(pick(h, 'high', 'out'), '2009-3');
  assert.equal(pick(h, 'univ4', 'out'), '2013-3');
  // 浪人は高専のあとには入らない（高専は中学の次）
  h = C.resumeHistory(D('2000-05-01'), { final: 'kosen', ronin: 1 });
  assert.equal(pick(h, 'kosen', 'in'), '2016-4');
  assert.equal(C.resumeHistory(D('2000-05-01'), { final: 'nope' }), null);
  assert.equal(C.resumeHistory({ y: 2000, m: 2, d: 30 }), null);
});

test('履歴書の学歴: 改元の年の和暦（平成元年・平成31年・令和元年）', () => {
  const W = (o) => { const w = C.eraOf(o); return C.formatEraYear(w.era, w.year) + o.m + '月'; };
  let h = C.resumeHistory(D('1982-04-02'));                    // 1989 年 4 月に小学校入学
  assert.equal(W(h[0].date), '平成元年4月');
  h = C.resumeHistory(D('2006-06-01'));                        // 2019 年 4 月に中学入学、2019 年 3 月に小学校卒業
  assert.equal(W(h.find(r => r.key === 'junior' && r.event === 'in').date), '平成31年4月');
  assert.equal(W(h.find(r => r.key === 'elementary' && r.event === 'out').date), '平成31年3月');
  h = C.resumeHistory(D('2001-06-01'), { final: 'high' });     // 2020 年 3 月に高校卒業
  assert.equal(W(h[h.length - 1].date), '令和2年3月');
  h = C.resumeHistory(D('1970-06-01'));                        // 1989 年 3 月に高校卒業（1 月 8 日から平成）
  assert.equal(W(h.find(r => r.key === 'high' && r.event === 'out').date), '平成元年3月');
});

test('constants: 修業年限の値と出典', () => {
  assert.deepEqual(K.schoolLength.value, { elementary: 6, junior: 3, high: 3, univ4: 4, univ6: 6, tandai: 2, kosen: 5 });
  assert.deepEqual(K.gradSchoolLength.value, { master: 2, doctorLater: 3, doctor6: 4 });
  assert.match(K.gradSchoolLength.url, /349M50000080028/);
});
