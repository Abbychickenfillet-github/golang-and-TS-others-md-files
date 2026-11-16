/* ==========================================================================
   compare-table.js — 可點擊螢光的比較表元件（Abby-notes 共用）

   用法：
     1. 在 <table> 加上 class="compare-table"
        第一列 <thead> 是欄位名稱，每一列的第一格（<th scope="row">）是比較面向
     2. 頁面底部引入：<script src="../../assets/compare-table.js"></script>（路徑依檔案深度調整）

   互動：
     - 點欄位標題：整欄上螢光（藍），再點一次取消
     - 點列標題：整列上螢光（綠），再點一次取消
     - 點一般格子：該格上螢光（黃），同時淡淡標出它所在的列與欄（十字定位）
     - 表格上方自動加一顆「清除螢光」按鈕
     - 鍵盤：Tab 移到格子，按 Enter 或空白鍵等同點擊
   顏色全部引用 note-theme.css 的變數，深色主題也會自動換色
   ========================================================================== */
(function () {
  'use strict';
  if (window.__compareTableInit) return; // 防止同頁重複初始化
  window.__compareTableInit = true;

  /** 注入元件樣式，只注入一次 */
  function injectStyle() {
    var css = [
      '.ct-wrap{overflow-x:auto;margin:12px 0}',
      '.ct-bar{display:flex;gap:10px;align-items:center;margin:6px 0;font-size:.82rem;color:var(--sub)}',
      '.ct-bar button{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:5px 12px;cursor:pointer;color:var(--ink);font-family:inherit;font-size:.82rem}',
      '.ct-bar button:hover{background:var(--soft)}',
      'table.compare-table{border-collapse:collapse;width:100%;min-width:760px}',
      'table.compare-table th,table.compare-table td{border:1px solid var(--line);padding:8px 10px;vertical-align:top;cursor:pointer;transition:background .15s,box-shadow .15s}',
      'table.compare-table thead th{background:var(--soft);position:sticky;top:0;z-index:1}',
      'table.compare-table tbody th{background:var(--soft);white-space:nowrap;text-align:left}',
      'table.compare-table td:hover,table.compare-table th:hover{box-shadow:inset 0 0 0 2px var(--accent)}',
      'table.compare-table .ct-col{background:var(--hl-term)!important}',
      'table.compare-table .ct-row{background:var(--hl-ok)!important}',
      'table.compare-table .ct-cross{background:color-mix(in srgb,var(--hl-core) 40%,var(--card))}',
      'table.compare-table .ct-cell{background:var(--hl-core)!important;font-weight:600}',
      'table.compare-table :focus-visible{outline:2px solid var(--accent);outline-offset:-2px}'
    ].join('\n');
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  /**
   * 取得某一格在表格中的欄位位置（不處理 colspan，比較表不需要合併儲存格）
   * @param {HTMLTableCellElement} cell 格子
   * @returns {number} 從 0 開始的欄位索引
   */
  function colIndex(cell) {
    return Array.prototype.indexOf.call(cell.parentElement.children, cell);
  }

  /**
   * 重新計算十字定位：所有被點亮的格子，它所在的列與欄都淡淡標出
   * @param {HTMLTableElement} table 表格
   */
  function refreshCross(table) {
    var cells = table.querySelectorAll('td, th');
    cells.forEach(function (c) { c.classList.remove('ct-cross'); });
    table.querySelectorAll('.ct-cell').forEach(function (lit) {
      var idx = colIndex(lit);
      lit.parentElement.querySelectorAll('td, th').forEach(function (c) { c.classList.add('ct-cross'); }); // 同一列
      table.querySelectorAll('tr').forEach(function (tr) {                                                  // 同一欄
        var c = tr.children[idx];
        if (c) c.classList.add('ct-cross');
      });
    });
  }

  /**
   * 把一張表格變成可點擊螢光的比較表
   * @param {HTMLTableElement} table 有 class="compare-table" 的表格
   */
  function enhance(table) {
    // 外層包一個可橫向捲動的容器，窄螢幕不會把版面撐破
    var wrap = document.createElement('div');
    wrap.className = 'ct-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);

    var bar = document.createElement('div');
    bar.className = 'ct-bar';
    bar.innerHTML = '<button type="button">清除螢光</button><span>點欄位標題標整欄（藍）、點列標題標整列（綠）、點格子標單格（黃）</span>';
    wrap.parentNode.insertBefore(bar, wrap);
    bar.querySelector('button').addEventListener('click', function () {
      table.querySelectorAll('.ct-col,.ct-row,.ct-cell,.ct-cross').forEach(function (c) {
        c.classList.remove('ct-col', 'ct-row', 'ct-cell', 'ct-cross');
      });
    });

    table.querySelectorAll('th, td').forEach(function (cell) {
      cell.tabIndex = 0; // 讓每一格都能用 Tab 移過去
    });

    /** 處理一次點擊或按鍵 */
    function activate(cell) {
      var inHead = !!cell.closest('thead');
      if (inHead) {                                  // 欄位標題：整欄切換
        var idx = colIndex(cell);
        if (idx === 0) return;                       // 左上角那格不做事
        var on = !cell.classList.contains('ct-col');
        table.querySelectorAll('tr').forEach(function (tr) {
          var c = tr.children[idx];
          if (c) c.classList.toggle('ct-col', on);
        });
      } else if (cell.tagName === 'TH') {            // 列標題：整列切換
        var onRow = !cell.classList.contains('ct-row');
        cell.parentElement.querySelectorAll('th, td').forEach(function (c) { c.classList.toggle('ct-row', onRow); });
      } else {                                       // 一般格子：單格切換
        cell.classList.toggle('ct-cell');
      }
      refreshCross(table);
    }

    table.addEventListener('click', function (e) {
      if (e.target.closest('a, .term')) return;      // 點連結或名詞說明時，不觸發螢光
      var cell = e.target.closest('th, td');
      if (cell && table.contains(cell)) activate(cell);
    });
    table.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var cell = e.target.closest('th, td');
      if (!cell) return;
      e.preventDefault();                            // 空白鍵預設會捲動頁面，這裡攔下來
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
