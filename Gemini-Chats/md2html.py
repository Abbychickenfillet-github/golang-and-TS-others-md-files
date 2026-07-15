#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gemini 主題筆記 .md -> 精美互動 HTML(同層同名 .html)。"""
import sys, os, re, html
import markdown

HL = {'#FFF3A3':'核心重點','#FF5582':'警告','#BBFABB':'正解','#ADCCFF':'術語','#FFB8EB':'數據','#D2B3FF':'次要備註'}

def parse_front(text):
    fm={}; body=text
    if text.startswith('---'):
        end=text.find('\n---',3)
        if end!=-1:
            raw=text[3:end].strip('\n'); body=text[end+4:].lstrip('\n'); key=None
            for line in raw.split('\n'):
                if re.match(r'^\s+-\s',line) and key:
                    fm.setdefault(key,[])
                    if isinstance(fm[key],list): fm[key].append(line.strip()[1:].strip())
                elif ':' in line:
                    k,v=line.split(':',1); k=k.strip(); v=v.strip()
                    if v.startswith('[') and v.endswith(']'): fm[k]=[x.strip() for x in v[1:-1].split(',') if x.strip()]
                    elif v=='' : fm[k]=[]
                    else: fm[k]=v
                    key=k
    return fm, body

TEMPLATE='''<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css" onerror="this.remove()">
<style>
:root{{--bg:#f7f8fa;--card:#fff;--ink:#2b2d33;--muted:#6b7280;--line:#e5e7eb;--accent:#5b7cfa;}}
*{{box-sizing:border-box;}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;line-height:1.75;font-size:16px;}}
.wrap{{max-width:820px;margin:0 auto;padding:28px 20px 80px;}}
header.note{{background:linear-gradient(135deg,#eef2ff,#f5f3ff);border:1px solid var(--line);border-radius:16px;padding:24px 26px;margin-bottom:22px;}}
header.note h1{{margin:0 0 12px;font-size:1.7rem;font-family:"Noto Serif TC",serif;line-height:1.35;}}
.pills{{margin:6px 0;}}
.pill{{display:inline-block;background:#fff;border:1px solid #c7d2fe;color:#4f46e5;border-radius:999px;padding:3px 12px;font-size:.78rem;margin:3px 5px 3px 0;}}
.meta{{color:var(--muted);font-size:.85rem;margin-top:8px;}}
.meta a{{color:var(--accent);text-decoration:none;}} .meta a:hover{{text-decoration:underline;}}
.toolbar{{position:sticky;top:0;z-index:5;background:rgba(247,248,250,.92);backdrop-filter:blur(4px);padding:10px 0;margin-bottom:14px;border-bottom:1px solid var(--line);}}
.toolbar button{{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:8px 14px;font-size:.85rem;cursor:pointer;margin-right:8px;}}
.toolbar button.alt{{background:#fff;color:var(--accent);border:1px solid var(--accent);}}
.toolbar .hint{{color:var(--muted);font-size:.78rem;}}
section.card{{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 24px;margin-bottom:18px;box-shadow:0 1px 3px rgba(0,0,0,.03);}}
h2{{font-size:1.25rem;border-left:5px solid var(--accent);padding-left:12px;margin:.2em 0 .7em;}}
h3{{font-size:1.05rem;margin:1.2em 0 .5em;color:#374151;}}
p,li{{font-size:1rem;}}
mark{{padding:.05em .25em;border-radius:4px;cursor:pointer;transition:all .15s;}}
mark.hidden-ans{{color:transparent !important;background:#d8dbe0 !important;border-radius:4px;user-select:none;box-shadow:inset 0 0 0 1px #c4c8cf;}}
code{{background:#eef1f6;padding:.1em .4em;border-radius:4px;font-size:.9em;font-family:"JetBrains Mono",Consolas,monospace;}}
pre{{background:#282c34;border-radius:10px;padding:0;overflow-x:auto;}}
pre code{{background:none;color:#abb2bf;display:block;padding:16px 18px;font-size:.88rem;line-height:1.6;}}
blockquote{{border-left:4px solid #f59e0b;background:#fffbeb;margin:1em 0;padding:.6em 1em;border-radius:0 8px 8px 0;}}
table{{border-collapse:collapse;width:100%;margin:1em 0;font-size:.92rem;}}
th,td{{border:1px solid var(--line);padding:8px 10px;text-align:left;}}
th{{background:#f1f5f9;}} tr:nth-child(even) td{{background:#fafbfc;}}
img{{max-width:100%;border-radius:8px;border:1px solid var(--line);}}
.src{{background:#fafafa;}} .src h3{{color:var(--accent);}}
footer{{color:var(--muted);font-size:.8rem;text-align:center;margin-top:30px;}}
.legend{{font-size:.75rem;color:var(--muted);margin-top:10px;}}
.legend span{{display:inline-block;margin-right:10px;}}
.legend i{{display:inline-block;width:11px;height:11px;border-radius:3px;vertical-align:middle;margin-right:3px;}}
</style></head><body>
<div class="wrap">
<header class="note"><h1>{title}</h1><div class="pills">{pills}</div><div class="meta">{meta}</div><div class="legend">{legend}</div></header>
<div class="toolbar"><button id="toggleAll" class="alt" onclick="window.__toggleAll()">遮住所有重點(自我考試)</button><span class="hint">點任一螢光標示可單獨遮住/顯示答案</span></div>
{body}
<footer>由 Gemini 對話自動整理 · 更新於 {updated}</footer>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js" onerror="window.__nohl=1"></script>
<script>
document.addEventListener('DOMContentLoaded',function(){{
  if(window.hljs){{document.querySelectorAll('pre code').forEach(function(b){{try{{hljs.highlightElement(b);}}catch(e){{}}}});}}
  document.querySelectorAll('mark').forEach(function(m){{m.addEventListener('click',function(){{m.classList.toggle('hidden-ans');}});}});
  var hidden=false;
  window.__toggleAll=function(){{hidden=!hidden;document.querySelectorAll('mark').forEach(function(m){{m.classList.toggle('hidden-ans',hidden);}});var b=document.getElementById('toggleAll');b.textContent=hidden?'顯示所有重點':'遮住所有重點(自我考試)';}};
}});
</script></body></html>'''

def build(md_path):
    text=open(md_path,encoding='utf-8').read()
    fm,body=parse_front(text)
    title=fm.get('title','筆記')
    body=re.sub(r'^#\s+'+re.escape(title)+r'\s*\n','',body,count=1)
    md=markdown.Markdown(extensions=['fenced_code','tables','nl2br','sane_lists'])
    hb=md.convert(body)
    parts=re.split(r'(<h2[^>]*>.*?</h2>)',hb)
    cards=''
    if parts[0].strip(): cards+='<section class="card">'+parts[0]+'</section>'
    i=1
    while i<len(parts):
        h2=parts[i]; content=parts[i+1] if i+1<len(parts) else ''
        cls='card src' if ('來源' in h2) else 'card'
        cards+='<section class="'+cls+'">'+h2+content+'</section>'; i+=2
    if not cards: cards='<section class="card">'+hb+'</section>'
    tags=fm.get('tags',[]) or []
    pills=''.join('<span class="pill">#'+html.escape(str(t))+'</span>' for t in tags)
    meta=[]
    if fm.get('source'): meta.append('來源：'+html.escape(str(fm['source'])))
    if fm.get('category'): meta.append('分類：'+html.escape(str(fm['category'])))
    for s in (fm.get('sources',[]) or []):
        s=str(s).strip()
        if s.startswith('http'): meta.append('<a href="'+html.escape(s)+'" target="_blank">原始對話</a>')
    legend=''.join('<span><i style="background:'+c+'"></i>'+n+'</span>' for c,n in HL.items())
    out=TEMPLATE.format(title=html.escape(title),pills=pills,meta=' · '.join(meta),legend=legend,body=cards,updated=html.escape(str(fm.get('updated',''))))
    op=os.path.splitext(md_path)[0]+'.html'
    open(op,'w',encoding='utf-8').write(out)
    return op

if __name__=='__main__':
    for p in sys.argv[1:]: print('->',build(p))
