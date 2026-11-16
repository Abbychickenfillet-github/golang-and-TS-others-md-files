/* ==========================================================================
   compare-table.js — 可點擊標示的比較表元件（Abby-notes 共用）

   設計參考：Excel「整列標示」技巧（條件式格式公式 =CELL("row")=ROW()，
   點到哪一格，就把那一格所在的整列標出來），配色只用單一主色。

   用法：
     1. <table class="compare-table">，第一列放在 <thead>（欄位名稱），
        每一列的第一格用 <th scope="row">（比較面向）
     2. 頁面底部引入：<script src="../../assets/compare-table.js"></script>（路徑依檔案深度調整）

   互動（全部用同一個顏色）：
     - 點任一格（或列標題）：標出那一整列；同一時間只標一列，點同一列再點一次取消
     - 點欄位標題：標出那一整欄，再點一次取消
     - 鍵盤：Tab 移到格子，按 Enter 或空白鍵等同點擊
   顏色引用 note-theme.css 的 --accent，深色主題也會自動換色
   ========================================================================== */
(function () {
  'use strict';
  if (window.__compareTableInit) return; // 防止同頁重複初始化
  window.__compareTableInit = true;

  /** 注入元件樣式，只注入一次 */
  function injectStyle() {
    var css = [
      // 只有一個標示色：主色和卡片底色混出來的淡色；srgb 混色，避免 oklch 混色時色相繞到別的顏色
      'table.compare-table{--ct-mark:color-mix(in srgb,var(--accent) 22%,var(--card));border-collapse:collapse;width:100%}',
      '.ct-wrap{overflow-x:auto;margin:12px 0}',
      'table.compare-table th,table.compare-table td{border-bottom:1px solid var(--line);padding:9px 12px;vertical-align:top;cursor:pointer;transition:background .15s}',
      'table.compare-table thead th{background:var(--soft);border-bottom:2px solid var(--accent);text-align:left;white-space:nowrap}',
      'table.compare-table tbody th{text-align:left;white-space:nowrap;font-weight:600}',
      'table.compare-table tbody tr:hover>*{background:color-mix(in srgb,var(--accent) 6%,var(--card))}',
      'table.compare-table .ct-on{background:var(--ct-mark)!important}',
      'table.compare-table tr.ct-row-on>th[scope=row]{box-shadow:inset 3px 0 0 var(--accent)}', // 標示中的那列，左邊一條主色細線
      'table.compare-table :focus-visible{outline:2px solid var(--accent);outline-offset:-2px}'
    ].join('\n');
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  /**
   * 取得某一格在該列中的位置（比較表不使用合併儲存格）
   * @param {HTMLTableCellElement} cell 格子
   * @returns {number} 從 0 開始的欄位索引
   */
  function colIndex(cell) {
    return Array.prototype.indexOf.call(cell.parentElement.children, cell);
  }

  /**
   * 把一張表格變成可點擊標示的比較表
   * @param {HTMLTableElement} table 有 class="compare-table" 的表格
   */
  function enhance(table) {
    var wrap = document.createElement('div'); // 外層可橫向捲動，窄螢幕不撐破版面
    wrap.className = 'ct-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);

    table.querySelectorAll('th, td').forEach(function (cell) { cell.tabIndex = 0; });

    /** 清掉整張表的標示 */
    function clearRows() {
      table.querySelectorAll('tr.ct-row-on').forEach(function (tr) {
        tr.classList.remove('ct-row-on');
        Array.prototype.forEach.call(tr.children, function (c) { c.classList.remove('ct-on'); });
      });
    }

    /** 處理一次點擊或按鍵 */
    function activate(cell) {
      if (cell.closest('thead')) {                        // 欄位標題：整欄切換
        var idx = colIndex(cell);
        if (idx === 0) return;                            // 左上角那格不做事
        var on = !cell.classList.contains('ct-col-on');
        cell.classList.toggle('ct-col-on', on);
        table.querySelectorAll('tr').forEach(function (tr) {
          var c = tr.children[idx];
          if (c) c.classList.toggle('ct-on', on || tr.classList.contains('ct-row-on'));
        });
        return;
      }
      var tr = cell.parentElement;                        // 其他格子：整列標示（同一時間只有一列）
      var wasOn = tr.classList.contains('ct-row-on');
      clearRows();
      if (!wasOn) {
        tr.classList.add('ct-row-on');
        Array.prototype.forEach.call(tr.children, function (c) { c.classList.add('ct-on'); });
      }
      // 清掉整列之後，把仍在標示中的整欄補回來
      table.querySelectorAll('thead th.ct-col-on').forEach(function (h) {
        var i = colIndex(h);
        table.querySelectorAll('tr').forEach(function (r) { if (r.children[i]) r.children[i].classList.add('ct-on'); });
      });
    }

    table.addEventListener('click', function (e) {
      if (e.target.closest('a, .term')) return;           // 點連結或名詞說明時不觸發
      var cell = e.target.closest('th, td');
      if (cell && table.contains(cell)) activate(cell);
    });
    table.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var cell = e.target.closest('th, td');
      if (!cell) return;
      e.preventDefault();                                 // 空白鍵預設會捲動頁面，這裡攔下來
      activate(cell);
    });
  }

  function init() {
    injectStyle();
    document.querySelectorAll('table.compare-table').forEach(enhance);
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
