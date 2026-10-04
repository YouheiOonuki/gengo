// 画面の「この道具について」（WRITING 1 章、2026-10-04）: 折りたたみがあり、400〜800 字（yorozu-plans の tools/writing/measure.py と同じ数え方）
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PAGES = ['index.html', 'gakunen/index.html', 'gakunen/rireki.html', 'yakudoshi/index.html', 'nenpyo/index.html'];
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

for (const p of PAGES) {
  test(`この道具について: ${p}`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
    const m = html.match(/<details[^>]*>\s*<summary[^>]*>この道具について（使い方・計算のしくみ・注意）<\/summary>[\s\S]*?<\/details>/);
    assert.ok(m, 'about-tool の折りたたみが無い');
    assert.ok(/id="about-tool"/.test(m[0]));
    assert.ok((m[0].match(/<h3/g) || []).length <= 4, 'h3 は 4 まで');
    const text = m[0].replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, (e) => ENT[e] || e).replace(/\s+/g, '');
    assert.ok(text.length >= 400 && text.length <= 800, `${text.length} 字（400〜800）`);
    assert.ok(/href="\.\/guide\.html"/.test(m[0]), '使い方ページへのリンク');
  });
}
