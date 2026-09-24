// 和暦・年齢・学年のテスト: node --test tests/*.test.js
// （.github/workflows/test.yml で push・PR のたびに自動実行される）
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../calc.js');
const K = require('../constants.js');

const D = (s) => C.parseYmd(s);
const W = (s) => { const w = C.eraOf(D(s)); return w ? C.formatEraYear(w.era, w.year) : null; };

test('改元の境目（前日と当日）', () => {
  assert.equal(W('1912-07-29'), '明治45年');
  assert.equal(W('1912-07-30'), '大正元年');
  assert.equal(W('1926-12-24'), '大正15年');
  assert.equal(W('1926-12-25'), '昭和元年');
  assert.equal(W('1989-01-07'), '昭和64年');
  assert.equal(W('1989-01-08'), '平成元年');
  assert.equal(W('2019-04-30'), '平成31年');
  assert.equal(W('2019-05-01'), '令和元年');
  assert.equal(W('2026-09-24'), '令和8年');
  assert.equal(W('1868-01-25'), '明治元年');
  assert.equal(W('1868-01-24'), null);                 // 慶応以前は対象外
});

test('元号の並びが途切れず重ならない（constants.js の ERAS）', () => {
  for (let i = 1; i < C.ERAS.length; i++) {
    assert.deepEqual(C.addDays(C.ERAS[i - 1].endD, 1), C.ERAS[i].startD, C.ERAS[i].kanji);
  }
  assert.equal(C.ERAS[C.ERAS.length - 1].end, null);
  for (const e of K.ERAS) assert.ok(e.source && e.url && e.checked, e.kanji);
  assert.equal(C.lastYearOf(C.eraByKey('showa')), 64);
  assert.equal(C.lastYearOf(C.eraByKey('heisei')), 31);
  assert.equal(C.lastYearOf(C.eraByKey('taisho')), 15);
  assert.equal(C.lastYearOf(C.eraByKey('meiji')), 45);
});

test('西暦の年に含まれる和暦（改元の年は 2 つ）', () => {
  const f = (y) => C.erasOfYear(y).map(x => C.formatEraYear(x.era, x.year) + ' ' + C.ymdStr(x.from) + '〜' + C.ymdStr(x.to));
  assert.deepEqual(f(1989), ['昭和64年 1989-01-01〜1989-01-07', '平成元年 1989-01-08〜1989-12-31']);
  assert.deepEqual(f(2019), ['平成31年 2019-01-01〜2019-04-30', '令和元年 2019-05-01〜2019-12-31']);
  assert.deepEqual(f(1926), ['大正15年 1926-01-01〜1926-12-24', '昭和元年 1926-12-25〜1926-12-31']);
  assert.deepEqual(f(1912), ['明治45年 1912-01-01〜1912-07-29', '大正元年 1912-07-30〜1912-12-31']);
  assert.deepEqual(f(1985), ['昭和60年 1985-01-01〜1985-12-31']);
  assert.equal(C.erasOfYear(1870)[0].lunar, true);
  assert.equal(C.erasOfYear(1873)[0].lunar, false);
});

test('和暦 → 西暦', () => {
  assert.equal(C.toSeireki('showa', 60).y, 1985);
  assert.equal(C.toSeireki('heisei', 1).y, 1989);
  assert.equal(C.toSeireki('reiwa', 1).y, 2019);
  assert.equal(C.toSeireki('reiwa', 8).y, 2026);
  assert.equal(C.toSeireki('taisho', 1).y, 1912);
  assert.equal(C.toSeireki('meiji', 1).y, 1868);
  // 昭和64年は 1 月 7 日まで
  assert.deepEqual(C.toSeireki('showa', 64).partial, { from: D('1989-01-01'), to: D('1989-01-07') });
  assert.equal(C.toSeireki('showa', 60).partial, null);
  // 存在しない年・期間の外
  assert.equal(C.toSeireki('showa', 65).error, 'year');
  assert.equal(C.toSeireki('heisei', 32).error, 'year');
  assert.equal(C.toSeireki('showa', 0).error, 'year');
  const r = C.toSeireki('showa', 64, 1, 8);
  assert.equal(r.error, 'outOfEra');
  assert.equal(C.formatEraYear(r.correct.era, r.correct.year), '平成元年');
  assert.equal(C.toSeireki('heisei', 31, 5, 1).error, 'outOfEra');
  assert.equal(C.toSeireki('heisei', 31, 4, 30).ok, true);
  assert.equal(C.toSeireki('reiwa', 1, 4, 30).error, 'outOfEra');
  assert.equal(C.toSeireki('taisho', 15, 12, 25).error, 'outOfEra');
  assert.equal(C.toSeireki('taisho', 1, 7, 29).error, 'outOfEra');
  assert.equal(C.toSeireki('heisei', 3, 2, 30).error, 'date');
  // 明治 5 年までは旧暦なので月日は変換しない
  const m = C.toSeireki('meiji', 5, 12, 2);
  assert.equal(m.ok, true); assert.equal(m.lunar, true); assert.equal(m.dateIgnored, true);
  assert.equal(C.toSeireki('meiji', 6, 1, 1).date.y, 1873);
});

test('文字の読み取り（和暦・略記・漢数字・全角・英字・西暦）', () => {
  assert.deepEqual(C.parseInput('昭和60年3月5日'), { kind: 'wareki', era: 'showa', year: 60, m: 3, d: 5 });
  assert.deepEqual(C.parseInput('S60.3.5'), { kind: 'wareki', era: 'showa', year: 60, m: 3, d: 5 });
  assert.deepEqual(C.parseInput('H31/4/30'), { kind: 'wareki', era: 'heisei', year: 31, m: 4, d: 30 });
  assert.deepEqual(C.parseInput('令和元年五月一日'), { kind: 'wareki', era: 'reiwa', year: 1, m: 5, d: 1 });
  assert.deepEqual(C.parseInput('平成３１年４月３０日'), { kind: 'wareki', era: 'heisei', year: 31, m: 4, d: 30 });
  assert.deepEqual(C.parseInput('昭和六十四年一月七日'), { kind: 'wareki', era: 'showa', year: 64, m: 1, d: 7 });
  assert.deepEqual(C.parseInput('Showa 60'), { kind: 'wareki', era: 'showa', year: 60 });
  assert.deepEqual(C.parseInput('Taishō 1'), { kind: 'wareki', era: 'taisho', year: 1 });
  assert.deepEqual(C.parseInput('R8'), { kind: 'wareki', era: 'reiwa', year: 8 });
  assert.deepEqual(C.parseInput('1985'), { kind: 'seireki', y: 1985 });
  assert.deepEqual(C.parseInput('1985年3月5日'), { kind: 'seireki', y: 1985, m: 3, d: 5 });
  assert.deepEqual(C.parseInput('1985-03-05'), { kind: 'seireki', y: 1985, m: 3, d: 5 });
  assert.equal(C.parseInput('hello'), null);
  assert.equal(C.parseJaNumber('二十三'), 23);
  assert.equal(C.parseJaNumber('十'), 10);
  assert.equal(C.parseJaNumber('六十'), 60);
  assert.equal(C.parseJaNumber('元'), 1);
  assert.ok(Number.isNaN(C.parseJaNumber('十十')));
  assert.deepEqual(C.inputToDate('H1.1.8'), { ok: true, date: D('1989-01-08') });
  assert.equal(C.inputToDate('昭和60年').error, 'needDate');
  assert.equal(C.inputToDate('明治3年1月1日').error, 'lunar');
});

test('和暦の表記', () => {
  assert.equal(C.formatWareki(D('2019-05-01')), '令和元年5月1日');
  assert.equal(C.formatWareki(D('2019-05-01'), 'en'), 'Reiwa 1, May 1');
  assert.equal(C.formatAbbr(D('2026-09-24')), 'R8.9.24');
  assert.equal(C.formatEraYear(C.eraByKey('showa'), 60, 'en'), 'Shōwa 60');
});

test('満年齢: 誕生日の当日から 1 つ増える', () => {
  const b = D('1990-06-15');
  assert.equal(C.ageAt(b, D('2026-06-14')).years, 35);
  assert.equal(C.ageAt(b, D('2026-06-15')).years, 36);
  assert.equal(C.ageAt(b, D('1990-06-15')).years, 0);
  assert.equal(C.ageAt(b, D('1990-06-14')), null);
  // 法律上、年をとるのは誕生日の前日の終わり（年齢計算ニ関スル法律・民法 143 条）
  assert.deepEqual(C.ageAt(b, D('2026-01-01')).reach, D('2026-06-14'));
  assert.equal(C.ageAt(b, D('2026-01-01')).kazoe, 37);
});

test('満年齢: 2 月 29 日生まれ', () => {
  const b = D('2000-02-29');
  // 平年は 2 月 28 日の終わりに年をとる（民法 143 条 2 項ただし書き: 応当日が無いときは月末に満了）
  assert.equal(C.ageAt(b, D('2021-02-28')).years, 20);
  assert.equal(C.ageAt(b, D('2021-03-01')).years, 21);
  assert.deepEqual(C.ageAt(b, D('2021-01-10')).reach, D('2021-02-28'));
  // うるう年は 2 月 29 日から
  assert.equal(C.ageAt(b, D('2024-02-28')).years, 23);
  assert.equal(C.ageAt(b, D('2024-02-29')).years, 24);
  assert.deepEqual(C.ageAt(b, D('2024-01-10')).reach, D('2024-02-28'));
  assert.deepEqual(C.anniversary(b, 2023), D('2023-03-01'));
});

test('学年: 4 月 2 日〜翌年 4 月 1 日生まれが同じ学年', () => {
  assert.equal(C.schoolEntryYear(D('2019-04-01')), 2025);   // 早生まれ（4 月 1 日まで）
  assert.equal(C.schoolEntryYear(D('2019-04-02')), 2026);
  assert.equal(C.schoolEntryYear(D('2020-01-15')), 2026);
  assert.equal(C.isHayaumare(D('2020-04-01')), true);
  assert.equal(C.isHayaumare(D('2020-04-02')), false);
  // 2026-09-24 時点
  const ref = D('2026-09-24');
  assert.deepEqual(C.gradeAt(D('2019-04-02'), ref), { stage: 'elementary', grade: 1 });
  assert.deepEqual(C.gradeAt(D('2019-04-01'), ref), { stage: 'elementary', grade: 2 });
  assert.deepEqual(C.gradeAt(D('2020-04-02'), ref), { stage: 'preschool', grade: 0 });   // 年長
  assert.deepEqual(C.gradeAt(D('2012-05-01'), ref), { stage: 'junior', grade: 2 });
  assert.deepEqual(C.gradeAt(D('2008-12-01'), ref), { stage: 'high', grade: 3 });
  assert.deepEqual(C.gradeAt(D('2006-06-01'), ref), { stage: 'university', grade: 2 });
  // 年度の境目: 3 月 31 日はまだ前の学年、4 月 1 日から新しい学年
  assert.deepEqual(C.gradeAt(D('2019-04-02'), D('2026-03-31')), { stage: 'preschool', grade: 0 });
  assert.deepEqual(C.gradeAt(D('2019-04-02'), D('2026-04-01')), { stage: 'elementary', grade: 1 });
  // 入学・卒業の年（履歴書用）
  const h = C.schoolHistory(D('1990-06-15'));
  const pick = (k, e) => C.ymdStr(h.find(x => x.key === k && x.event === e).date);
  assert.equal(pick('elementary', 'in'), '1997-04-01');
  assert.equal(pick('elementary', 'out'), '2003-03-31');
  assert.equal(pick('high', 'out'), '2009-03-31');
  assert.equal(pick('university', 'out'), '2013-03-31');
});

test('干支', () => {
  assert.equal(C.eto(2026).kanji, '丙午');
  assert.equal(C.eto(1966).kanji, '丙午');
  assert.equal(C.eto(1984).kanji, '甲子');
  assert.equal(C.eto(2024).kanji, '甲辰');
  assert.equal(C.eto(2024).animalEn, 'Dragon');
  assert.equal(C.eto(1989).kana, 'つちのとみ');
});

test('年齢早見表', () => {
  const rows = C.ageTable(2026, 100);
  assert.equal(rows.length, 101);
  assert.equal(rows[0].birthYear, 2026);
  assert.equal(rows[0].after, 0);
  const r89 = rows.find(r => r.birthYear === 1989);
  assert.equal(r89.after, 37); assert.equal(r89.before, 36);
  assert.deepEqual(r89.eras.map(e => e.era.key), ['showa', 'heisei']);
  assert.equal(rows[100].birthYear, 1926);
  assert.equal(C.ageTable(2026, 500).length, 131);
});

test('constants: 法令・出典に URL と確認日がある', () => {
  for (const [key, c] of Object.entries(K)) {
    if (key === 'ERAS') continue;
    assert.ok(c.source && c.url && c.checked, `${key} に source / url / checked が無い`);
    assert.match(c.checked, /^\d{4}-\d{2}-\d{2}$/);
  }
});
