#!/usr/bin/env bash
# ============================================================
# 從 git 歷史徹底移除求職截圖
# 產生日期：2026-08-18
#
# ⚠️ 這個腳本會改寫 git 歷史，所有 commit 的 hash 都會改變。
# ⚠️ 執行前請先跑完 commit-plan.sh，確認工作區乾淨。
# ⚠️ 執行後必須強制推送，其他裝置需要重新 clone。
#
# 用法：bash clean-history.sh
# ============================================================
set -e
cd "$(dirname "$0")"

TARGET="obsidian-attachment/求職 (2026-01~2026-05)/"

echo "============================================"
echo "步驟 0：前置檢查"
echo "============================================"

# 檢查工作區是否乾淨
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ 工作區還有未提交的變更。"
  echo "   請先執行 bash commit-plan.sh，全部提交並推送之後再跑這支腳本。"
  git status --short | head -10
  exit 1
fi
echo "✅ 工作區乾淨"

# 檢查 git-filter-repo 是否安裝
if ! command -v git-filter-repo >/dev/null 2>&1 && ! python -c "import git_filter_repo" 2>/dev/null; then
  echo "❌ 找不到 git-filter-repo，請先安裝："
  echo "   pip install git-filter-repo"
  exit 1
fi
echo "✅ git-filter-repo 已安裝"

# 記下 remote 網址（filter-repo 會把 remote 移除）
REMOTE_URL="$(git remote get-url origin)"
echo "✅ 記下 remote：$REMOTE_URL"

echo ""
echo "============================================"
echo "步驟 1：備份整個 .git（出事可以還原）"
echo "============================================"
BACKUP=".git.bak-$(date +%Y%m%d-%H%M%S)"
cp -r .git "$BACKUP"
echo "✅ 已備份到 $BACKUP"
echo "   還原方式：刪掉 .git 之後把 $BACKUP 改名回 .git"

echo ""
echo "============================================"
echo "步驟 2：確認要從歷史移除的內容"
echo "============================================"
echo "將移除路徑：$TARGET"
echo "歷史中該路徑的檔案："
git log --all --name-only --format="" -- "$TARGET" | sort -u | grep -v '^$' || true
echo ""
read -p "確認要改寫歷史嗎？輸入 yes 繼續：" CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "已取消。備份保留在 $BACKUP"
  exit 0
fi

echo ""
echo "============================================"
echo "步驟 3：改寫歷史"
echo "============================================"
git filter-repo --path "$TARGET" --invert-paths --force
echo "✅ 歷史已改寫"

echo ""
echo "============================================"
echo "步驟 4：重新掛上 remote"
echo "============================================"
git remote add origin "$REMOTE_URL" 2>/dev/null || git remote set-url origin "$REMOTE_URL"
echo "✅ remote 已還原：$(git remote get-url origin)"

echo ""
echo "============================================"
echo "步驟 5：驗證"
echo "============================================"
echo "歷史中還找得到求職截圖嗎（應該沒有輸出）："
git log --all --name-only --format="" | grep -i "求職_" || echo "  ✅ 已完全清除"

echo ""
echo "============================================"
echo "步驟 6：強制推送"
echo "============================================"
echo "⚠️ 下一步會覆蓋 GitHub 上的歷史，這個動作無法復原。"
read -p "確認要強制推送嗎？輸入 push 繼續：" CONFIRM2
if [ "$CONFIRM2" != "push" ]; then
  echo "沒有推送。本地歷史已改寫，之後手動執行："
  echo "  git push origin main --force"
  exit 0
fi
git push origin main --force
echo ""
echo "✅ 全部完成"
echo ""
echo "後續提醒："
echo "  a. 其他裝置（手機、另一台電腦）的舊 clone 已經對不上，請重新 clone。"
echo "  b. 確認沒問題之後，可以刪掉備份資料夾 $BACKUP"
echo "  c. 如果 repo 是 public，GitHub 可能還有快取，建議到 repo 設定聯絡 GitHub Support 清除，"
echo "     或直接把 repo 改成 private 最保險。"
