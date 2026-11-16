/* ==========================================================================
   term-cards.js — 單字卡片元件（Abby-notes 共用）

   設計參考：Abby 提供的 Step 01–04 資訊圖卡範本
     - 大量留白：文字只佔卡片左側，右側留給放大的序號
     - 層次靠大小對比：序號特別大、顏色淡，當視覺錨點；內文小字灰色
     - 單一主色：標題與序號都用頁面的 --accent，不用多種顏色
     - 卡片形狀一致、間距一致，靠重複形成節奏

   用法：
     <div class="term-cards">
       <article class="term-card">
         <h4 class="tc-term">MAC</h4>                     ← 單字（必填）
         <p class="tc-full">Message Authentication Code</p> ← 全名或中文名（選填）
         <p class="tc-desc">一句白話解釋…</p>              ← 說明（選填，可以有多段）
       </article>
       …
     </div>
     序號（01、02…）由腳本依順序自動加上，不用手寫

   互動：
     - 點卡片（或 Tab 移到卡片後按 Enter）：卡片從原位置放大到畫面中央，約 1.8 倍，像投影片轉場
     - 再點一次、點背景、或按 Esc：縮回原位置
     - 使用者系統設定「減少動態效果」時，直接顯示放大結果，不播動畫

   載入：assets/notes.js 會自動載入；沒有引入 notes.js 的頁面在 </body> 前自己加 <script src>
   ========================================================================== */
(function () {
  'use strict';
  if (window.__termCardsInit) return; // 同一頁可能被載入兩次，只初始化一次
  window.__termCardsInit = true;

  var ZOOM = 1.8;        // 目標放大倍率
  var DURATION = 420;    // 轉場毫秒數

  /** 注入元件樣式，只注入一次 */
  function injectStyle() {
    var css = [
      // 寬螢幕自動排成多欄，每張卡至少 280px，窄螢幕自然退成一欄
      '.term-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;margin:18px 0}',
      // 卡片：底色用頁面變數，不寫死白色；右側留白給大序號
      '.term-card{position:relative;overflow:hidden;background:var(--card,#fff);border:1px solid var(--line,#dde);border-radius:14px;' +
        'padding:22px 96px 64px 22px;min-height:170px;cursor:zoom-in;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:box-shadow .2s,transform .2s}',
      '.term-card:hover{box-shadow:0 8px 22px rgba(0,0,0,.08);transform:translateY(-2px)}',
      '.term-card:focus-visible{outline:2px solid var(--accent,#468);outline-offset:3px}',
      // 左側一條斜切的主色色塊，對應範本的斜向摺角
      '.term-card::before{content:"";position:absolute;right:-30px;top:0;bottom:0;width:120px;background:var(--accent,#468);opacity:.08;transform:skewX(-14deg)}',
      // 大序號：放大、變淡、靠右下，部分超出卡片被裁掉，當視覺錨點
      '.term-card .tc-num{position:absolute;right:10px;bottom:-14px;font-size:84px;font-weight:800;line-height:1;color:var(--accent,#468);opacity:.22;letter-spacing:-2px;pointer-events:none}',
      '.term-card .tc-term{margin:0 0 4px;font-size:1.15rem;color:var(--accent,#468);font-weight:700}',
      '.term-card .tc-full{margin:0 0 10px;font-size:.82rem;color:var(--muted,var(--sub,#667))}',
      '.term-card .tc-desc{margin:6px 0 0;font-size:.9rem;line-height:1.65;color:var(--ink,#234)}',
      // 放大舞台：蓋住整個視窗，背景變暗
      '.tc-stage{position:fixed;inset:0;z-index:1000;background:rgba(15,20,30,0);transition:background ' + DURATION + 'ms ease;cursor:zoom-out}',
      '.tc-stage.show{background:rgba(15,20,30,.45)}',
      '.tc-stage .term-card{position:fixed;margin:0;cursor:zoom-out;transform-origin:top left;transition:transform ' + DURATION + 'ms cubic-bezier(.2,.7,.2,1),box-shadow ' + DURATION + 'ms}',
      '.tc-stage.show .term-card{box-shadow:0 24px 60px rgba(0,0,0,.25)}'
    ].join('\n');
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  /**
   * 計算卡片放大後要移到哪裡：放大 ZOOM 倍並置中，但不能超出視窗
   * @param {DOMRect} r 卡片目前在畫面上的位置與大小
   * @returns {{x:number,y:number,s:number}} 位移量與實際倍率
   */
  function targetOf(r) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var s = Math.min(ZOOM, (vw * 0.92) / r.width, (vh * 0.88) / r.height); // 太大就縮到放得下
    var x = (vw - r.width * s) / 2 - r.left;                               // 放大後的左上角對齊到置中位置
    var y = (vh - r.height * s) / 2 - r.top;
    return { x: x, y: y, s: s };
  }

  /**
   * 把一張卡片放大到畫面中央（FLIP 做法：先放在原位置，再用 transform 動畫移到終點）
   * @param {HTMLElement} card 被點的卡片
   */
  function open(card) {
    var r = card.getBoundingClientRect();
    var stage = document.createElement('div');
    stage.className = 'tc-stage';
    var clone = card.cloneNode(true);           // 複製一份放到舞台上，原卡片留在原位不動，版面不會跳
    clone.removeAttribute('tabindex');
    clone.style.left = r.left + 'px';
    clone.style.top = r.top + 'px';
    clone.style.width = r.width + 'px';
    clone.style.height = r.height + 'px';
    stage.appendChild(clone);
    document.body.appendChild(stage);
    card.style.visibility = 'hidden';           // 放大期間把原卡片藏起來，看起來像同一張卡飛出去

    var t = targetOf(r);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { stage.style.transition = clone.style.transition = 'none'; }
    // 等瀏覽器先畫出原位置，下一個畫格再改 transform，transition 才會播
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        stage.classList.add('show');
        clone.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px) scale(' + t.s + ')';
      });
    });

    /** 縮回原位置，動畫結束後移除舞台並把原卡片顯示回來 */
    function close() {
      stage.classList.remove('show');
      clone.style.transform = 'none';
      document.removeEventListener('keydown', onKey);
      setTimeout(function () {
        stage.remove();
        card.style.visibility = '';
        card.focus({ preventScroll: true });    // 焦點回到原卡片，鍵盤使用者不會迷路
      }, reduce ? 0 : DURATION);
    }
    /** Esc 關閉 */
    function onKey(e) { if (e.key === 'Escape') close(); }
    stage.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
  }

  /**
   * 初始化一組卡片：補上序號、讓卡片可以用鍵盤操作、綁定點擊放大
   * @param {HTMLElement} group class="term-cards" 的容器
   */
  function enhance(group) {
    Array.prototype.forEach.call(group.querySelectorAll('.term-card'), function (card, i) {
      if (!card.querySelector('.tc-num')) {
        var num = document.createElement('span');
        num.className = 'tc-num';
        num.textContent = String(i + 1).padStart(2, '0'); // 01、02…，補零讓位數一致
        card.appendChild(num);
      }
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.addEventListener('click', function (e) {
        if (e.target.closest('a, .term')) return;       // 點連結或名詞說明時不放大
        open(card);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); }
      });
    });
  }

  function init() {
    injectStyle();
    Array.prototype.forEach.call(document.querySelectorAll('.term-cards'), enhance);
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
