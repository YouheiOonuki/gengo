// ===========================
// 横に送れる箱は、中身があふれている時だけ Tab で止まる（yorozu-plans QUEUE Q-532）
// 箱に data-scroll-label="<見出しの id>" を書いておくと、中身が箱より 1 px を超えて広い時だけ
// tabindex="0"・role="region"・aria-labelledby（その id）を付け、あふれていなければ 3 つとも外す。
// 開いた時と、幅が変わった時（ResizeObserver）に付け直す。このファイルが動かない時は、送れるが Tab では止まらない。
// ページに在る箱は読み込んだ時に見る。あとから組む箱（main.js の年齢早見表）は、組んだ側が watch(箱) を呼ぶ。
// ===========================
(function (root) {
  'use strict';

  /** 中身の幅と箱の幅（scrollWidth・clientWidth）から、Tab で止めるか。1 px までの差は丸めの誤差として止めない */
  function overflows(scrollWidth, clientWidth) {
    return scrollWidth - clientWidth > 1;
  }

  /** 箱の今の幅で、3 つの属性を付けるか外す */
  function apply(el) {
    if (overflows(el.scrollWidth, el.clientWidth)) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'region');
      el.setAttribute('aria-labelledby', el.getAttribute('data-scroll-label'));
    } else {
      el.removeAttribute('tabindex');
      el.removeAttribute('role');
      el.removeAttribute('aria-labelledby');
    }
  }

  /** 箱と、その中の直の子（表）の大きさが変わるたびに付け直す。同じ箱を 2 度見ない。返す物の disconnect() で見るのをやめる */
  function watch(el) {
    if (el.yorozuScrollBox) return el.yorozuScrollBox;
    apply(el);
    var ro = { disconnect: function () {} };
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(function () { apply(el); });
      ro.observe(el);
      for (var i = 0; i < el.children.length; i++) ro.observe(el.children[i]);
    }
    el.yorozuScrollBox = ro;
    return ro;
  }

  var api = { overflows: overflows, apply: apply, watch: watch };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.YorozuScrollBox = api;
    var start = function () {
      var boxes = document.querySelectorAll('[data-scroll-label]');
      for (var i = 0; i < boxes.length; i++) watch(boxes[i]);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})(this);
