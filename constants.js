// ===========================
// 元号の境目と、年齢・学年の決まり（値・出典・確認日をセットで）
// 日本語ページも英語ページ（en/）もこのファイルを読む（値を 2 か所に持たない）
// 新しい元号が決まったら ERAS の末尾に 1 つ足し、直前の元号に end を入れる（README「保守」）
// ブラウザでは window.Constants、Node（テスト）では module.exports で使う
// ===========================
(function (root) {
  'use strict';

  var CHECKED = '2026-09-24';

  var CONSTANTS = {
    // start: その元号の最初の日（グレゴリオ暦）、end: 最後の日（今の元号は null）
    ERAS: [
      {
        key: 'meiji', kanji: '明治', kana: 'めいじ', romaji: 'Meiji', abbr: 'M',
        start: '1868-01-25', end: '1912-07-29',
        note: '明治元年9月8日（1868年10月23日）の詔で、慶応4年1月1日（1868年1月25日）にさかのぼって明治元年とした。明治5年12月2日（1872年12月31日）までは旧暦（太陰太陽暦）',
        source: '国立公文書館「日本のあゆみ」明治元年（1868）9月 一世一元の制となる',
        url: 'https://www.archives.go.jp/ayumi/kobetsu/m01_1868_04.html',
        checked: CHECKED
      },
      {
        key: 'taisho', kanji: '大正', kana: 'たいしょう', romaji: 'Taishō', abbr: 'T',
        start: '1912-07-30', end: '1926-12-24',
        note: '明治45年7月30日に改元（明治45年7月30日＝大正元年7月30日）',
        source: '国立公文書館「日本のあゆみ」明治45年（1912）7月 大正と改元',
        url: 'https://www.archives.go.jp/ayumi/kobetsu/m45_1912_01.html',
        checked: CHECKED
      },
      {
        key: 'showa', kanji: '昭和', kana: 'しょうわ', romaji: 'Shōwa', abbr: 'S',
        start: '1926-12-25', end: '1989-01-07',
        note: '詔書「大正十五年十二月二十五日以後ヲ改メテ昭和元年ト為ス」',
        source: '国立公文書館デジタルアーカイブ「大正十五年十二月二十五日以後ヲ改メテ昭和元年ト為ス」（御署名原本・大正十五年・詔書一二月二五日）',
        url: 'https://www.digital.archives.go.jp/file/2515429.html',
        checked: CHECKED
      },
      {
        key: 'heisei', kanji: '平成', kana: 'へいせい', romaji: 'Heisei', abbr: 'H',
        start: '1989-01-08', end: '2019-04-30',
        note: '元号を改める政令（昭和64年政令第1号）。昭和64年1月7日公布、附則「公布の日の翌日から施行」',
        source: 'e-Gov 法令検索「元号を改める政令」（昭和六十四年政令第一号）',
        url: 'https://laws.e-gov.go.jp/law/364CO0000000001',
        checked: CHECKED
      },
      {
        key: 'reiwa', kanji: '令和', kana: 'れいわ', romaji: 'Reiwa', abbr: 'R',
        start: '2019-05-01', end: null,
        note: '元号を改める政令（平成31年政令第143号）。附則「平成三十一年四月三十日の翌日から施行」',
        source: 'e-Gov 法令検索「元号を改める政令」（平成三十一年政令第百四十三号）',
        url: 'https://laws.e-gov.go.jp/law/431CO0000000143',
        checked: CHECKED
      }
    ],

    // 明治5年12月3日を明治6年1月1日（1873-01-01）とし、太陽暦（グレゴリオ暦）に改めた
    gregorianAdoption: {
      value: '1873-01-01',
      label: '太陽暦への改暦（明治5年12月3日を明治6年1月1日とする）',
      source: 'e-Gov 法令検索「明治五年太政官布告第三百三十七号（改暦ノ布告）」',
      url: 'https://laws.e-gov.go.jp/law/105DF0000000337',
      checked: CHECKED
    },
    eraLaw: {
      value: '元号は、政令で定める。元号は、皇位の継承があつた場合に限り改める。',
      label: '元号法（昭和54年法律第43号）',
      source: 'e-Gov 法令検索「元号法」',
      url: 'https://laws.e-gov.go.jp/law/354AC0000000043',
      checked: CHECKED
    },
    ageLaw: {
      value: '年齢ハ出生ノ日ヨリ之ヲ起算ス／民法第百四十三条ノ規定ハ年齢ノ計算ニ之ヲ準用ス',
      label: '年齢計算ニ関スル法律（明治35年法律第50号）',
      source: 'e-Gov 法令検索「年齢計算ニ関スル法律」',
      url: 'https://laws.e-gov.go.jp/law/135AC1000000050',
      checked: CHECKED
    },
    civilCode143: {
      value: '起算日に応当する日の前日に満了する。最後の月に応当する日がないときは、その月の末日に満了する',
      label: '民法第143条（暦による期間の計算）',
      source: 'e-Gov 法令検索「民法」第百四十三条',
      url: 'https://laws.e-gov.go.jp/law/129AC0000000089',
      checked: CHECKED
    },
    schoolEntry: {
      value: '満六歳に達した日の翌日以後における最初の学年の初めから',
      label: '学校教育法第17条（就学の始期）',
      source: 'e-Gov 法令検索「学校教育法」第十七条',
      url: 'https://laws.e-gov.go.jp/law/322AC0000000026',
      checked: CHECKED
    },
    schoolYear: {
      value: '4月1日に始まり、翌年3月31日に終わる',
      label: '学校教育法施行規則第59条（小学校の学年）',
      source: 'e-Gov 法令検索「学校教育法施行規則」第五十九条',
      url: 'https://laws.e-gov.go.jp/law/322M40000080011',
      checked: CHECKED
    },

    // --- 学年早見表・履歴書の学歴（gakunen/。2026-09-25 に e-Gov 法令 API で条文を取得して確認） ---
    // 修業年限（年）。履歴書の学歴の既定の年数に使う。専門学校は法律では「1 年以上」なので、画面の既定の 2 年は法令の値ではない
    schoolLength: {
      value: { elementary: 6, junior: 3, high: 3, univ4: 4, univ6: 6, tandai: 2, kosen: 5 },
      label: '修業年限: 小学校 6 年（32 条）、中学校 3 年（47 条）、高等学校 全日制 3 年（56 条。定時制・通信制は 3 年以上）、大学 4 年（87 条 1 項。医学・歯学・薬学の臨床・獣医学は 6 年、同 2 項）、短期大学 2 年または 3 年（108 条 2 項）、高等専門学校 5 年（117 条。商船は 5 年 6 月）、専修学校 1 年以上（124 条）',
      source: 'e-Gov 法令検索「学校教育法」第三十二条・第四十七条・第五十六条・第八十七条・第百八条・第百十七条・第百二十四条',
      url: 'https://laws.e-gov.go.jp/law/322AC0000000026',
      checked: '2026-09-25'
    },
    gradSchoolLength: {
      value: { master: 2, doctorLater: 3, doctor6: 4 },
      label: '標準修業年限: 修士課程 2 年（3 条 2 項）、博士課程 5 年（4 条 2 項。前期 2 年・後期 3 年に区分できる、同 3 項）、医学・歯学・薬学（6 年制の学部が基礎）・獣医学の博士課程は 4 年（45 条）',
      source: 'e-Gov 法令検索「大学院設置基準」第三条・第四条・第四十五条',
      url: 'https://laws.e-gov.go.jp/law/349M50000080028',
      checked: '2026-09-25'
    },
    kindergarten: {
      value: '満三歳から、小学校就学の始期に達するまでの幼児',
      label: '学校教育法第26条（幼稚園に入園できる者）',
      source: 'e-Gov 法令検索「学校教育法」第二十六条',
      url: 'https://laws.e-gov.go.jp/law/322AC0000000026',
      checked: '2026-09-25'
    },
    universityYear: {
      value: '大学の学年の始期及び終期は、学長が定める',
      label: '学校教育法施行規則第163条（大学の学年）',
      source: 'e-Gov 法令検索「学校教育法施行規則」第百六十三条',
      url: 'https://laws.e-gov.go.jp/law/322M40000080011',
      checked: '2026-09-25'
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CONSTANTS;
  else root.Constants = CONSTANTS;
})(this);
