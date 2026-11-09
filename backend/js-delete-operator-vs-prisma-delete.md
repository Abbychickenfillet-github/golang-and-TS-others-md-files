# `delete user.password` 與 Prisma 真正改資料庫的差別

日期：2026-10-30
專案：next-one（services/auth.service.js）
相關筆記：[[6-next-one-jwt-session-review]]、[[JSON]]

## 一、`delete user.password` 不會動資料庫

- `delete` 是 JS 運算子，只移除記憶體中物件的屬性
- `prisma.user.findUnique()` 回傳的是一般 JS 物件，和資料庫那一列沒有連動
- 用途：回傳給前端前，把密碼 hash 拿掉

| 寫法 | 影響範圍 |
|---|---|
| `delete user.password` | 只有這份 JS 物件 |
| `prisma.user.update(...)` | 資料庫該列的欄位 |
| `prisma.user.delete(...)` | 資料庫整列 |

## 二、JSON 與 JS 物件

| | JS 物件 | JSON |
|---|---|---|
| 本質 | 記憶體中的資料結構 | 純文字字串 |
| `typeof` | `'object'` | `'string'` |
| 能不能 `delete` 屬性 | 能 | 不能，要先 `JSON.parse` |

- `auth.service.js:62` 的 `user`：`findUnique` 回傳，JS 物件
- `auth.service.js:249` 的 `updateUser`：`update` 回傳，JS 物件
- 轉成 JSON 的時間點：route 呼叫 `res.json(...)`，內部執行 `JSON.stringify`
- 順序：先 `delete`，再序列化，所以前端收到的 JSON 沒有 `password`

## 三、Prisma 真正寫入的寫法

User 主鍵是 `user_id`（UUID），不是 `id`。

```js
// 更新密碼
await prisma.user.update({
  where: { user_id: userId },
  data: { password: newHash },
})

// 刪除整個使用者
await prisma.user.delete({
  where: { user_id: userId },
})
```

- `password` 在 schema 是 `String`，不是 `String?`，不能設成 `null`
- 「清掉資料庫的密碼」不是這個專案的需求，要改密碼用 `update`

## 四、查詢時就排除欄位

```js
const user = await prisma.user.findUnique({
  where: { email },
  omit: { password: true },
})
```

- `omit` 需 Prisma 6.2 以上，未確認專案版本
- `login` 需要 hash 做 `bcrypt.compare`，仍要先查出再手動 `delete`

## 未查證

- `auth.service.js:241` 的 `where: { id: dbUser.id }`：schema 主鍵是 `user_id`，疑似欄位名錯誤，未實際執行驗證
- Prisma 版本是否支援 `omit`
