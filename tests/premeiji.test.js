// 明治より前（江戸期: 慶長〜慶応）の元号は年の対応だけ（yorozu-plans K158）。出典は constants.js の preMeiji
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../constants.js');
const C = require('../calc.js');

const PRE = K.preMeiji.value;

test('表: 36 の元号が切れ目なくつながる（前の元号の最後の年 ＝ 次の元年）。最後の慶応 4 年は明治元年（1868）', () => {
  assert.equal(PRE.length, 36);
  assert.equal(PRE[0].kanji, '慶長');
  assert.equal(PRE[0].start, 1596);
  for (let i = 1; i < PRE.length; i++) {
    assert.equal(PRE[i - 1].start + PRE[i - 1].last - 1, PRE[i].start, `${PRE[i - 1].kanji} → ${PRE[i].kanji}`);
  }
  const keio = PRE.at(-1);
  assert.equal(keio.kanji, '慶応');
  assert.equal(keio.start + keio.last - 1, Number(K.ERAS[0].start.slice(0, 4)), '慶応 4 年 ＝ 明治元年の年');
  assert.equal(new Set(PRE.map((e) => e.key)).size, 36, 'key は重複しない');
  assert.equal(new Set(PRE.map((e) => e.kanji)).size, 36, '漢字は重複しない');
});

test('和暦の年 → 西暦の年（年だけ。月日は捨てて dateIgnored）', () => {
  const cases = [['keicho', 1, 1596], ['keicho', 20, 1615], ['genroku', 1, 1688], ['kyoho', 21, 1736], ['tenpo', 15, 1844], ['kaei', 6, 1853], ['manen', 1, 1860], ['keio', 1, 1865], ['keio', 4, 1868]];
  for (const [key, n, y] of cases) {
    const r = C.toSeireki(key, n);
    assert.equal(r.ok, true, key + n);
    assert.equal(r.y, y, key + n);
    assert.equal(r.preMeiji, true);
    assert.equal(r.lunar, true);
    assert.equal(r.dateIgnored, false);
  }
  assert.equal(C.toSeireki('keio', 1, 5, 1).dateIgnored, true);
  assert.deepEqual([C.toSeireki('keio', 5).error, C.toSeireki('keio', 5).last], ['year', 4]);
  assert.equal(C.toSeireki('keio', 0).error, 'year');
});

test('西暦の年 → 明治より前の和暦の年。改元の年は 2 つ。1596 年より前と 1868 年以後は空', () => {
  const show = (y) => C.preErasOfYear(y).map((x) => C.formatEraYear(x.era, x.year));
  assert.deepEqual(show(1865), ['元治2年', '慶応元年']);
  assert.deepEqual(show(1853), ['嘉永6年']);
  assert.deepEqual(show(1600), ['慶長5年']);
  assert.deepEqual(show(1596), ['慶長元年']);
  assert.deepEqual(show(1595), []);
  assert.deepEqual(show(1868), [], '1868 年は明治元年（erasOfYear の側）');
  for (let y = 1596; y <= 1867; y++) assert.ok(show(y).length >= 1, `${y} に元号がある`);
});

test('読み取り: 漢字・かな・ローマ字（長音の記号なしも）', () => {
  assert.deepEqual(C.parseInput('慶応元年'), { kind: 'wareki', era: 'keio', year: 1 });
  assert.deepEqual(C.parseInput('文久3年'), { kind: 'wareki', era: 'bunkyu', year: 3 });
  assert.deepEqual(C.parseInput('げんろく十五年'), { kind: 'wareki', era: 'genroku', year: 15 });
  assert.deepEqual(C.parseInput('Tenpo 8'), { kind: 'wareki', era: 'tenpo', year: 8 });
  assert.deepEqual(C.parseInput('Keiō 2'), { kind: 'wareki', era: 'keio', year: 2 });
  assert.deepEqual(C.parseInput("kan'ei 10"), { kind: 'wareki', era: 'kanei', year: 10 });
  // 明治・明和、元和・元年のように字が近いものも取り違えない
  assert.equal(C.parseInput('明和3年').era, 'meiwa');
  assert.equal(C.parseInput('明治3年').era, 'meiji');
  assert.equal(C.parseInput('元和2年').era, 'genna');
  assert.equal(C.eraByKey('keio').kanji, '慶応');
  assert.equal(C.lastYearOf(C.eraByKey('keio')), 4);
});
