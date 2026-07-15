#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Convert a Gemini topic-note .md into a beautiful, self-contained .html.
Features: highlightr mark colors, click-to-hide marks (self-testing),
highlight.js code highlighting (graceful fallback).
Usage: python3 md2html.py <path-to-md>  (writes .html next to it)
"""
import sys, re, os
import markdown

def split_frontmatter(text):
    m = re.match(r'^---\n(.*?)\n---\n(.*)$', text, re.S)
    if not m:
        return {}, text
    fm_raw, body = m.group(1), m.group(2)
    fm = {}
    key = None
    for line in fm_raw.split('\n'):
        if re.match(r'^\s*-\s', line):
            fm.setdefault(key, [])
            if isinstance(fm[key], list):
                fm[key].append(line.strip()[1:].strip())
        elif ':' in line:
            k, v = line.split(':', 1)
            key = k.strip(); v = v.strip()
            if v == '':
                fm[key] = []
            elif v.startswith('[') and v.endswith(']'):
                fm[key] = [x.strip() for x in v[1:-1].split(',') if x.strip()]
            else:
                fm[key] = v
    return fm, body

def convert(path):
    with open(path, encoding='utf-8') as f:
        text = f.read()
    fm, body = split_frontmatter(text)
    def mark_repl(m):
        color = m.group(1); inner = m.group(2)
        hexc = color if color.startswith('#') else '#' + color
        hexc = hexc[:7]
        return f'<mark class="hl tog" style="background:{hexc};">{inner}</mark>'
    body = re.sub(r'<mark style="background:\s*([#0-9A-Fa-f]+)[A-Fa-f0-9]*;?\s*">(.*?)</mark>',
                  mark_repl, body, flags=re.S)
    html_body = markdown.markdown(body, extensions=['fenced_code', 'tables', 'sane_lists', 'nl2br'])

    title = fm.get('title', os.path.basename(path).replace('.md', ''))
    tags = fm.get('tags', [])
    if isinstance(tags, str): tags = [tags]
    updated = fm.get('updated', '')
    sources = fm.get('sources', [])
    if isinstance(sources, str): sources = [sources]
    pills = ''.join(f'<span class="pill">#{t}</span>' for t in tags)
    src_links = ''.join(f'<a class="src" href="{s}" target="_blank" rel="noopener">{s}</a>' for s in sources)

    tpl = f'''<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
<style>
:root{{--bg:#faf9f7;--card:#fff;--ink:#2b2b2b;--muted:#6b7280;--line:#e7e5e1;--accent:#7c6cff;}}
*{{box-sizing:border-box;}}
body{{margin:0;background:var(--bg);color:var(--ink);
 font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;
 line-height:1.75;font-size:16px;}}
.wrap{{max-width:820px;margin:0 auto;padding:32px 20px 64px;}}
header.note{{margin-bottom:28px;border-bottom:2px solid var(--line);padding-bottom:18px;}}
h1{{font-family:"Noto Serif TC",Georgia,serif;font-size:30px;line-height:1.3;margin:.2em 0;}}
h2{{font-family:"Noto Serif TC",Georgia,serif;font-size:22px;margin:1.6em 0 .6em;
 border-left:5px solid var(--accent);padding-left:12px;}}
h3{{font-size:17px;margin:1.3em 0 .4em;color:#3a3a3a;}}
.meta{{color:var(--muted);font-size:13px;margin-top:8px;}}
.pill{{display:inline-block;background:#efeafe;color:#5b4bd6;border-radius:999px;
 padding:2px 11px;font-size:12px;margin:3px 5px 3px 0;}}
.src{{display:block;font-size:12px;color:#2563eb;word-break:break-all;margin-top:3px;}}
.toolbar{{position:sticky;top:0;background:var(--bg);padding:10px 0;z-index:5;
 border-bottom:1px solid var(--line);margin-bottom:10px;}}
.btn{{cursor:pointer;border:1px solid var(--line);background:var(--card);border-radius:8px;
 padding:6px 13px;font-size:13px;color:var(--ink);margin-right:8px;}}
.btn:hover{{background:#f1eefe;}}
mark.hl{{padding:1px 3px;border-radius:4px;}}
mark.tog{{cursor:pointer;transition:.15s;}}
mark.tog.hidden{{color:transparent !important;background:#d9d6d0 !important;border-radius:4px;
 user-select:none;box-shadow:inset 0 0 0 1px #cfccc6;}}
pre{{background:#282c34;border-radius:10px;padding:14px 16px;overflow-x:auto;font-size:13.5px;
 line-height:1.55;}}
code{{font-family:"JetBrains Mono","Fira Code",Consolas,monospace;}}
:not(pre)>code{{background:#f0eef9;color:#5b4bd6;padding:1.5px 5px;border-radius:5px;font-size:.9em;}}
table{{border-collapse:collapse;width:100%;margin:1em 0;font-size:14.5px;}}
th,td{{border:1px solid var(--line);padding:7px 10px;text-align:left;}}
th{{background:#f3f1fb;}}
tr:nth-child(even) td{{background:#faf9fd;}}
blockquote{{border-left:4px solid #ffd27d;background:#fff8ec;margin:1em 0;padding:8px 14px;
 border-radius:0 8px 8px 0;color:#7a5a1e;}}
img{{max-width:100%;border-radius:10px;border:1px solid var(--line);}}
footer{{margin-top:40px;color:var(--muted);font-size:12px;text-align:center;
 border-top:1px solid var(--line);padding-top:16px;}}
.hint{{font-size:12.5px;color:var(--muted);background:#f3f1fb;border-radius:8px;
 padding:7px 12px;margin:6px 0 14px;}}
</style></head>
<body><div class="wrap">
<header class="note">
<h1>{title}</h1>
<div>{pills}</div>
<div class="meta">更新於 {updated} · 來源:</div>
{src_links}
</header>
<div class="toolbar">
<span class="btn" id="hideAll">🙈 全部隱藏重點</span>
<span class="btn" id="showAll">👁️ 全部顯示</span>
</div>
<div class="hint">💡 點一下任何螢光標記可單獨遮住/顯示答案，方便自己考自己。</div>
<div class="content">
{html_body}
</div>
<footer>由 Gemini 對話自動整理 · 更新於 {updated}</footer>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script>
try{{document.querySelectorAll('pre code').forEach(b=>{{if(window.hljs)hljs.highlightElement(b);}});}}catch(e){{}}
document.querySelectorAll('mark.tog').forEach(m=>m.addEventListener('click',()=>m.classList.toggle('hidden')));
var ha=document.getElementById('hideAll'),sa=document.getElementById('showAll');
ha.onclick=()=>document.querySelectorAll('mark.tog').forEach(m=>m.classList.add('hidden'));
sa.onclick=()=>document.querySelectorAll('mark.tog').forEach(m=>m.classList.remove('hidden'));
</script>
</body></html>'''
    out = path[:-3] + '.html' if path.endswith('.md') else path + '.html'
    with open(out, 'w', encoding='utf-8') as f:
        f.write(tpl)
    print('wrote', out)

if __name__ == '__main__':
    convert(sys.argv[1])
