// 共通の皮のページは h1 の大きさとボタンの角丸を皮に任せる（yorozu-plans D637・Q-819）。
// 前は 480px 以下で h1 を --fs-l（20px）に、固定バーのボタンを角丸 0 に上書きしていた。皮の後ろ（yorozu-common:end の後）に戻さない
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const own = css.slice(css.indexOf('/* yorozu-common:end */'));

test('皮の後ろに h1 の font-size の上書きが無い', () => {
  assert.ok(own.length < css.length);
  assert.doesNotMatch(own, /h1\s*\{[^}]*font-size/);
});

test('皮の後ろに border-radius: 0 が無い', () => {
  assert.doesNotMatch(own, /border-radius:\s*0[;\s}]/);
});
