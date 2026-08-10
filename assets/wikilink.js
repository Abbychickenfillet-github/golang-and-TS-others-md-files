(function () {
  var scriptTag = document.currentScript;
  var root = (scriptTag && scriptTag.getAttribute('data-root')) || './';

  var style = document.createElement('style');
  style.textContent = '.wikilink{color:#4f46e5;text-decoration:underline dotted;text-underline-offset:2px;}';
  document.head.appendChild(style);

  fetch(root + 'assets/wikilink-index.json')
    .then(function (r) { return r.json(); })
    .then(function (index) {
      var re = /\[\[([^\[\]]+)\]\]/g;

      function resolveTitle(raw) {
        var t = raw.split('|')[0].trim();
        var parts = t.split('/');
        return parts[parts.length - 1].trim();
      }

      function walk(node) {
        if (node.nodeType === 3) {
          var text = node.nodeValue;
          if (text.indexOf('[[') === -1) return;
          re.lastIndex = 0;
          var matches = [];
          var m;
          while ((m = re.exec(text))) { matches.push(m); }
          if (!matches.length) return;

          var frag = document.createDocumentFragment();
          var last = 0;
          matches.forEach(function (m) {
            var full = m[0];
            var title = resolveTitle(m[1]);
            if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
            var url = index[title];
            if (url) {
              var a = document.createElement('a');
              a.href = root + url;
              a.textContent = full;
              a.className = 'wikilink';
              frag.appendChild(a);
            } else {
              frag.appendChild(document.createTextNode(full));
            }
            last = m.index + full.length;
          });
          if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
          node.parentNode.replaceChild(frag, node);
        } else if (node.nodeType === 1 && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE' && node.nodeName !== 'A') {
          Array.prototype.slice.call(node.childNodes).forEach(walk);
        }
      }
      walk(document.body);
    })
    .catch(function (e) { console.warn('wikilink index load failed', e); });
})();
