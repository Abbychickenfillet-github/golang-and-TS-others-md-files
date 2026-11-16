/* ==========================================================================
   compare-table.js — 表格螢光筆元件（Abby-notes 共用）

   作用：讓筆記裡的表格可以用滑鼠「畫螢光筆」，方便橫向、縱向對照。

   套用對象：
     - 頁面上所有「至少兩欄」的 <table> 都會自動套用，不需要另外加 class
     - 不想套用的表格加上 data-no-compare 屬性
     - 由 assets/notes.js 自動載入；沒有引入 notes.js 的頁面，在 </body> 前
       自己加 <script src="（相對路徑）/assets/compare-table.js"></script>

   互動（全部是螢光黃同一個色相，只差深淺，不用其他顏色）：
     - 點一般格子：該格標成「深黃」，它所在的整列與整欄標成「淺黃」（十字定位）；可同時點多格
     - 點列標題（每列第一格是 <th>）：整列標成「中黃」，再點一次取消
     - 點欄標題（<thead> 裡或第一列全是 <th>）：整欄標成「中黃」，再點一次取消
     - 表格上方自動加一顆「清除螢光」按鈕，一次清掉全部標示
     - 鍵盤：Tab 移到格子，按 Enter 或空白鍵等同點擊

   顏色來源：note-theme.css 的 --hl-core（螢光黃），深色主題會自動換成暗黃；
   沒有這個變數的舊頁面，退回一個固定的螢光黃 oklch 值
   ========================================================================== */
(function () {
  'use strict';
  if (window.__compareTableInit) return; // 同一頁可能被 notes.js 與頁面自己的 <script> 各載入一次，只初始化一次
  window.__compareTableInit = true;

  /** 注入元件樣式，只注入一次 */
  function injectStyle() {
    var css = [
      // 三個深淺都由同一個螢光黃混出來：深黃＝原色，中黃＝60%，淺黃＝28%；srgb 混色，色相不會跑掉
      'table.ct-on{--ct-hl:var(--hl-core,oklch(0.95 0.13 100));--ct-base:var(--card,oklch(0.99 0 0));' +
        '--ct-strong:var(--ct-hl);--ct-mid:color-mix(in srgb,var(--ct-hl) 60%,var(--ct-base));--ct-soft:color-mix(in srgb,var(--ct-hl) 28%,var(--ct-base))}',
      '.ct-bar{display:flex;gap:10px;align-items:center;margin:6px 0;font-size:.82rem;color:var(--sub,#667)}',
      '.ct-bar button{background:var(--card,#fff);border:1px solid var(--line,#ccd);border-radius:8px;padding:4px 12px;cursor:pointer;color:inherit;font-family:inherit;font-size:.82rem}',
      'table.ct-on th,table.ct-on td{cursor:pointer;transition:background .15s}',
      'table.ct-on tbody th{white-space:nowrap}', // 列標題不換行，避免被擠成直排
      'table.ct-on .ct-cross{background:var(--ct-soft)!important}',
      'table.ct-on .ct-line{background:var(--ct-mid)!important}',
      'table.ct-on .ct-cell{background:var(--ct-strong)!important;font-weight:600}',
      'table.ct-on :focus-visible{outline:2px solid var(--accent,#468);outline-offset:-2px}'
    ].join('\n');
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  /**
   * 取得某一格在該列中的位置（不處理 colspan：合併儲存格只影響十字定位的準確度，不會出錯）
   * @param {HTMLTableCellElement} cell 格子
   * @returns {number} 從 0 開始的欄位索引
   */
  function colIndex(cell) {
    return Array.prototype.indexOf.call(cell.parentElement.children, cell);
  }

  /**
   * 判斷一列是不是「欄標題列」：在 <thead> 裡，或是沒有 <thead> 時的第一列且整列都是 <th>
   * @param {HTMLTableRowElement} tr 表格的一列
   * @param {HTMLTableElement} table 所屬表格
   * @returns {boolean} 是欄標題列就回傳 true
   */
  function isHeadRow(tr, table) {
    if (tr.closest('thead')) return true;
    if (table.tHead) return false;                          // 有 thead 時，其他列都不是標題列
    var first = table.rows[0];
    return tr === first && Array.prototype.every.call(tr.cells, function (c) { return c.tagName === 'TH'; });
  }

  /**
   * 依目前被點亮的單格，重新計算十字定位（所在列與欄標成淺黃）
   * @param {HTMLTableElement} table 表格
   */
  function refreshCross(table) {
    table.querySelectorAll('.ct-cross').forEach(function (c) { c.classList.remove('ct-cross'); });
    table.querySelectorAll('.ct-cell').forEach(function (lit) {
      var idx = colIndex(lit);
      Array.prototype.forEach.call(lit.parentElement.cells, function (c) { c.classList.add('ct-cross'); }); // 同一列
      Array.prototype.forEach.call(table.rows, function (tr) {                                              // 同一欄
        var c = tr.cells[idx];
        if (c) c.classList.add('ct-cross');
      });
    });
  }

  /**
   * 把一張表格變成可以畫螢光筆的表格
   * @param {HTMLTableElement} table 要套用的表格
   */
  function enhance(table) {
    table.classList.add('ct-on'); // 樣式只作用在有 ct-on 的表格，不影響其他表格

    var bar = document.createElement('div');
    bar.className = 'ct-bar';
    bar.innerHTML = '<button type="button">清除螢光</button><span>點格子標單格與十字、點列標題標整列、點欄標題標整欄</span>';
    table.parentNode.insertBefore(bar, table);
    bar.querySelector('button').addEventListener('click', function () {
      table.querySelectorAll('.ct-cell,.ct-line,.ct-cross').forEach(function (c) {
        c.classList.remove('ct-cell', 'ct-line', 'ct-cross');
      });
    });

    Array.prototype.forEach.call(table.querySelectorAll('th, td'), function (cell) {
      if (!cell.hasAttribute('tabindex')) cell.tabIndex = 0; // 讓每一格都能用 Tab 移過去
    });

    /**
     * 處理一次點擊或按鍵
     * @param {HTMLTableCellElement} cell 被點的格子
     */
    function activate(cell) {
      var tr = cell.parentElement;
      if (isHeadRow(tr, table)) {                       // 欄標題：整欄切換
        var idx = colIndex(cell);
        if (idx === 0) return;                          // 左上角那格不做事
        var on = !cell.classList.contains('ct-line');
        Array.prototype.forEach.call(table.rows, function (r) {
          var c = r.cells[idx];
          if (c) c.classList.toggle('ct-line', on);
        });
      } else if (cell.tagName === 'TH') {               // 列標題：整列切換
        var onRow = !cell.classList.contains('ct-line');
        Array.prototype.forEach.call(tr.cells, function (c) { c.classList.toggle('ct-line', onRow); });
      } else {                                          // 一般格子：單格切換，再更新十字定位
        cell.classList.toggle('ct-cell');
      }
      refreshCross(table);
    }

    table.addEventListener('click', function (e) {
      if (e.target.closest('a, button, input, textarea, select, .term')) return; // 點連結、按鈕、名詞說明時不觸發
      var cell = e.target.closest('th, td');
      if (cell && cell.closest('table') === table) activate(cell);               // 排除巢狀表格裡的格子
    });
    table.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var cell = e.target.closest('th, td');
      if (!cell || cell.closest('table') !== table) return;
      e.preventDefault();                               // 空白鍵預設會捲動頁面，這裡攔下來
      activate(cell);
    });
  }

  /**
   * 判斷表格要不要套用：至少兩欄，而且沒有標 data-no-compare
   * @param {HTMLTableElement} table 表格
   * @returns {boolean} 要套用就回傳 true
   */
  function shouldEnhance(table) {
    if (table.hasAttribute('data-no-compare') || table.classList.contains('ct-on')) return false;
    var first = table.rows[0];
    return !!first && first.cells.length >= 2;
  }

  function init() {
    injectStyle();
    Array.prototype.forEach.call(document.querySelectorAll('table'), function (t) {
      if (shouldEnhance(t)) enhance(t);
    });
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
