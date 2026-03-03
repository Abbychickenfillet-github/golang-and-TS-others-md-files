# Bug: 主辦方可以申請自己的活動

## 問題描述
主辦方（organizer）進入自己建立的活動時，如果 `require_vendor_review=true`，
系統會讓他走品牌商審核流程（選公司 → 申請），這不合理。

**主辦方不應該需要申請自己的活動。**

## 重現步驟
1. 用主辦帳號 (陳芸茜 b566d782-d803-41c8-8eb1-ffa4479f283f) 登入
2. 進入自己建立的活動 http://localhost:3000/event/a6c19274-2da0-4aa0-9433-62636af9d2de/register
3. 點擊攤位登記 → 居然要求選公司申請

## 根本原因
`EventRegisterPage.tsx` 的 `handleBoothClick` 沒有檢查當前用戶是否為活動主辦。

## 修復方式
在 `handleBoothClick` 開頭加一個判斷：
```typescript
if (event.member_id === user.id) {
  // 主辦方直接進入攤位頁，不需審核
  router.push(`/event/${eventId}/register/booth`)
  return
}
```

## 備註
- `member_identity_item` 表裡沒有 `identity="organizor"` 的資料
- 不能靠 identity 判斷，要直接比對 `event.member_id === user.id`
- 同樣要檢查 `event.company_id` 是否為當前用戶的公司（同公司的人也不需要申請）
