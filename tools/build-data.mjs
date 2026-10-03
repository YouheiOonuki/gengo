// 公開データ（CC0）の書き出し: 元号表（data/gengo.json）と学年早見表（data/gakunen.json）（yorozu-plans ROADMAP 7.17 の K133）
//   node tools/build-data.mjs          書き出す
//   node tools/build-data.mjs --check  書き出した結果とファイルが違えば終了コード 1（tests/data.test.js と同じ確認）
// data/ の JSON は手で直さない。元号の境目と出典は constants.js の ERAS、学年の表は calc.js の gradeTable（画面と同じ関数）から作る。
// generated（生成日。ACCEPTANCE 7.10.3 e）: 中身（generated を除く）が今のファイルと同じなら、今のファイルの generated をそのまま使う。
//   中身が変わったときだけ、その日（日本時間。環境変数 GENERATED=YYYY-MM-DD で指定もできる）になる（seido-keisan の tools/build-data.mjs と同じ決まり）
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const K = require(join(root, 'constants.js'));
const C = require(join(root, 'calc.js'));

const SITE = 'https://yorozu-craft.com/gengo/';
const DATA_URL = SITE + 'data/';
const REPO_URL = 'https://github.com/YouheiOonuki/gengo';
// 学年早見表を書き出す年度の範囲（年度は 4 月 1 日〜翌年 3 月 31 日）。範囲を広げるときはここだけ直す
export const FY_FROM = 2020;
export const FY_TO = 2035;

const head = (title, file, page) => ({
  title,
  license: 'CC0-1.0',
  license_url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.ja',
  publisher: 'yorozu-craft（Youhei Oonuki）',
  homepage: SITE + page,
  data_url: DATA_URL + file,
  repository: REPO_URL,
});
const uniq = a => [...new Set(a)];
const latest = a => a.slice().sort().at(-1);
const ymd = o => C.ymdStr(o);
const law = k => ({ label: K[k].label, value: K[k].value, source: K[k].source, url: K[k].url, checked: K[k].checked });

// 日本時間の今日（YYYY-MM-DD）。GENERATED があればそれ
export function today() {
  const g = process.env.GENERATED;
  if (g && /^\d{4}-\d{2}-\d{2}$/.test(g)) return g;
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

export function buildGengo(generated = today()) {
  const laws = ['gregorianAdoption', 'eraLaw'];
  const data = {
    ...head('元号表（明治〜令和の始まりと終わりの日）', 'gengo.json', ''),
    generated_from: 'constants.js の ERAS（tools/build-data.mjs で書き出し）',
    checked: latest([...K.ERAS.map(e => e.checked), ...laws.map(k => K[k].checked)]),
    generated,
    source: uniq([...K.ERAS.map(e => e.url), ...laws.map(k => K[k].url)]),
    note: 'start はその元号の最初の日、end は最後の日（グレゴリオ暦。今の元号は null）。改元の日はその日から新しい元号。明治5年12月2日（1872-12-31）までは旧暦なので、それより前の月日は和暦と西暦で 1 対 1 にならない。',
    eras: K.ERAS.map(e => ({ key: e.key, kanji: e.kanji, kana: e.kana, romaji: e.romaji, abbr: e.abbr, start: e.start, end: e.end, note: e.note, source: { label: e.source, url: e.url }, checked: e.checked })),
    laws: laws.map(law),
  };
  return JSON.stringify(data, null, 2) + '\n';
}

// 学年の名前（key は calc.js の gradeTable と同じ）
const STAGE = { e: '小学', j: '中学', h: '高校', u: '大学', m: '修士', d: '博士' };
const KINDER = { k3: '年少（3 歳児）', k4: '年中', k5: '年長' };
const gradeName = key => KINDER[key] || STAGE[key[0]] + ' ' + key.slice(1) + ' 年';

export function buildGakunen(generated = today()) {
  const laws = ['schoolEntry', 'schoolYear', 'kindergarten', 'schoolLength', 'gradSchoolLength', 'universityYear'];
  const years = [];
  for (let fy = FY_FROM; fy <= FY_TO; fy++) {
    years.push({ fiscal_year: fy, from: fy + '-04-01', to: (fy + 1) + '-03-31',
      grades: C.gradeTable(fy).map(r => ({ key: r.key, grade: gradeName(r.key), born_from: ymd(r.from), born_to: ymd(r.to), age_at_april_1: r.age })) });
  }
  const data = {
    ...head('学年早見表（生年月日と学年の対応。年度ごと）', 'gakunen.json', 'gakunen/'),
    generated_from: 'calc.js の gradeTable（画面と同じ関数）と constants.js の法令（tools/build-data.mjs で書き出し）',
    checked: latest(laws.map(k => K[k].checked)),
    generated,
    source: uniq(laws.map(k => K[k].url)),
    rule: '小学 1 年は、その年度の初め（4 月 1 日）までに満 6 歳になった人（前年の 4 月 2 日〜その年の 4 月 1 日生まれ）。4 月 1 日生まれは前日の 3 月 31 日の終わりに年をとる（年齢計算ニ関スル法律・民法 143 条）ので早生まれに入る。高校以降は飛び級・留年・浪人などがないときの学年。',
    note: 'age_at_april_1 は年度の初めの満年齢（年度中に誕生日を迎えて 1 つ増える）。年少〜年長は幼稚園の 3 年保育の学年。大学の学年の始期は学長が定める（ここでは 4 月）。',
    fiscal_years: { from: FY_FROM, to: FY_TO },
    laws: laws.map(law),
    years,
  };
  return JSON.stringify(data, null, 2) + '\n';
}

// 今のファイルの generated（無ければ null）
export function generatedOf(text) {
  const m = text && text.match(/"generated": "(\d{4}-\d{2}-\d{2})"/);
  return m ? m[1] : null;
}
// 中身が同じなら今の generated を残し、変わったときだけ今日にする
export function stamp(build, now) {
  const prev = generatedOf(now);
  if (prev && build(prev) === now) return now;
  return build(today());
}
const read = rel => { const f = join(root, rel); return existsSync(f) ? readFileSync(f, 'utf8') : null; };
export function outputs() {
  return {
    'data/gengo.json': stamp(buildGengo, read('data/gengo.json')),
    'data/gakunen.json': stamp(buildGakunen, read('data/gakunen.json')),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  let bad = 0;
  for (const [rel, body] of Object.entries(outputs())) {
    const now = read(rel);
    if (now === body) { console.log(rel + ': 変更なし'); continue; }
    if (check) { console.error(rel + ' が constants.js・calc.js と合っていない。node tools/build-data.mjs を実行する'); bad++; }
    else { mkdirSync(join(root, 'data'), { recursive: true }); writeFileSync(join(root, rel), body); console.log(rel + ' を書き出した'); }
  }
  if (bad) process.exit(1);
}
