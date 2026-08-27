#!/usr/bin/env bash
# 把鐵人賽資料夾（含 .js 範例）提交並推上 GitHub Pages
# 用法：bash push-ithome.sh
set -e
cd "$(dirname "$0")"

echo "=== 0/4 清掉可能殘留的 git lock ==="
rm -f .git/index.lock .git/HEAD.lock .git/objects/maintenance.lock 2>/dev/null || true
find .git/objects -name "tmp_obj_*" -delete 2>/dev/null || true
echo "  完成"

echo ""
echo "=== 1/4 這次會提交的檔案 ==="
git add -A "iThome鐵人賽-2026/" "frontend-docs/" "設計模式/" "_config.yml"
git status --short --cached | head -25

echo ""
read -p "確認要提交嗎？輸入 yes 繼續：" OK
[ "$OK" = "yes" ] || { echo "已取消"; exit 0; }

echo ""
echo "=== 2/4 提交 ==="
git commit -m "docs(ithome): 新增好維護的程式碼系列 Day1-3 與可執行範例" \
           -m "- Day 1 命令式與宣告式：every() 重構，含 break 短路實測
- Day 2 巢狀 if 與提早 return：Guard Clause，含 Cognitive Complexity 計分說明
- Day 3 命名：布林前綴、get 與 fetch 的差別、抽變數的判準
- 附可執行範例 day02-guard-clause.js、day03-naming.js、species-demo.js"

echo ""
echo "=== 3/4 推上 GitHub ==="
git push origin main

echo ""
echo "=== 4/4 完成 ==="
git log --oneline -3
echo ""
echo "GitHub Pages 大約需要 1 到 3 分鐘重新建置。"
echo "建置狀態可以在這裡看："
echo "  https://github.com/Abbychickenfillet-github/golang-and-TS-others-md-files/actions"
