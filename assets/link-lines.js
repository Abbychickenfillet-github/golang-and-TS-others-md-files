/* ==========================================================================
   link-lines.js — 連連看元件（Abby-notes 共用）

   作用：文字裡提到「上面第 2 組公式」「圖中的 tag」這種抽象指代時，
         點一下那段文字，就從它畫一條線連到被指的地方，約 1 秒後淡出消失。

   用法：
     1. 被指的地方加 id：<span id="f-verify">…</span>（可以放在 <pre><code> 裡面）
     2. 指代的文字包起來：<span class="ll-src" data-link-to="#f-verify">第 2 組是驗 token</span>
        data-link-to 可以寫多個選擇器，用逗號分隔，會同時連到每一個目標

   畫面規則（不擋住其他文字）：
     - 線畫在一層透明的 SVG 上，pointer-events:none，滑鼠點擊會穿透，不影響操作
     - 線用主色、細線、半透明；目標只加外框與淡底色，不蓋住字
     - 出現約 1 秒後淡出並移除；捲動頁面時立刻移除，避免線跟內容錯位
     - 目標不在畫面內時，先把目標捲到畫面中央再畫線

   載入：assets/notes.js 會自動載入；沒有引入 notes.js 的頁面在 </body> 前自己加 <script src>
   ========================================================================== */
(function () {
  'use strict';
  if (window.__linkLinesInit) return; // 同一頁只初始化一次
  window.__linkLinesInit = true;

  var SHOW_MS = 1000;   // 線停留的時間
  var FADE_MS = 400;    // 淡出的時間
  var current = null;   // 目前畫面上的那一組線，再點別的就先清掉

  /** 注入元件樣式，只注入一次 */
  function injectStyle() {
    var css = [
      // 指代文字：主色虛線底線，看得出可以點
      '.ll-src{border-bottom:1.5px dashed var(--accent,#468);cursor:pointer;border-radius:3px}',
      '.ll-src:hover,.ll-src:focus-visible{background:color-mix(in srgb,var(--accent,#468) 12%,transparent);outline:none}',
      // 畫線的那層：蓋住整個視窗但不攔截滑鼠
      '.ll-layer{position:fixed;inset:0;z-index:900;pointer-events:none;opacity:1;transition:opacity ' + FADE_MS + 'ms ease}',
      '.ll-layer.fade{opacity:0}',
      '.ll-layer path{fill:none;stroke:var(--accent,#468);stroke-width:2.2;stroke-linecap:round;opacity:.75}',
      '.ll-layer circle{fill:var(--accent,#468);opacity:.85}',
      // 目標：外框加淡底色，不蓋住文字
      '.ll-target{outline:2px solid var(--accent,#468);outline-offset:2px;border-radius:4px;' +
        'background:color-mix(in srgb,var(--accent,#468) 10%,transparent);transition:outline-color ' + FADE_MS + 'ms,background ' + FADE_MS + 'ms}'
    ].join('\n');
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  /** 立刻移除畫面上的線與目標外框 */
  function clear() {
    if (!current) return;
    current.layer.remove();
    current.targets.forEach(function (t) { t.classList.remove('ll-target'); });
    clearTimeout(current.timer);
    current = null;
  }

  /**
   * 判斷元素是否完整出現在視窗內
   * @param {Element} el 元素
   * @returns {boolean} 完整可見就回傳 true
   */
  function inView(el) {
    var r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  }

  /**
   * 從來源元素畫曲線到每個目標，1 秒後淡出
   * @param {Element} src 被點的指代文字
   * @param {Element[]} targets 被指的元素
   */
  function draw(src, targets) {
    clear();
    var ns = 'http://www.w3.org/2000/svg';
    var layer = document.createElementNS(ns, 'svg');
    layer.setAttribute('class', 'll-layer');
    layer.setAttribute('width', window.innerWidth);
    layer.setAttribute('height', window.innerHeight);
    var a = src.getBoundingClientRect();

    targets.forEach(function (t) {
      var b = t.getBoundingClientRect();
      t.classList.add('ll-target');
      // 起點與終點：來源在上就從來源底邊連到目標頂邊，反之亦然，線不會穿過兩者的文字
      var down = b.top > a.bottom;
      var x1 = a.left + a.width / 2, y1 = down ? a.bottom : a.top;
      var x2 = b.left + Math.min(b.width / 2, 60), y2 = down ? b.top : b.bottom;
      var bend = Math.max(40, Math.abs(y2 - y1) * 0.4);              // 彎曲程度隨距離變大
      var path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 + (down ? bend : -bend)) + ' ' +
        x2 + ',' + (y2 + (down ? -bend : bend)) + ' ' + x2 + ',' + y2);
      layer.appendChild(path);
      [[x1, y1], [x2, y2]].forEach(function (p) {                        // 兩端各一個小圓點
        var c = document.createElementNS(ns, 'circle');
        c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', 3.5);
        layer.appendChild(c);
      });
      // 畫線動畫：先用虛線偏移把整條線藏起來，再讓偏移歸零，看起來像一筆畫出來
      requestAnimationFrame(function () {
        var len = path.getTotalLength();                                   // 整條線的長度
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        path.getBoundingClientRect();                                      // 強制重新計算版面，下一行的 transition 才會播
        path.style.transition = 'stroke-dashoffset 350ms ease-out';
        path.style.strokeDashoffset = 0;
      });
    });

    document.body.appendChild(layer);
    var timer = setTimeout(function () {
      layer.classList.add('fade');
      targets.forEach(function (t) { t.classList.remove('ll-target'); });
      setTimeout(clear, FADE_MS);
    }, SHOW_MS);
    current = { layer: layer, targets: targets, timer: timer, drawnAt: Date.now() };
  }

  /**
   * 處理一次點擊：找出目標，必要時先捲動，再畫線
   * @param {Element} src 有 data-link-to 的元素
   */
  function activate(src) {
    var targets = src.getAttribute('data-link-to').split(',').map(function (sel) {
      try { return document.querySelector(sel.trim()); } catch (e) { return null; } // 選擇器寫錯時略過，不讓整頁報錯
    }).filter(Boolean);
    if (!targets.length) return;
    if (inView(targets[0]) && inView(src)) { draw(src, targets); return; }
    targets[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { draw(src, targets); }, 450);                    // 等平滑捲動大致結束再畫
  }

  function init() {
    injectStyle();
    document.addEventListener('click', function (e) {
      var src = e.target.closest('[data-link-to]');
      if (src) activate(src);
    });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-link-to]')) {
        e.preventDefault();
        activate(e.target);
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-link-to]'), function (el) {
      if (!el.hasAttribute('tabindex')) el.tabIndex = 0;                      // 鍵盤也能操作
    });
    // 捲動時移除線（線是固定在視窗上的，內容一捲就會錯位）；剛畫好的 300ms 內忽略，因為平滑捲動可能還在收尾
    window.addEventListener('scroll', function () { if (current && Date.now() - current.drawnAt > 300) clear(); }, { passive: true });
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
