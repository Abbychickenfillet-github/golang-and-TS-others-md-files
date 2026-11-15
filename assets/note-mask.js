/* ==========================================================================
   note-mask.js — Abby-notes 共用遮罩腳本（單一來源，原生 JS，無任何依賴）
   1. 點 [data-note-action="mask-all"]：所有 mark.hl 加上 masked；點 show-all：全部移除
   2. 點單一 mark.hl（或在上面按 Enter／空白鍵）：切換它自己的 masked
   3. 相容舊頁的 #maskAll／#showAll：載入時把它們轉成新結構（icon 按鈕＋aria-label，有 .quiz 就搬進 .quiz-head）
   4. 事件委派：只在 document 掛監聽器，之後才新增的 mark 也能用
   ========================================================================== */
// 立即執行函式（IIFE）：把變數關在函式裡，避免污染全域；開頭的小括號讓它被當成運算式；
(function () {
  // 嚴格模式：寫錯變數名稱會直接丟錯，而不是默默建立全域變數；
  'use strict';
  // 防止同頁重複初始化：旗標已經是真值就直接結束，後面的程式不會再跑第二次；
  if (window.__noteMaskInit) return;
  // 第一次載入時把旗標設成 true，之後再載入就會被上一行擋掉；
  window.__noteMaskInit = true;

  // 與 notes.js 相同的 ready 工具：DOM 解析完成就立刻執行 fn，還沒完成就等 DOMContentLoaded；
  function ready(fn) {
    // readyState 不是 'loading' 代表 DOM 已可用；
    if (document.readyState !== 'loading') fn();
    // 否則等 DOMContentLoaded 事件再執行；
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // 舊頁按鈕 id 對應到新結構動作名稱的對照表（物件字面量，鍵是 id、值是 data-note-action）；
  var LEGACY_IDS = { maskAll: 'mask-all', showAll: 'show-all' };
  // 兩種動作對應的 icon，按鈕轉換後只顯示這個 emoji；
  var ICONS = { 'mask-all': '🙈', 'show-all': '👀' };
  // 已轉換過的按鈕會被打上這個資料屬性，避免同一顆按鈕被處理兩次；
  var DONE_ATTR = 'data-note-mask-ready';

  // 把所有 mark.hl 一次設成遮住或顯示；on 為 true 加 masked，false 移除；
  function setAll(on) {
    // querySelectorAll 回傳 NodeList，借用 Array.prototype.forEach 逐一處理（舊瀏覽器的 NodeList 沒有 forEach）；
    Array.prototype.forEach.call(document.querySelectorAll('mark.hl'), function (m) {
      // classList.toggle 的第二個參數是「強制開關」：true 一定加上、false 一定移除；
      m.classList.toggle('masked', on);
    });
  }

  // 把一顆舊按鈕轉成新結構：icon 文字、aria-label、type、data-note-action；
  function convertButton(btn, action) {
    // 已經轉換過就跳過，所以腳本即使被呼叫多次也只轉一次；
    if (btn.getAttribute(DONE_ATTR)) return;
    // 取出原本的按鈕文字並去掉前後空白，之後放進 aria-label 讓螢幕閱讀器念得出來；
    var original = btn.textContent.replace(/^\s+|\s+$/g, '');
    // 如果按鈕本來就有 aria-label 就保留它，沒有才用原本文字；
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', original);
    // 按鈕內容只留一個 emoji，textContent 賦值會清掉所有子節點再放入純文字；
    btn.textContent = ICONS[action];
    // type="button" 避免按鈕在表單內被當成送出鍵；
    btn.setAttribute('type', 'button');
    // data-note-action 讓下面的事件委派能認出這顆按鈕；
    btn.setAttribute('data-note-action', action);
    // 打上已轉換標記；
    btn.setAttribute(DONE_ATTR, '1');
  }

  // 把兩顆按鈕搬進 .quiz 的 .quiz-head > .quiz-actions，結構與 React 版 QuizHeader 相同；
  function moveIntoQuizHead(buttons) {
    // 找頁面上第一個 .quiz；
    var quiz = document.querySelector('.quiz');
    // 沒有 .quiz 就不搬，按鈕留在原位；
    if (!quiz) return;
    // 找 .quiz 裡的第一個 h2；
    var h2 = quiz.querySelector('h2');
    // 沒有 h2 也不搬，因為沒有可以對齊的標題；
    if (!h2) return;
    // 看 h2 是不是已經在 .quiz-head 裡（例如頁面本來就是新結構）；
    var head = h2.parentNode;
    // 不是的話，建立一個新的 .quiz-head 包住 h2；
    if (!head.classList || !head.classList.contains('quiz-head')) {
      // 建立 div 並設定類別；
      head = document.createElement('div');
      // className 一次設定整個 class 屬性；
      head.className = 'quiz-head';
      // 把 .quiz-head 插在 h2 原本的位置前面；
      h2.parentNode.insertBefore(head, h2);
      // 再把 h2 移進 .quiz-head（appendChild 對已有父節點的元素等於「搬移」）；
      head.appendChild(h2);
    }
    // 找 .quiz-head 裡已有的 .quiz-actions，沒有就建立；
    var actions = head.querySelector('.quiz-actions');
    // 沒找到時（回傳 null）建立新的；
    if (!actions) {
      // 建立 div 並設定類別；
      actions = document.createElement('div');
      // 設定 class；
      actions.className = 'quiz-actions';
      // 放在 h2 後面（也就是 .quiz-head 的最後）；
      head.appendChild(actions);
    }
    // 搬移前先記下按鈕原本的父層，搬完才能檢查它們是不是空了；
    var parents = buttons.map(function (b) { return b.parentNode; });
    // 依序把兩顆按鈕搬進 .quiz-actions；
    buttons.forEach(function (b) {
      // 同樣是 appendChild 搬移，順序會維持 mask-all 在前、show-all 在後；
      actions.appendChild(b);
    });
    // 原本的 .toolbar 搬空（沒有任何元素子節點，只剩空白文字也算）就在執行時移除，檔案本身不改（R38）；
    parents.forEach(function (p) {
      // 只處理 .toolbar，其他父層（例如普通的 div）一律不動；父層可能因為兩顆按鈕同父而重複出現，移除過的 parentNode 為 null 會被略過；
      if (p && p.classList && p.classList.contains('toolbar') && p.children.length === 0 && p.parentNode) p.parentNode.removeChild(p);
    });
  }

  // 載入時處理舊頁：找 #maskAll／#showAll，轉換內容，必要時搬位置；
  function upgradeLegacy() {
    // 兩顆按鈕缺一就不轉換：只有 #maskAll 的頁面用的是「單鍵開關」設計（自己的行內處理器會改按鈕文字），轉換反而會與它衝突；
    if (!document.getElementById('maskAll') || !document.getElementById('showAll')) return;
    // 收集找到的舊按鈕；
    var found = [];
    // for...in 逐一走過對照表的鍵（'maskAll'、'showAll'）；
    for (var id in LEGACY_IDS) {
      // 只處理物件自己的屬性，略過原型鏈上的；
      if (!Object.prototype.hasOwnProperty.call(LEGACY_IDS, id)) continue;
      // 用 id 找按鈕；
      var btn = document.getElementById(id);
      // 找不到就換下一個；
      if (!btn) continue;
      // 把這顆按鈕轉成新結構；
      convertButton(btn, LEGACY_IDS[id]);
      // 收進陣列，等一下一起搬；
      found.push(btn);
    }
    // 有找到按鈕才需要搬位置；
    if (found.length) moveIntoQuizHead(found);
  }

  // 記錄「事件到達 mark 之前」它的 masked 狀態；用來偵測舊頁行內處理器是否已經切換過（控制者裁示 R5）；
  var snapshot = null;

  // 從事件目標往上找最近的 mark.hl；target 不一定是元素（舊瀏覽器可能是文字節點），所以先檢查 closest 存在；
  function markOf(target) {
    // 沒有 closest 方法就回傳 null；
    if (!target || !target.closest) return null;
    // closest 從自己開始往祖先找第一個符合選擇器的元素，找不到回傳 null；
    return target.closest('mark.hl');
  }

  // 捕獲階段（capture）的監聽器：事件在往下傳遞時先經過 document，此時 mark 上的行內處理器還沒執行；
  function onCapture(e) {
    // 找出事件對應的 mark；
    var m = markOf(e.target);
    // 是 mark 就記下「元素＋目前是否遮住」，不是就清成 null；
    snapshot = m ? { el: m, masked: m.classList.contains('masked') } : null;
  }

  // 切換單一 mark，除非有人在事件傳遞途中已經切過它；回傳是否由本腳本切換；
  function toggleOnce(m) {
    // 取出捕獲階段記下的快照；
    var snap = snapshot;
    // 用完立刻清掉，避免影響下一個事件；
    snapshot = null;
    // 快照是同一個 mark，且現在的狀態與快照不同，代表舊頁行內處理器已經切換過，本腳本就不再切，避免一次點擊切兩次；
    if (snap && snap.el === m && m.classList.contains('masked') !== snap.masked) return false;
    // 沒人切過，由本腳本切換；
    m.classList.toggle('masked');
    // 回報有切換；
    return true;
  }

  // 冒泡階段的 click 監聽器：事件由目標往上傳到 document 時觸發，這是事件委派的核心；
  function onClick(e) {
    // 取得事件目標，並確認它支援 closest；
    var t = e.target;
    // 不支援就直接結束；
    if (!t || !t.closest) return;
    // 先看是不是點在帶 data-note-action 的按鈕上；
    var btn = t.closest('[data-note-action]');
    // 是按鈕就依動作名稱處理；
    if (btn) {
      // 讀出動作名稱；
      var action = btn.getAttribute('data-note-action');
      // mask-all 全部遮起來；
      if (action === 'mask-all') setAll(true);
      // show-all 全部顯示；
      else if (action === 'show-all') setAll(false);
      // 按鈕事件到此為止，不會再往下判斷 mark；
      return;
    }
    // 不是按鈕就看是不是點在 mark.hl 上；
    var m = markOf(t);
    // 是的話切換它（有舊頁行內處理器切過就略過）；
    if (m) toggleOnce(m);
  }

  // 鍵盤支援：mark 若有 tabindex 可被聚焦，按 Enter 或空白鍵也要能切換，與滑鼠點擊的規則一致；
  function onKeydown(e) {
    // 只處理 Enter 與空白鍵（key 值為 ' '）；
    if (e.key !== 'Enter' && e.key !== ' ') return;
    // 找出事件對應的 mark；
    var m = markOf(e.target);
    // 不是 mark 就不處理；
    if (!m) return;
    // 沒被舊處理器切過才由本腳本切換；
    if (toggleOnce(m)) {
      // 阻止空白鍵的預設行為（捲動頁面）；
      e.preventDefault();
    }
  }

  // 在 document 上掛捕獲階段的 click 與 keydown 監聽器，第三個參數 true 代表用捕獲階段；
  document.addEventListener('click', onCapture, true);
  // keydown 也要先記快照；
  document.addEventListener('keydown', onCapture, true);
  // 掛冒泡階段的 click 監聽器（事件委派）；
  document.addEventListener('click', onClick);
  // 掛冒泡階段的 keydown 監聽器；
  document.addEventListener('keydown', onKeydown);

  // DOM 就緒後處理舊頁的按鈕轉換與搬移；
  ready(upgradeLegacy);
})();
