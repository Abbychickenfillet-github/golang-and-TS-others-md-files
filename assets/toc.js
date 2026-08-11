(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var container = document.querySelector('.post-content') ||
      document.querySelector('article') ||
      document.querySelector('.col-xl-8.offset-xl-2, [class*="col-xl-8"]');
    if (!container) return;

    var headings = Array.prototype.slice.call(container.querySelectorAll('h2'));
    if (headings.length < 2) return;

    function slugify(text) {
      return text.trim().toLowerCase()
        .replace(/[^一-龥a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    var used = {};
    headings.forEach(function (h) {
      if (!h.id) {
        var base = slugify(h.textContent) || 'section';
        var id = base;
        var n = 1;
        while (used[id]) { id = base + '-' + (++n); }
        used[id] = true;
        h.id = id;
      } else {
        used[h.id] = true;
      }
    });

    var toc = document.createElement('nav');
    toc.className = 'auto-toc';
    var title = document.createElement('div');
    title.className = 'auto-toc-title';
    title.textContent = '大綱';
    toc.appendChild(title);
    var ul = document.createElement('ul');
    headings.forEach(function (h) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      ul.appendChild(li);
    });
    toc.appendChild(ul);

    container.insertBefore(toc, container.firstChild);
  });
})();
