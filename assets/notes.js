/* ==========================================================================
   notes.js — Abby-notes 共用腳本（單一來源）
   1. 自動產生巢狀大綱（h2 + h3），每個標題自動補 id
   2. 統一把大綱放到左側 sidepanel（不管原本是 article / .wrap / 什麼都沒有）
   3. .term 名詞：滑過預覽（CSS）、點擊釘成可拖曳說明卡；有 data-link 的詞滑過會浮出可點連結的卡片
   4. 「各對話來源」「追加回合」（Gemini 對話備查）預設收合
   ========================================================================== */
(function () {
  'use strict';
  if (window.__notesInit) return;          // 防止同頁重複初始化
  window.__notesInit = true;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* ---------- 工具：把標題文字變成 id ---------- */
  function slug(t) {
    return t.trim().toLowerCase()
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^一-鿿a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sec';
  }

  /* ---------- 1. 從內容區產生大綱 ---------- */
  function buildTOC(main) {
    var hs = Array.prototype.filter.call(main.querySelectorAll('h2, h3'), function (h) {
      return !h.closest('nav.toc, .auto-toc, .tipcard') && h.textContent.trim();
    });
    if (hs.length < 2) return null;        // 太短就不做大綱

    var used = Object.create(null);
    hs.forEach(function (h) {
      if (!h.id) {
        var b = slug(h.textContent), id = b, n = 1;
        while (used[id]) id = b + '-' + (++n);
        h.id = id;
      }
      used[h.id] = true;
    });

    function label(h) {                     // 標題後面接整條網址時截短顯示
      var t = h.textContent.replace(/\s*[—–-]\s*https?:\/\/\S+\s*$/, '').trim();
      return t.length > 40 ? t.slice(0, 38) + '…' : t;
    }

    var nav = document.createElement('nav');
    nav.className = 'toc';
    var head = document.createElement('div');
    head.className = 'toc-h';
    head.appendChild(document.createTextNode('本篇大綱'));
    var hint = document.createElement('span');
    hint.textContent = '　點標題直接跳';
    head.appendChild(hint);
    nav.appendChild(head);

    var root = document.createElement('ol'), sub = null;
    hs.forEach(function (h) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = label(h);
      a.title = h.textContent.trim();
      li.appendChild(a);
      if (h.tagName === 'H2') { root.appendChild(li); sub = null; }
      else {
        if (!sub) {
          var host = root.lastElementChild;
          if (!host) { host = document.createElement('li'); root.appendChild(host); }
          sub = document.createElement('ol');
          host.appendChild(sub);
        }
        sub.appendChild(li);
      }
    });
    nav.appendChild(root);
    return nav;
  }

  /* ---------- 2. 統一版面：左側大綱 + 右側內文 ---------- */
  function layout() {
    if (document.querySelector('.notes-grid')) return;

    // 這些是頁面外框，要留在格線外面維持滿版
    var CHROME = 'header, footer, script, style, link, nav.toc, .auto-toc, .tipbar, .bar, .notes-grid';

    var art = document.querySelector('article');
    var main, host;

    if (art) {
      main = art;                                  // 本來就有 article，直接當內容區
      host = art.parentNode;
    } else {
      host = document.querySelector('.post-content') ||
             document.querySelector('.wrap') ||
             document.body;
      // body 底下若只有單一包裝元素，往下鑽一層，才不會把 header 一起捲進格線
      if (host === document.body) {
        var only = Array.prototype.filter.call(host.children, function (c) {
          return !/^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(c.tagName);
        });
        if (only.length === 1 && /^(DIV|MAIN|SECTION)$/.test(only[0].tagName)) host = only[0];
      }
      var kids = Array.prototype.slice.call(host.childNodes).filter(function (n) {
        return !(n.nodeType === 1 && n.matches(CHROME));
      });
      if (!kids.length) return;
      main = document.createElement('div');
      main.className = 'notes-main';
      host.insertBefore(main, kids[0]);
      kids.forEach(function (n) { main.appendChild(n); });
    }

    // 已經手寫好的大綱優先沿用，沒有才自動產生
    var nav = document.querySelector('nav.toc') || buildTOC(main);
    if (!nav) return;

    var grid = document.createElement('div');
    grid.className = 'notes-grid';
    host.insertBefore(grid, main);
    grid.appendChild(nav);
    grid.appendChild(main);
  }

  /* ---------- 3. 名詞說明卡 ---------- */
  function initTerms() {
    var terms = document.querySelectorAll('.term');
    if (!terms.length) return;
    var z = 1000, open = new Map(), bar = null;

    function ensureBar() {
      if (bar) return bar;
      bar = document.createElement('div');
      bar.className = 'tipbar';
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = '關閉所有說明卡 (Esc)';
      b.addEventListener('click', closeAll);
      bar.appendChild(b);
      document.body.appendChild(bar);
      return bar;
    }
    function syncBar() { ensureBar().style.display = open.size ? 'block' : 'none'; }

    function clamp(card) {
      var r = card.getBoundingClientRect();
      card.style.left = Math.min(Math.max(8, r.left), innerWidth - r.width - 8) + 'px';
      card.style.top = Math.min(Math.max(8, r.top), innerHeight - r.height - 8) + 'px';
    }
    function closeTip(el) {
      var c = open.get(el);
      if (!c) return;
      c.remove(); el.classList.remove('pinned'); open.delete(el); syncBar();
    }
    function closeAll() { Array.from(open.keys()).forEach(closeTip); }
    window.closeAllTips = closeAll;

    function pin(el) {
      if (open.has(el)) {
        var c0 = open.get(el);
        c0.style.zIndex = ++z;
        c0.classList.add('flash');
        setTimeout(function () { c0.classList.remove('flash'); }, 450);
        return;
      }
      var r = el.getBoundingClientRect();
      var card = document.createElement('div');
      card.className = 'tipcard';
      card.style.zIndex = ++z;

      var head = document.createElement('div');
      head.className = 'tipcard-h';
      var title = document.createElement('span');
      title.className = 'tipcard-t';
      title.textContent = el.textContent;
      var x = document.createElement('button');
      x.className = 'tipcard-x'; x.type = 'button'; x.textContent = '✕'; x.title = '關閉';
      x.addEventListener('click', function () { closeTip(el); });
      head.appendChild(title); head.appendChild(x);

      var body = document.createElement('div');
      body.className = 'tipcard-b';
      body.textContent = el.dataset.def || '（這個詞還沒寫解釋）';
      if (el.dataset.link) {   // 有 data-link 的詞：釘住的卡片裡也放連結
        var la = document.createElement('a');
        la.className = 'tiphover-link';
        la.href = el.dataset.link;
        la.textContent = el.dataset.linkText || '前往相關說明';
        body.appendChild(document.createElement('br'));
        body.appendChild(la);
      }

      card.appendChild(head); card.appendChild(body);
      document.body.appendChild(card);
      card.style.left = (r.left + r.width / 2 - card.offsetWidth / 2) + 'px';
      card.style.top = (r.bottom + 10) + 'px';
      clamp(card);
      card.addEventListener('pointerdown', function () { card.style.zIndex = ++z; });

      var ox = 0, oy = 0;
      head.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.tipcard-x')) return;
        var rr = card.getBoundingClientRect();
        ox = e.clientX - rr.left; oy = e.clientY - rr.top;
        card.style.zIndex = ++z;
        head.setPointerCapture(e.pointerId);
        function move(ev) {
          card.style.left = (ev.clientX - ox) + 'px';
          card.style.top = (ev.clientY - oy) + 'px';
        }
        function up(ev) {
          try { head.releasePointerCapture(ev.pointerId); } catch (_) {}
          head.removeEventListener('pointermove', move);
          head.removeEventListener('pointerup', up);
          clamp(card);
        }
        head.addEventListener('pointermove', move);
        head.addEventListener('pointerup', up);
        e.preventDefault();
      });

      el.classList.add('pinned');
      open.set(el, card);
      syncBar();
    }

    terms.forEach(function (el) {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.matches('[data-link], [data-float]')) el.title = '點一下可釘住並拖曳';   // 浮動卡片的詞不再疊一個原生提示
      el.addEventListener('click', function (e) {
        e.stopPropagation();          // 不要順便觸發外層 li.pt 的隱藏重點
        e.preventDefault();
        pin(el);
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pin(el); }
      });
    });

    addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
    addEventListener('resize', function () { open.forEach(clamp); });
  }


  /* ---------- 3b. .term[data-link]：滑過浮出「可以點連結」的說明卡 ----------
     語法：<span class="term" data-def="說明" data-link="網址" data-link-text="連結文字">詞</span>
           <span class="term" data-def="說明" data-float>詞</span>   ← 只要浮動卡片、不帶連結
     .term 原本的 CSS 提示框是 ::after，不能放連結，也會被 overflow:hidden 的容器切掉，所以有 data-link
     或 data-float 的詞改由這張真正的元素卡片負責（外觀沿用 .tipcard，掛在 body 上不會被切）。
     用事件委派，之後才動態產生的 .term 也有效。兩個屬性都沒有的詞完全不受影響。
     滑鼠從詞移到卡片上不會消失；離開 180ms 後才收起；Esc、點擊詞、捲動都會收起。 */
  function initTermLinks() {
    var card = null, cur = null, timer = null;

    function termOf(n) { return n && n.closest ? n.closest('.term[data-link], .term[data-float]') : null; }
    function inCard(n) { return !!(card && n && card.contains(n)); }
    function hide() {
      clearTimeout(timer);
      if (card) { card.remove(); card = null; cur = null; }
    }
    function later() { clearTimeout(timer); timer = setTimeout(hide, 180); }

    function show(el) {
      clearTimeout(timer);
      if (cur === el && card) return;
      hide();
      var c = document.createElement('div');
      c.className = 'tipcard tiphover';
      c.setAttribute('role', 'tooltip');
      var b = document.createElement('div');
      b.className = 'tipcard-b';
      var t = document.createElement('b');
      t.className = 'tiphover-t';
      t.textContent = el.textContent;
      b.appendChild(t);
      b.appendChild(document.createElement('br'));
      b.appendChild(document.createTextNode(el.dataset.def || ''));
      if (el.dataset.link) {
        var a = document.createElement('a');
        a.className = 'tiphover-link';
        a.href = el.dataset.link;
        a.textContent = el.dataset.linkText || '前往相關說明';
        b.appendChild(document.createElement('br'));
        b.appendChild(a);
      }
      c.appendChild(b);
      document.body.appendChild(c);

      var r = el.getBoundingClientRect();
      var cw = c.offsetWidth, ch = c.offsetHeight;
      var left = Math.min(Math.max(8, r.left + r.width / 2 - cw / 2), innerWidth - cw - 8);
      var top = r.bottom + 6;
      if (top + ch > innerHeight - 8) top = Math.max(8, r.top - ch - 6);   // 下方放不下就翻到上方
      c.style.left = left + 'px';
      c.style.top = top + 'px';
      card = c; cur = el;
    }

    document.addEventListener('mouseover', function (e) {
      var t = termOf(e.target);
      if (t) show(t);
      else if (inCard(e.target)) clearTimeout(timer);
    });
    document.addEventListener('mouseout', function (e) {
      if (!termOf(e.target) && !inCard(e.target)) return;
      var to = e.relatedTarget;
      if (inCard(to) || (cur && to && cur.contains(to))) return;
      later();
    });
    document.addEventListener('focusin', function (e) {
      var t = termOf(e.target);
      if (t) show(t);
    });
    document.addEventListener('focusout', function (e) {
      if (termOf(e.target) && !inCard(e.relatedTarget)) later();
    });
    document.addEventListener('click', function (e) { if (termOf(e.target)) hide(); }, true);   // 捕獲階段：釘住邏輯會 stopPropagation
    addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    addEventListener('scroll', hide, true);
  }

  /* ---------- 4. 詞彙提示 .tip-glossary：整頁所有出現的詞都變成 hover 說明 ----------
     語法（.md 與獨立 .html 通用）：
       <div class="tip-glossary" data-term="DNS" data-text="Domain Name System…"></div>
     Jekyll 那邊 my-head-extra.html 已有同名機制，這裡是給獨立 .html 用的，兩邊不會重複執行 */
  function initGlossary() {
    if (document.querySelector('script[data-glossary-handled]')) return;
    var gl = Array.prototype.slice.call(document.querySelectorAll('.tip-glossary[data-term]'));
    if (!gl.length) return;
    var host = document.querySelector('main, article, .notes-main, .wrap') || document.body;

    gl.forEach(function (g) {
      var term = g.getAttribute('data-term');
      var text = g.getAttribute('data-text') || g.getAttribute('data-tip');
      if (!term || !text) return;
      // 先把整頁的文字節點收集起來，再一次換，避免邊走邊改造成無窮迴圈
      var walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, null);
      var nodes = [], n;
      while ((n = walker.nextNode())) {
        if (n.nodeValue.indexOf(term) === -1) continue;
        var pe = n.parentElement;
        if (!pe) continue;
        // 程式碼區塊、已經是提示的、大綱、說明卡裡面都不要動
        if (pe.closest('script, style, pre, code, .tip-glossary, .term, .tipcard, nav.toc, .auto-toc')) continue;
        nodes.push(n);
      }
      nodes.forEach(function (node) {
        var parts = node.nodeValue.split(term);
        var frag = document.createDocumentFragment();
        parts.forEach(function (part, i) {
          if (i > 0) {
            var sp = document.createElement('span');
            sp.className = 'term';
            sp.setAttribute('data-def', text);
            sp.setAttribute('tabindex', '0');
            sp.textContent = term;
            frag.appendChild(sp);
          }
          if (part) frag.appendChild(document.createTextNode(part));
        });
        node.parentNode.replaceChild(frag, node);
      });
    });
  }

  /* ---------- 5. 捲動時高亮目前所在章節 ---------- */
  function initScrollSpy() {
    var nav = document.querySelector('nav.toc');
    if (!nav || !('IntersectionObserver' in window)) return;
    var map = new Map();
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) {
      var t = document.getElementById(a.getAttribute('href').slice(1));
      if (t) map.set(t, a);
    });
    if (!map.size) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = map.get(e.target);
        if (a) a.classList.toggle('here', e.isIntersecting);
      });
    }, { rootMargin: '-70px 0px -72% 0px' });
    map.forEach(function (_, t) { io.observe(t); });
  }

  /* ---------- 6. Gemini 對話區塊預設收合 ----------
     「各對話來源」「追加回合」只是對話原文備查，正確內容都已整理進正文，所以預設收合。
     做法：標題移進 <summary>（id 不變，大綱連結照常運作），標題之後、到下一個同級或更高級標題
     之前的同層內容放進 <details class="fold">。外層已收合時，裡面的小標題不再多包一層。 */
  function initFold() {
    var main = document.querySelector('.notes-main') || document.querySelector('article') ||
               document.querySelector('.post-content');
    if (!main) return;
    var RE = /^(各對話來源|對話來源|追加回合)/;
    var level = function (el) { return +el.tagName.charAt(1); };

    Array.prototype.slice.call(main.querySelectorAll('h2, h3, h4')).forEach(function (h) {
      if (!RE.test(h.textContent.trim()) || h.closest('details.fold')) return;
      var rest = [], n = h.nextSibling;
      while (n && !(n.nodeType === 1 && /^H[1-6]$/.test(n.tagName) && level(n) <= level(h))) {
        rest.push(n); n = n.nextSibling;
      }
      var d = document.createElement('details'), s = document.createElement('summary');
      d.className = 'fold';
      h.parentNode.insertBefore(d, h);
      s.appendChild(h);
      d.appendChild(s);
      rest.forEach(function (x) { d.appendChild(x); });
    });

    // 目標標題在收合區塊裡時（點大綱連結、或網址帶 #hash），先展開再跳過去
    function reveal(id) {
      var t = id && document.getElementById(id);
      for (var p = t && t.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
      return t;
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('nav.toc a[href^="#"]');
      if (a) reveal(decodeURIComponent(a.getAttribute('href').slice(1)));
    });
    var t0 = location.hash && reveal(decodeURIComponent(location.hash.slice(1)));
    if (t0) t0.scrollIntoView();
  }

  ready(function () { layout(); initFold(); initGlossary(); initTerms(); initTermLinks(); initScrollSpy(); });
})();
