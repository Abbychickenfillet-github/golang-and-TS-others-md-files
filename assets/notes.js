/* ==========================================================================
   notes.js — Abby-notes 共用腳本（單一來源）
   1. 自動產生巢狀大綱（h2 + h3），每個標題自動補 id
   2. 統一把大綱放到左側 sidepanel（不管原本是 article / .wrap / 什麼都沒有）
   3. .term 名詞：滑過預覽（CSS）、點擊釘成可拖曳說明卡
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
      el.title = '點一下可釘住並拖曳';
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

  /* ---------- 4. 捲動時高亮目前所在章節 ---------- */
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

  ready(function () { layout(); initTerms(); initScrollSpy(); });
})();
