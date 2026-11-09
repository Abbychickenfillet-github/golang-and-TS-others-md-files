# `for...in` 的 `key`：把物件中的 `null` 轉成空字串

日期：2026-10-30
專案：next-one（services/auth.service.js）
相關筆記：[[js-delete-operator-vs-prisma-delete]]

## 一、正確寫法

```js
if (updateUser) {
  for (const key in updateUser) {
    if (updateUser[key] === null) {
      updateUser[key] = ''
    }
  }
}
```

原始碼的筆誤：
- `updaeUser` 拼錯，應為 `updateUser`
- `'”` 引號不成對，空字串是 `''`
- `if (updateUser) {}` 的大括號要包住整個 `for`

## 二、`key` 是什麼

- `key` = 物件每個屬性的名稱，型別是字串
- `for...in` 每圈把下一個屬性名稱指定給 `key`

```js
const updateUser = { user_id: 'abc', name: 'Abby', phone: null, birthdate: null }
```

| 圈數 | `key` | `updateUser[key]` | 是 `null` 嗎 |
|---|---|---|---|
| 1 | `'user_id'` | `'abc'` | 否 |
| 2 | `'name'` | `'Abby'` | 否 |
| 3 | `'phone'` | `null` | 是，改成 `''` |
| 4 | `'birthdate'` | `null` | 是，改成 `''` |

結果：`{ user_id: 'abc', name: 'Abby', phone: '', birthdate: '' }`

## 三、為什麼用 `updateUser[key]`

| 寫法 | 讀到的屬性 |
|---|---|
| `updateUser.key` | 名字就叫 `key` 的屬性（通常是 `undefined`） |
| `updateUser[key]` | 變數 `key` 目前的值所對應的屬性 |

- 屬性名稱放在變數裡時，必須用中括號

## 四、為什麼要轉成空字串

- Prisma 對可為空的欄位（`String?`、`DateTime?`）回傳 `null`
- React 受控元件 `<input value={null}>` 會警告，`value` 不能是 `null`
- 轉成 `''` 後前端表單可直接綁定

## 五、注意

- `for...in` 會走訪所有可列舉屬性，含原型鏈上的；Prisma 回傳的是一般物件，沒有這個問題
- 只處理第一層，巢狀物件（例如 `profile: { avatar: null }`）裡的 `null` 不會被轉換
- `Date` 物件不是 `null`，不受影響
- `password` 已在前面 `delete`，不會被走訪

等價寫法：

```js
for (const [key, value] of Object.entries(updateUser)) {
  if (value === null) updateUser[key] = ''
}
```
