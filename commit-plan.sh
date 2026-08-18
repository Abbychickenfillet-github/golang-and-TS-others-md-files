#!/usr/bin/env bash
# Abby-notes 分主題提交腳本
# 產生日期：2026-08-18
# 用法：在 Git Bash 或 Cursor 終端機執行  bash commit-plan.sh
# 說明：commit 1（vue 筆記）已在 Claude 端完成，本腳本從 commit 2 開始。

set -e
cd "$(dirname "$0")"

echo "=== 0/6 清掉殘留的 git lock 與暫存垃圾 ==="
rm -f .git/index.lock .git/HEAD.lock .git/objects/maintenance.lock 2>/dev/null || true
find .git/objects -name "tmp_obj_*" -delete 2>/dev/null || true
rm -rf _to_delete 2>/dev/null || true
echo "  完成"

echo "=== 2/6 設計模式總覽 ==="
git add "設計模式/"
git commit -m "docs(design-patterns): 新增 GoF 23 種設計模式總覽" \
           -m "- 三大類完整清單與前端對應，標明 JS 內建實現的 Prototype／Proxy／Iterator
- Proxy／Decorator／Adapter 三者辨異：介面、功能、意圖對照
- 釐清 HOC 是 Higher-Order Component（非高階函數），對應 Decorator 模式
- 附合法免費閱讀資源，說明 GoF 原書無官方免費版"

echo "=== 3/6 React 框架比較與 Proxy demo ==="
git add -A "frontend-docs/react/" "frontend-docs/javascript/"
git commit -m "docs(react): 補上框架比較的變更偵測章節與 Proxy demo" \
           -m "- 新增 (i)-(m)：Vue Proxy 代理模式、五大框架變更偵測橫向比較、2026 現況、面試腳本、五個常見錯誤說法
- 區分 JavaScript Proxy 與 Vue CLI devServer.proxy 兩個撞名概念
- 更正 ref() 使用 getter／setter 而非 Proxy
- 新增可執行的 proxy-reactivity-demo.js
- 筆記改用編號前綴 00-／01-，與 JS_Core_and_Runtime 系列一致"

echo "=== 4/6 其他主題筆記 ==="
git add -A "AWS/" "backend/" "Python語法解釋/" "TS/" "debugging/" \
           "frontend-docs/css/" "frontend-docs/web-platform/" \
           "計算機基礎/" "待學習的技術｜面試/" "Gemini-Chats/"
git commit -m "docs: 新增後端、CSS、Python、TS、計算機基礎等主題筆記" \
           -m "涵蓋 DNS 與 TLS 握手、GraphQL、冪等性、支付系統架構、IoT 告警、
SVG viewBox、CJK 字體、正規表達式、React Props 型別、Round-Robin 負載平衡、
SPA 現況與 script 載入方式，以及 iThome 鐵人賽參賽評估。"

echo "=== 5/6 截圖依主題分類歸檔 ==="
git add -A "obsidian-attachment/"
git commit -m "chore(attachment): 截圖依主題與時間分類歸檔並重新命名" \
           -m "把 obsidian-attachment 根目錄的「螢幕擷取畫面 YYYY-MM-DD.png」
移入學習-JavaScript／學習-React／學習-演算法／求職／系統設定等分類資料夾，
並改成可讀檔名。仍被筆記引用的 4 張保留在根目錄避免破圖。"

echo "=== 6/6 行尾正規化與其餘變更 ==="
git add -A
git commit -m "chore: 行尾正規化（LF 轉 CRLF）與其餘未提交變更" \
           -m "約 1051 個檔案被 Windows 工具改寫行尾，內容未變動。
一次收進版控，避免持續污染 git status。"

echo "=== 7/7 推上 GitHub ==="
git push origin main

echo ""
echo "全部完成，最近 7 筆："
git log --oneline -7
echo ""
echo "與遠端的差距（應該顯示 up to date）："
git status -sb | head -1
