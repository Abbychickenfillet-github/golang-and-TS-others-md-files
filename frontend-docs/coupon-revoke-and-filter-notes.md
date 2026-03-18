# 禮贈品撤銷 + 篩選功能筆記

**日期**：2026-03-15

---

## 1. 撤銷領取（Revoke Claim）

### 概念區分

| 操作 | 欄位 | 意義 |
|------|------|------|
| 撤銷領取資格 | `deleted_at` + `deleted_by` | 軟刪除 claim，名額釋出 |
| 核銷（發出實體贈品） | `redeemed_at` | 確認贈品已交給消費者 |

**核心原則**：已核銷的 claim 不可直接撤銷（實體已發出）。要撤銷必須先 unredeem 再 revoke（兩步驟）。

### 前端實作重點

#### 官網 EventCouponProgramDetailPage（方案詳情頁）

- 垃圾桶 icon：未核銷 → 可點擊；已核銷 → 灰色不可點擊
- 點擊垃圾桶 → shadcn Dialog 選原因（5 種模板）→ SweetAlert2 二次確認 → DELETE API
- **撤銷紀錄 tab**：outline 按鈕樣式，頁面載入時即 fetch（不是 lazy load），tab 上顯示數字

#### 官網 EventCouponSettingsPage（方案設定頁第3欄）

- 未核銷 → 紅色 outline「撤銷」按鈕 → SweetAlert2 選原因 → revoke
- 已核銷 → 紅色 outline「撤銷」按鈕 → SweetAlert2 選原因（帶紅色警告）→ 先 unredeem 再 revoke
- tooltip：「僅限誤發或已收回實體贈品時使用」

#### Dashboard event-coupons

- 垃圾桶 icon：`isDisabled={!!claim.redeemed_at}`
- 撤銷 Modal（Chakra UI）：RadioGroup 選原因 + Textarea
- **撤銷紀錄 tab**：展開方案時即 fetch，Tab 標籤用紅色 Badge 顯示數字

### SweetAlert2 + Dialog 嵌套問題

**問題**：Swal 在 shadcn Dialog / Radix Dialog 上方彈出時，按鈕點不了。

**原因**：Radix Dialog 的 overlay（`fixed inset-0`）攔截了 pointer-events。

**解法**：
```tsx
didOpen: () => {
  // 暫停 Dialog 的 pointer-events
  document.querySelectorAll('[data-slot="dialog-overlay"], [data-slot="dialog-content"]').forEach(el => {
    (el as HTMLElement).style.pointerEvents = 'none'
  })
  // 提高 Swal z-index
  const container = Swal.getContainer()
  if (container) container.style.zIndex = '999999'
},
didClose: () => {
  // 恢復 pointer-events
  document.querySelectorAll('[data-slot="dialog-overlay"], [data-slot="dialog-content"]').forEach(el => {
    (el as HTMLElement).style.pointerEvents = ''
  })
},
```

### DELETE with JSON Body

`apiClient.delete` 不支援 body，需用原生 fetch：
```tsx
const res = await fetch(url, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ reason_template: 'wrong_date' }),
})
```

---

## 2. ON_PURCHASE + require_checkin 互斥

購票自動發放時會員尚未報到，兩者不能同時啟用。

**前端處理**：
```tsx
// trigger_type radio onChange
onChange={() => setFormData({
  ...formData,
  trigger_type: option.value,
  ...(option.value === 'ON_PURCHASE' ? { require_checkin: false } : {})
})}

// require_checkin checkbox
<input
  type="checkbox"
  disabled={formData.trigger_type === 'ON_PURCHASE'}
/>
```

---

## 3. 停用/刪除方案確認

當方案有 `issued_count > 0` 時，停用或刪除前用 SweetAlert2 確認：

- **停用**：amber 色確認框，顯示「已有 N 位消費者領取，停用後暫停新領取」
- **刪除**：紅色確認框，顯示「已有 N 位消費者領取，刪除後券失效」

後端同步寄送通知信（模板 B/C）。

---

## 4. Dashboard 多條件篩選

### 後端 API 參數

`GET /programs/:id/claims` 支援：

| 參數 | 說明 |
|------|------|
| `member_search` | 會員名稱模糊搜尋 |
| `issued_from` / `issued_to` | 發放時間範圍 |
| `redeemed_from` / `redeemed_to` | 核銷時間範圍 |
| `include_deleted` | 包含已撤銷紀錄 |
| `sort_by` | 排序欄位 |
| `sort_order` | asc / desc |

### 前端篩選 UI

- 會員搜尋：debounce 500ms（`useRef` + `setTimeout`）
- 日期範圍：`<Input type="date" />`
- 包含已撤銷：Switch
- 方案排序：Select 下拉（建立時間/發放數量 升冪降冪）

### Debounce 模式（不用外部套件）

```tsx
const debounceRef = useRef<ReturnType<typeof setTimeout>>()
const handleSearchChange = (value: string) => {
  if (debounceRef.current) clearTimeout(debounceRef.current)
  debounceRef.current = setTimeout(() => setMemberSearch(value), 500)
}
```

---

## 5. 撤銷紀錄 Tab 載入時機

| 頁面 | 載入時機 | 原因 |
|------|---------|------|
| 官網 ProgramDetailPage | 頁面載入時 | 使用者一進來就要看到 tab 數字 |
| Dashboard event-coupons | 展開方案時 | 有很多方案，不能全部 fetch |

**錯誤做法**：`if (claimTab === 'revoked') loadRevokedClaims()` → tab 數字要點進去才有

**正確做法**：頁面/展開時就 fetch，tab 標籤立即顯示 count
