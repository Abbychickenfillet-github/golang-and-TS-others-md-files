/* ==========================================================================
   notes.js — Abby-notes 共用腳本（單一來源）
   1. 自動產生巢狀大綱（h2 + h3），每個標題自動補 id
   2. .term 名詞：滑過預覽（CSS）、點擊釘成可拖曳說明卡
   ========================================================================== */
(function () {
  'use strict';
  if (window.__notesInit) return;   // 防止重複初始化（同一頁載入兩次時）
  window.__notesInit = true;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* ---------------- 1. 自動大綱 ---------------- */
  function buildTOC() {
    var box = document.querySelector('article') ||
              document.querySelector('.post-content') ||
              document.querySelector('.wrap');
    if (!box) return;
    if (box.querySelector(':scope > nav.toc, :scope > .auto-toc')) return;  // 已有大綱就不重複

    var hs = Array.prototype.filter.call(box.querySelectorAll('h2, h3'), function (h) {
      return h.closest('nav.toc, .auto-toc, .tipcard') === null && h.textContent.trim();
    });
    if (hs.length < 2) return;                                             // 太短不做大綱

    function slug(t) {
      return t.trim().toLowerCase()
        .replace(/https?:\/\/\S+/g, '')
        .replace(/[^一-鿿a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'sec';
    }
    var used = Object.create(null);
    hs.forEach(function (h) {
      if (!h.id) {
        var b = slug(h.textContent), id = b, n = 1;
        while (used[id]) id = b + '-' + (++n);
        h.id = id;
      }
      used[h.id] = true;
    });

    // 標題文字過長時（例如後面接一整條網址）截短顯示
    function label(h) {
      var t = h.textContent.replace(/\s*—\s*https?:\/\/\S+\s*$/, '').trim();
      return t.length > 42 ? t.slice(0, 40) + '…' : t;
    }

    var nav = document.createElement('nav');
    nav.className = 'toc';
    var head = document.createElement('div');
    head.className = 'toc-h';
    head.appendChild(document.createTextNode('本篇大綱　'));
    var hint = document.createElement('span');
    hint.textContent = '點標題直接跳';
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
      if (h.tagName === 'H2') {
        root.appendChild(li);
        sub = null;
      } else {
        if (!sub) {
          sub = document.createElement('ol');
          (root.lastElementChild || root.appendChild(document.createElement('li'))).appendChild(sub);
        }
        sub.appendChild(li);
      }
    });
    nav.appendChild(root);
    box.insertBefore(nav, box.firstChild);
  }

  /* ---------------- 2. 名詞說明卡 ---------------- */
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
        e.stopPropagation();   // 不要順便觸發外層 li.pt 的隱藏重點
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

  ready(function () { buildTOC(); initTerms(); });
})();
