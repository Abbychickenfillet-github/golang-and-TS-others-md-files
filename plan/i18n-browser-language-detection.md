# 語系切換是否依照瀏覽器語言自動切換？

## 為什麼要調查這個？

Jessie 提出需求：需要確認國外客人進入網站時能不能直接看到英文頁面。擔心國外客人一進來看到中文，找不到切換語系的按鈕，導致使用體驗很差。
<img width="967" height="1244" alt="image" src="https://github.com/user-attachments/assets/73f0c5ca-f510-4a01-aa3e-81516493a04c" />
<img width="1185" height="1039" alt="image" src="https://github.com/user-attachments/assets/7677bd04-9ea2-4398-88f6-b66ca98cf497" />


## 結論：目前不會

目前專案的 i18n **不會**偵測瀏覽器語言，語言切換完全靠 **localStorage + 手動選擇**。

## 目前的語言判斷流程

```
使用者進入網站
    │
    ▼
檢查 localStorage 有沒有存過語言偏好？
    │
    ├── 有 → 用存過的語言（zh-TW 或 en）
    │
    └── 沒有 → 預設 zh-TW（繁體中文）
```

**相關程式碼：** `futuresign.official_website/src/lib/contexts/LanguageContext.tsx`
```typescript
const [language, setLanguage] = useState<Language>(() => {
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('language') as Language | null
    if (savedLanguage) return savedLanguage
  }
  return defaultLanguage // zh-TW
})
```

## 目前支援的語言

只有兩個：
- `zh-TW`（繁體中文）— **預設語言**
- `en`（英文）

## 泰國客人會看到什麼？

**會看到中文（zh-TW）。**

原因：
1. 泰國客人的瀏覽器語言是 `th`（泰文）
2. 專案完全沒有讀取 `navigator.language`（瀏覽器語言）
3. 第一次造訪時 localStorage 沒有存過語言
4. 直接 fallback 到預設語言 `zh-TW`
5. 泰文也不在支援的語言列表裡

```
泰國客人第一次造訪
    │
    ▼
localStorage 有語言偏好嗎？→ 沒有
    │
    ▼
偵測瀏覽器語言嗎？→ ❌ 沒有這個邏輯
    │
    ▼
直接顯示預設語言 zh-TW（中文）
```

## 如果要支援瀏覽器語言自動偵測

需要修改 `LanguageContext.tsx`，在 localStorage 沒有值時加入瀏覽器語言偵測：

```typescript
const [language, setLanguage] = useState<Language>(() => {
  if (typeof window !== 'undefined') {
    // 1. 先看 localStorage
    const savedLanguage = localStorage.getItem('language') as Language | null
    if (savedLanguage) return savedLanguage

    // 2. 再看瀏覽器語言
    const browserLang = navigator.language // 例如 "th", "en-US", "zh-TW"
    if (browserLang.startsWith('zh')) return 'zh-TW'
    if (browserLang.startsWith('en')) return 'en'

    // 3. 都不匹配 → 預設（非中文非英文的外國客人看到英文比較合理）
    return 'en'
  }
  return defaultLanguage
})
```

### 改完之後的流程

```
使用者進入網站
    │
    ▼
localStorage 有語言偏好嗎？
    ├── 有 → 用存過的
    └── 沒有 ↓
            ▼
        瀏覽器語言是什麼？
            ├── zh-* → 顯示 zh-TW
            ├── en-* → 顯示 en
            └── 其他（th, ja, ko...）→ 顯示 en（英文作為國際通用）
```

### 改完之後泰國客人會看到什麼？

**英文（en）**，因為泰文不在支援清單中，fallback 到英文比中文更合理。

## 要不要改？

| 考量 | 說明 |
|------|------|
| **目標客群** | 如果主要是台灣用戶，目前預設中文 OK |
| **有國際客人** | 建議加瀏覽器偵測，非中文用戶自動顯示英文 |
| **改動幅度** | 只改 `LanguageContext.tsx` 一個檔案，約 5 行程式碼 |
