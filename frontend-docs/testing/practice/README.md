# 測試框架練習場

> 一週衝刺對應的動手練習。主筆記 → [../tdd-bdd.md](../tdd-bdd.md)
> 每個練習檔都有 `// TODO` 註解 + 提示，照著填就好。

---

## 📺 影片資源（挑跟你的 Day 對應看）

### Jest（對應 Day 2 / Day 3）
| 影片 | 頻道 | 語言 | 長度 |
|---|---|---|---|
| [Master Jest Testing in React – Crash Course](https://www.youtube.com/watch?v=353keU_U7Qw) | (2025 上傳) | EN | ~25 min |
| [Testing In React Tutorial - Jest and RTL](https://www.youtube.com/watch?v=JBSUgDxICg8) | PedroTech | EN | ~22 min |

### Mocha + Chai（對應 Day 4）
| 資源 | 頻道 / 來源 | 語言 | 長度 |
|---|---|---|---|
| [Intro To Mocha JS & Chai](https://www.youtube.com/watch?v=MLTRHc5dk6s) | Traversy Media | EN | ~28 min |
| [桑莫。夏天：Mocha/Chai/Sinon 入門](https://www.cythilya.tw/2017/09/17/unit-test-with-mocha-chai-and-sinon/) | Blog | zh-TW | 文章 |

> zh-TW 影片在 Mocha 主題很稀缺，建議搭配上面那篇文章看。

### Enzyme（可選，補充用）
| 影片 / 資源 | 頻道 / 來源 | 語言 | 長度 |
|---|---|---|---|
| [Enzyme Tutorial - How to Write Test Code](https://www.youtube.com/watch?v=nvL2ha0XUYo) | Coding with Basir | EN | ~20 min |
| [Mount vs Shallow（最常被問）](https://www.youtube.com/watch?v=kjGw358TZIE) | Codevolution | EN | ~12 min |
| [LogRocket: RTL vs Enzyme 對照](https://blog.logrocket.com/testing-react-components-react-testing-library-vs-enzyme/) | 文章 | EN | 15 min 閱讀 |

> ⚠️ Enzyme 已不支援 React 17+/18，影片普遍偏舊。
> **面試只要記得「`shallow` vs `mount` 差別 + 為什麼被 RTL 取代」即可，不用深學。**

---

## ⚙️ 一次性設定（5 分鐘）

開一個練習用的小專案資料夾，把這個 `practice/` 整個複製過去：

```powershell
cp -r C:\coding\futuresign\Abby-notes\frontend-docs\testing\practice C:\coding\test-practice
cd C:\coding\test-practice
npm install
```

`npm install` 會根據附帶的 `package.json` 裝好：
- Jest + React Testing Library + user-event + jest-dom
- Mocha + Chai
- Babel（讓 JSX 與 import 都能跑）

---

## 🚀 怎麼跑

```powershell
# 跑所有 Jest 測試（練習 1、2、4）
npm test

# 跑單一檔
npm test -- 01-bubbleSort

# 跑 Mocha 測試（練習 3）
npm run test:mocha
```

---

## 📋 練習清單

| # | 練習 | 對應 Day | 工具 |
|---|---|---|---|
| 1 | Bubble Sort 排序函式 | Day 2 | Jest |
| 2 | `<Button>` / `<Counter>` 元件 | Day 3 | Jest + RTL + user-event |
| 3 | `formatPrice` / `applyDiscount` | Day 4 | Mocha + Chai |
| 4 | `<PostList>` 打 API、mock fetch | Day 6 | Jest + fetch mock |

每個練習都有：
- 一個**已實作好**的源檔（`.js` / `.jsx`）
- 一個**待填寫**的測試檔（`.test.js` / `.test.jsx` / `.spec.js`），裡面有 `// TODO` 和 `// 提示`

---

## 💡 練習流程建議

1. 開 `.test.js` 檔
2. 看每個 `it(...)` 描述 → 在 body 寫測試
3. `npm test` 看是否通過
4. 卡住 → 看 `// 提示` 行
5. 完成跟我說「**練習 X 完成**」，我幫你 review、給延伸題

---

## 🐛 常見問題

| 症狀 | 解法 |
|---|---|
| `SyntaxError: Cannot use import statement outside a module` | 確認 `package.json` 有 `"type": "module"`（已預設好） |
| Jest 找不到 JSX | 確認 `babel.config.cjs` 存在 |
| `userEvent.click` 報 not a function | 用 `userEvent.setup()` 取得實例後再呼叫 |
| Mocha 找不到測試 | 確認檔名是 `.spec.js`，且 `npm run test:mocha` 不是 `npm test` |
