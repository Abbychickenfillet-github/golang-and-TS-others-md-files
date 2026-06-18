#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gemini 筆記 .md -> 精美 HTML。用法: python3 md2html.py f1.md [f2.md ...]"""
import sys, re, os, html
import markdown

TEMPLATE = """<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
<style>
:root{{--bg:#f5f6f8;--card:#fff;--ink:#23272f;--muted:#6b7280;--line:#e5e7eb;--accent:#5b7cfa;--accent-soft:#eef1ff;}}
*{{box-sizing:border-box;}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:"Segoe UI","PingFang TC","Microsoft JhengHei",-apple-system,system-ui,sans-serif;line-height:1.75;-webkit-font-smoothing:antialiased;}}
.wrap{{max-width:820px;margin:0 auto;padding:32px 20px 64px;}}
header.note-head{{margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid var(--line);}}
h1.note-title{{font-family:"Noto Serif TC",Georgia,"Microsoft JhengHei",serif;font-size:1.9rem;margin:.2em 0 .5em;line-height:1.3;}}
.tags{{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0;}}
.tag{{background:var(--accent-soft);color:var(--accent);font-size:.78rem;padding:3px 11px;border-radius:999px;font-weight:600;}}
.meta{{color:var(--muted);font-size:.85rem;margin-top:8px;}}
.meta a{{color:var(--accent);text-decoration:none;}}
.meta a:hover{{text-decoration:underline;}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 26px;margin:22px 0;box-shadow:0 1px 3px rgba(20,30,60,.04);}}
h2{{font-size:1.32rem;margin:.2em 0 .7em;padding-left:11px;border-left:4px solid var(--accent);}}
h3{{font-size:1.08rem;margin:1.3em 0 .5em;color:#374151;}}
h4{{font-size:.98rem;margin:1.1em 0 .4em;color:#4b5563;}}
p{{margin:.6em 0;}}
ul,ol{{padding-left:1.4em;}} li{{margin:.3em 0;}}
mark{{padding:1px 3px;border-radius:3px;}}
a{{color:var(--accent);}}
code{{font-family:"JetBrains Mono",Consolas,monospace;background:#eceef3;padding:1.5px 6px;border-radius:5px;font-size:.9em;}}
pre{{background:#282c34;border-radius:10px;padding:0;overflow-x:auto;margin:1em 0;}}
pre code{{display:block;background:none;padding:16px 18px;color:#abb2bf;font-size:.86rem;line-height:1.6;}}
table{{border-collapse:collapse;width:100%;margin:1em 0;font-size:.92rem;}}
th,td{{border:1px solid var(--line);padding:8px 12px;text-align:left;}}
th{{background:var(--accent-soft);}}
tr:nth-child(even) td{{background:#fafbfc;}}
blockquote{{margin:1em 0;padding:10px 16px;background:#fff8e6;border-left:4px solid #f5c518;border-radius:0 8px 8px 0;color:#5c4d12;}}
img{{max-width:100%;border-radius:8px;border:1px solid var(--line);margin:.6em 0;}}
footer.note-foot{{margin-top:40px;text-align:center;color:var(--muted);font-size:.8rem;border-top:1px solid var(--line);padding-top:18px;}}
</style>
</head>
<body>
<div class="wrap">
<header class="note-head">
  <h1 class="note-title">{title}</h1>
  <div class="tags">{tags}</div>
  <div class="meta">{meta}</div>
</header>
{body}
<footer class="note-foot">由 Gemini 對話自動整理 · 更新於 {updated}</footer>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script>try{{hljs.highlightAll();}}catch(e){{}}</script>
</body>
</html>"""

def parse_front(text):
    fm={}; body=text
    m=re.match(r'^---\s*\n(.*?)\n---\s*\n?(.*)$', text, re.S)
    if m:
        raw, body=m.group(1), m.group(2)
        key=None
        for line in raw.split('\n'):
            if re.match(r'^\s*-\s+', line) and key:
                fm.setdefault(key+'__list',[]).append(line.strip()[2:].strip())
            else:
                mm=re.match(r'^(\w+):\s*(.*)$', line)
                if mm:
                    key=mm.group(1); val=mm.group(2).strip()
                    if val.startswith('[') and val.endswith(']'):
                        fm[key]=[x.strip() for x in val[1:-1].split(',') if x.strip()]
                    elif val: fm[key]=val
    if 'tags__list' in fm: fm['tags']=fm['tags__list']
    if 'sources__list' in fm: fm['sources']=fm['sources__list']
    return fm, body

def convert(path):
    text=open(path,encoding='utf-8').read()
    fm, body=parse_front(text)
    title=fm.get('title') or os.path.splitext(os.path.basename(path))[0]
    tags=fm.get('tags',[])
    if isinstance(tags,str): tags=[tags]
    tags_html=''.join(f'<span class="tag">#{html.escape(str(t))}</span>' for t in tags)
    updated=fm.get('updated','')
    srcs=fm.get('sources',[])
    if isinstance(srcs,str): srcs=[srcs]
    meta_parts=[]
    if updated: meta_parts.append(f'更新於 {html.escape(updated)}')
    cat=fm.get('category')
    if cat: meta_parts.append(f'分類：{html.escape(str(cat))}')
    for s in srcs:
        s=s.strip()
        if s: meta_parts.append(f'<a href="{html.escape(s)}" target="_blank">來源連結</a>')
    meta='　·　'.join(meta_parts)
    md=markdown.Markdown(extensions=['fenced_code','tables','sane_lists','nl2br'])
    body_html=md.convert(body)
    parts=re.split(r'(?=<h2)', body_html)
    out=[]
    for p in parts:
        if p.strip().startswith('<h2'): out.append(f'<section class="card">{p}</section>')
        elif p.strip(): out.append(p)
    body_html='\n'.join(out)
    open(os.path.splitext(path)[0]+'.html','w',encoding='utf-8').write(
        TEMPLATE.format(title=html.escape(title),tags=tags_html,meta=meta,body=body_html,updated=html.escape(updated or '')))
    return os.path.splitext(path)[0]+'.html'

if __name__=='__main__':
    for p in sys.argv[1:]: print('->', convert(p))
