# 元号表・学年早見表のデータ（CC0）

[和暦・年齢早見](https://yorozu-craft.com/gengo/)と[学年早見表](https://yorozu-craft.com/gengo/gakunen/)と同じ中身を、ほかの道具で使える形で置いています。

| ファイル | URL | 中身 |
|---------|-----|------|
| `gengo.json` | https://yorozu-craft.com/gengo/data/gengo.json | 明治〜令和の元号の始まりと終わりの日（グレゴリオ暦）、読み・略号、各元号の出典（国立公文書館・e-Gov 法令検索）。改暦の布告と元号法 |
| `gakunen.json` | https://yorozu-craft.com/gengo/data/gakunen.json | 2020〜2035 年度の学年早見表（年少〜博士 3 年の生年月日の範囲と、年度の初めの満年齢）。学校教育法などの条文の出典 |

## ライセンス

このフォルダのデータは **CC0 1.0**（パブリック・ドメイン提供）です。全文は `LICENSE`。表示の義務はありませんが、使うときに次のように書いてもらえると助かります。

```
出典: 和暦・年齢早見（yorozu-craft） https://yorozu-craft.com/gengo/
```

このリポジトリのコード（`calc.js`・`tools/` など）は MIT License（リポジトリ直下の `LICENSE`）のままです。

## 項目

| 項目 | 意味 |
|------|------|
| `license` | `CC0-1.0` |
| `checked` | 出典の原文を最後に確かめた日（YYYY-MM-DD）。元号・法令ごとの日は各行の `checked` |
| `generated` | このファイルの中身が変わった日（YYYY-MM-DD）。中身が同じなら書き出し直しても変わらない |
| `source` | 使った出典の URL の一覧 |
| `eras[].start` / `end` | その元号の最初の日・最後の日（今の元号の `end` は `null`） |
| `years[].grades[].born_from` / `born_to` | その年度にその学年になる生年月日の範囲（4 月 2 日〜翌年 4 月 1 日） |
| `years[].grades[].age_at_april_1` | 年度の初め（4 月 1 日）の満年齢 |

## 注意

- 明治 5 年 12 月 2 日（1872-12-31）までは旧暦のため、それより前の月日は和暦と西暦で 1 対 1 になりません。
- 高校以降は飛び級・留年・浪人などがないときの学年です。大学の学年の始期は学長が定めます。

## 作り方（保守）

`data/` の JSON は手で直しません。元号は `constants.js` の `ERAS`、学年は `calc.js` の `gradeTable` から次で書き出します。テスト（`tests/data.test.js`）が、書き出した結果とファイルが同じかを確かめます。新しい元号が決まったときや年度の範囲を広げるとき（`tools/build-data.mjs` の `FY_FROM`・`FY_TO`）も同じです。

```
node tools/build-data.mjs
```
