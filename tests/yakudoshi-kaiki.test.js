// 厄年・年祝い（yakudoshi/）と回忌（kaiki/）のテスト: node --test tests/*.test.js
// 期待値は、2026-09-25 に各寺社・宗派の公式ページで読んだ令和8年の表と、曹洞宗 SOTOZEN-NET の計算結果
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../calc.js');
const K = require('../constants.js');

const D = (s) => C.parseYmd(s);
const S = (o) => C.ymdStr(o);
const born = (rows, sex, kind, age) => rows.find(r => r.sex === sex && r.kind === kind && r.age === age).birthYear;

test('数え年: 生まれた年を 1 歳、元日で 1 つ増える', () => {
  assert.equal(C.kazoeAge(1985, 2026), 42);
  assert.equal(C.kazoeAge(2026, 2026), 1);
});

test('厄年 2026（数え年）: 成田山・西新井大師・神社本庁の令和8年の表と同じ生まれ年', () => {
  const t = C.yakuTable(2026);
  // 男性: 24 平成15・25 平成14・26 平成13、41 昭和61・42 昭和60・43 昭和59、60 昭和42・61 昭和41・62 昭和40
  assert.deepEqual([24, 25, 26].map((a, i) => born(t, 'male', ['mae', 'hon', 'ato'][i], a)), [2003, 2002, 2001]);
  assert.deepEqual([41, 42, 43].map((a, i) => born(t, 'male', ['mae', 'hon', 'ato'][i], a)), [1986, 1985, 1984]);
  assert.deepEqual([60, 61, 62].map((a, i) => born(t, 'male', ['mae', 'hon', 'ato'][i], a)), [1967, 1966, 1965]);
  // 女性: 19 平成20、33 平成6、37 平成2（前厄 36 平成3・後厄 38 平成元）、61 昭和41
  assert.equal(born(t, 'female', 'hon', 19), 2008);
  assert.equal(born(t, 'female', 'hon', 33), 1994);
  assert.equal(born(t, 'female', 'hon', 37), 1990);
  assert.equal(born(t, 'female', 'mae', 36), 1991);
  assert.equal(born(t, 'female', 'ato', 38), 1989);
  assert.equal(born(t, 'female', 'hon', 61), 1966);
  // 大厄と「寺社による」37
  assert.equal(t.find(r => r.sex === 'male' && r.kind === 'hon' && r.age === 42).taiyaku, true);
  assert.equal(t.find(r => r.sex === 'female' && r.kind === 'hon' && r.age === 33).taiyaku, true);
  assert.equal(t.find(r => r.sex === 'female' && r.kind === 'hon' && r.age === 37).optional, true);
  assert.equal(t.length, (3 + 4) * 3);
});

test('厄年 2026（その年の満年齢・川崎大師）: 令和8年 年令早見表（PDF）の色分けと同じ', () => {
  const t = C.yakuTable(2026, 'mannen');
  // 男性厄年（緑）: 昭和58・59・60（43・42・41 才）、平成12・13・14（26・25・24 才）
  assert.deepEqual([41, 42, 43].map((a, i) => born(t, 'male', ['mae', 'hon', 'ato'][i], a)), [1985, 1984, 1983]);
  assert.deepEqual([24, 25, 26].map((a, i) => born(t, 'male', ['mae', 'hon', 'ato'][i], a)), [2002, 2001, 2000]);
  // 女性厄年（赤）: 平成4・5・6（34・33・32 才）、平成18・19・20（20・19・18 才）
  assert.deepEqual([32, 33, 34].map((a, i) => born(t, 'female', ['mae', 'hon', 'ato'][i], a)), [1994, 1993, 1992]);
  assert.deepEqual([18, 19, 20].map((a, i) => born(t, 'female', ['mae', 'hon', 'ato'][i], a)), [2008, 2007, 2006]);
  // 男女厄年（黄）: 昭和40・41・42（61・60・59 才）
  assert.deepEqual([59, 60, 61].map((a, i) => born(t, 'male', ['mae', 'hon', 'ato'][i], a)), [1967, 1966, 1965]);
  assert.deepEqual([59, 60, 61].map((a, i) => born(t, 'female', ['mae', 'hon', 'ato'][i], a)), [1967, 1966, 1965]);
});

test('生まれ年から、その年の厄', () => {
  assert.deepEqual(C.yakuOf(1985, 'male', 2026).map(r => r.kind), ['hon']);
  assert.deepEqual(C.yakuOf(1985, 'male', 2026, 'mannen').map(r => r.kind), ['mae']);   // 同じ人が川崎大師では前厄
  assert.deepEqual(C.yakuOf(1985, 'female', 2026), []);
  assert.deepEqual(C.yakuOf(1966, 'female', 2026).map(r => r.hon + r.kind), ['61hon']);
  // 2027 年（digtools の 2027 年の表と同じ: 男性本厄 42 歳 昭和61年、女性 33 歳 平成7年）
  assert.equal(born(C.yakuTable(2027), 'male', 'hon', 42), 1986);
  assert.equal(born(C.yakuTable(2027), 'female', 'hon', 33), 1995);
});

test('年祝い 2026: 数え年（春日神社の令和8年 祝寿早見表）と満年齢（川崎大師の健康長寿）', () => {
  const t = Object.fromEntries(C.toshiiwaiTable(2026).map(r => [r.key, r]));
  // 数え年: 還暦 昭和41・古希 昭和32・喜寿 昭和25・傘寿 昭和22・米寿 昭和14・卒寿 昭和12・白寿 昭和3
  assert.deepEqual(['kanreki', 'koki', 'kiju', 'sanju', 'beiju', 'sotsuju', 'hakuju'].map(k => t[k].kazoeBirth), [1966, 1957, 1950, 1947, 1939, 1937, 1928]);
  // 満年齢: 古稀 昭和31・喜寿 昭和24・傘寿 昭和21・米寿 昭和13・卒寿 昭和11・白寿 昭和2
  assert.deepEqual(['koki', 'kiju', 'sanju', 'beiju', 'sotsuju', 'hakuju'].map(k => t[k].manBirth), [1956, 1949, 1946, 1938, 1936, 1927]);
  // 還暦は数え 61 ＝ 満 60 で同じ生まれ年
  assert.equal(t.kanreki.manAge, 60);
  assert.equal(t.kanreki.manBirth, 1966);
  assert.equal(C.toshiiwaiTable(2027)[0].kazoeBirth, 1967);
  assert.deepEqual(C.toshiiwaiOf(1957, 2026).map(r => [r.key, r.kazoe, r.man]), [['koki', true, false]]);
  assert.deepEqual(C.toshiiwaiOf(1966, 2026).map(r => [r.key, r.kazoe, r.man]), [['kanreki', true, true]]);
});

test('回忌の名前（漢数字）', () => {
  assert.equal(C.kaikiName(1), '一周忌');
  assert.equal(C.kaikiName(3), '三回忌');
  assert.equal(C.kaikiName(13), '十三回忌');
  assert.equal(C.kaikiName(23), '二十三回忌');
  assert.equal(C.kaikiName(50), '五十回忌');
});

test('回忌 2026-05-01 の命日: 曹洞宗 SOTOZEN-NET の年回表（年月日・曜日）と同じ', () => {
  const l = C.kaikiList(D('2026-05-01'), { n2x: 'split', extra: true });
  const WD = '日月火水木金土';
  assert.deepEqual(l.map(r => r.n), [1, 3, 7, 13, 17, 23, 27, 33, 37, 43, 47, 50]);
  assert.deepEqual(l.map(r => S(r.date) + WD[C.weekdayOf(r.date)]), [
    '2027-05-01土', '2028-05-01月', '2032-05-01土', '2038-05-01土', '2042-05-01木', '2048-05-01金',
    '2052-05-01水', '2058-05-01水', '2062-05-01月', '2068-05-01火', '2072-05-01日', '2075-05-01水'
  ]);
  assert.deepEqual(l.slice(0, 3).map(r => r.years), [1, 2, 6]);
});

test('回忌: 二十三〜二十七回忌の選び方', () => {
  const ns = (o) => C.kaikiList(D('2000-01-10'), o).map(r => r.n);
  assert.deepEqual(ns(), [1, 3, 7, 13, 17, 23, 25, 27, 33, 50]);
  assert.deepEqual(ns({ n2x: 'split' }), [1, 3, 7, 13, 17, 23, 27, 33, 50]);
  assert.deepEqual(ns({ n2x: 'n25' }), [1, 3, 7, 13, 17, 25, 33, 50]);   // 浄土真宗本願寺派の寺院の例
  assert.equal(C.kaikiList(D('2000-01-10'), { n2x: 'n25' }).find(r => r.n === 25).date.y, 2024);
  assert.equal(C.kaikiList(null), null);
});

test('回忌: 2 月 29 日の命日は、2 月 29 日が無い年は 2 月 28 日にして印を付ける', () => {
  const l = C.kaikiList(D('2024-02-29'));
  assert.equal(S(l[0].date), '2025-02-28');
  assert.equal(l[0].noLeap, true);
  const r7 = l.find(r => r.n === 7);   // 2030 年は平年
  assert.equal(S(r7.date), '2030-02-28');
  const r17 = l.find(r => r.n === 17); // 2040 年はうるう年
  assert.equal(S(r17.date), '2040-02-29');
  assert.equal(r17.noLeap, false);
});

test('四十九日・百か日: 亡くなった日を 1 日目（SOTOZEN-NET の正当日・はせがわの例と同じ）', () => {
  const l = C.chuinList(D('2026-05-01'));
  assert.deepEqual(l.map(r => r.day + ':' + S(r.date)), [
    '7:2026-05-07', '14:2026-05-14', '21:2026-05-21', '28:2026-05-28', '35:2026-06-04', '42:2026-06-11', '49:2026-06-18', '100:2026-08-08'
  ]);
});

test('四十九日・百か日: 逮夜（前日を 1 日目。SOTOZEN-NET の逮夜日と同じ）', () => {
  const l = C.chuinList(D('2026-01-01'), 'taiya');
  assert.deepEqual(l.map(r => r.day + ':' + S(r.date)), [
    '7:2026-01-06', '14:2026-01-13', '21:2026-01-20', '28:2026-01-27', '35:2026-02-03', '42:2026-02-10', '49:2026-02-17', '100:2026-04-09'
  ]);
  // 年をまたぐ
  assert.equal(S(C.chuinList(D('2026-12-20')).find(r => r.day === 49).date), '2027-02-06');
});

test('年ごとの回忌早見表 2026 / 2027（湘南森林霊園の表と同じ没年）', () => {
  const y26 = Object.fromEntries(C.kaikiYearTable(2026, { n2x: 'split', extra: true }).map(r => [r.n, r.deathYear]));
  assert.deepEqual([y26[1], y26[3], y26[7], y26[13], y26[17], y26[23], y26[27], y26[33], y26[37], y26[43], y26[47], y26[50]],
    [2025, 2024, 2020, 2014, 2010, 2004, 2000, 1994, 1990, 1984, 1980, 1977]);
  const y27 = Object.fromEntries(C.kaikiYearTable(2027).map(r => [r.n, r.deathYear]));
  assert.deepEqual([y27[1], y27[3], y27[7], y27[25], y27[50]], [2026, 2025, 2021, 2003, 1978]);
});

test('曜日（グレゴリオ暦）', () => {
  assert.equal(C.weekdayOf(D('2026-09-25')), 5);   // 金曜日
  assert.equal(C.weekdayOf(D('1989-01-08')), 0);   // 平成元年1月8日は日曜日
  assert.equal(C.weekdayOf(D('2000-02-29')), 2);
});

test('出典と確認日が constants.js にある', () => {
  for (const k of ['yakudoshi', 'toshiiwai', 'kaiki', 'chuin']) {
    assert.equal(K[k].checked, '2026-09-25', k);
    assert.ok(K[k].sources.length >= 2, k);
    for (const s of K[k].sources) assert.match(s.url, /^https:\/\//);
  }
});
