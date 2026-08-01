# 閉包(Closure) vs 參數鑽透(Argument / Prop Drilling)

## 範例來源
- 影片：**什麼是閉包(closure)？解說+範例【JavaScript基礎】**
- 連結：https://www.youtube.com/watch?v=0rP4YzGdvEU&t=50s
- 對應練習檔：`C:\coding\JavaScript-practicing\closure_react\closure_shop.html`
- 作者在 **6:31** 提到 `userDiscounts`、`categoryDiscounts` 每次都要從 `main()` 往下傳，造成 drilling。

---

## 一、什麼是 Argument / Prop Drilling（參數鑽透）
資料要從外層「一層一層手動傳」到真正用到它的內層函式，
中間經過的函式即使自己用不到，也得在參數列「過個水」再往下遞。

範例裡：`main()` 拿到 `userDiscounts`、`categoryDiscounts` → 傳給 `processProducts`。

```js
processProducts(products, userDiscounts, categoryDiscounts);
```

---

## 二、重要釐清①：這個範例其實感受不到痛
`processProducts` 在 `main()` 裡**只被呼叫一次**，結果直接 `console.log`。
→ 那兩個參數也只傳一次，談不上「重複傳遞很麻煩」。

**結論**：範例把場景縮太小，drilling 的痛點被藏起來了。
閉包在這裡其實是殺雞用牛刀，作者只是借這個小場景「示範概念」。

### drilling 的痛何時才真的出現？
1. **同一份設定、反覆使用**：
```js
// 痛 👎 折扣資料沒變卻每行重抄
processProducts(batchA, userDiscounts, categoryDiscounts);
processProducts(batchB, userDiscounts, categoryDiscounts);
processProducts(batchC, userDiscounts, categoryDiscounts);
```
2. **穿過很多層中間函式**：A 傳 B、B 傳 C，中間函式自己沒用到只是過路。

---

## 三、重要釐清②：「閉包不也是一層又一層嗎？」
是，但**兩種「層」性質完全相反**：

| | 閉包的層 | drilling 的層 |
|---|---|---|
| 層怎麼來 | **定義時**函式寫在函式裡（巢狀結構） | **呼叫時**函式呼叫下一個（呼叫鏈） |
| 寫幾次 | 結構**寫一次**就固定 | **每次呼叫**都要重抄參數 |
| 內層怎麼拿外層資料 | **自動看得到，不用傳** | **每層手動接收 + 再轉交** |

> drilling 煩的不是「有很多層」，而是**每一層都要親手把東西遞下去**。
> 閉包有層，但內層**伸手就能拿到外層的東西，不用任何人遞**。

### 比喻
- **drilling = 接力傳水桶**：每個人都要伸手接、再遞給下一個（就算自己不喝）。
- **閉包 = 家裡的 Wi-Fi**：設定一次，家裡任何房間（內層函式）自動連得上，不用每間重打密碼。

---

## 三點五、重要釐清③：「閉包是不是解決了純函式問題？」→ 講反了
常見誤解。照純函式(pure function)定義：①同輸入→同輸出 ②不依賴/不改外部狀態。

- **傳參數版** `processProducts(products, userDiscounts, categoryDiscounts)`：
  輸出完全由參數決定，不偷看外面 → ✅ **這個才是純函式**。
- **閉包版** `process(products)`：除了 products 還依賴外層的
  `userDiscounts`/`categoryDiscounts`（**自由變數 free variable**），
  輸出不只取決於自己的參數 → ❌ **嚴格說反而不純**。

> 閉包不是「解決純函式問題」，而是**拿一點純度，換呼叫時不用一直帶參數**。
> 「只是拉出來而已」這個直覺對的：代價就是依賴從「明擺的參數」變成「藏起來的作用域」。

### 那閉包到底在解決什麼？跟「全域變數」比，不是跟純函式比
| 做法 | 要一直傳參數？ | 純 / 安全？ |
|---|---|---|
| 全域變數（最偷懶） | 不用傳 | ❌ 最髒：任何地方都能改、改了追不到 |
| **閉包（折衷）** | 不用傳 | 🆗 資料被**封裝**，外面碰不到 |
| 每次傳參數（最純） | 要一直傳 👎 | ✅ 最純但最囉嗦、會 drilling |

> **閉包解決的不是純函式，而是「不想一直傳參數、又不想用全域變數污染程式」的兩難。**
> 它真正換來的是 **封裝(encapsulation)**：一樣不用傳，但資料只有那個函式看得到。

### 常見追問：「閉包一定要有全域變數嗎？」→ 完全不用，剛好相反
閉包捕獲的是它**定義時那層的變數**，那層通常是**「另一個函式內部」的區域變數(local)**，不是全域。

| 做法 | 資料放哪 |
|---|---|
| 全域變數 | 全域作用域（人人可改）❌ |
| **閉包** | **外層函式的區域作用域**（只有內層函式看得到）✅ |

> 上面光譜表的意思是「閉包是**全域變數的更好替代品**」，不是「閉包**需要**全域變數」。
> 閉包要捕獲的變數**越區域越好**；捕獲全域變數反而失去封裝意義。
> **閉包的存在，正是為了讓你不用全域變數也能讓資料「被記住」。**

---

## 四、閉包版改寫（解掉 drilling）
用「工廠函式」把折扣資料**包進閉包**，回傳一個只需要 `products` 的函式：

```js
function createProductProcessor(userDiscounts, categoryDiscounts) {
  // userDiscounts / categoryDiscounts 被閉包記住，內層自動可用
  return function (products) {
    return products
      .map((product) => {
        const userDiscount = userDiscounts[product.id] || 0;
        const categoryDiscount = categoryDiscounts[product.category] || 0;
        const totalDiscount = userDiscount + categoryDiscount;
        const finalPrice = product.price - product.price * (totalDiscount / 100);
        return { ...product, finalPrice: Number(finalPrice.toFixed(2)) };
        // 註：toFixed 回傳「字串」，要 filter 數值比較先轉回 Number 才嚴謹
      })
      .filter((product) => product.finalPrice <= 80)
      .map((product) => product.id);
  };
}

// 使用：折扣資料只「設定」一次
const process = createProductProcessor(userDiscounts, categoryDiscounts);
process(batchA);
process(batchB); // 之後只管傳 products 👍
```

---

## 相關筆記
- [[return-清理記憶體-stack-frame與閉包例外]]（閉包為何能「記住」外層變數：stack frame 不被回收）
- [[IIFE-stepper-link-pattern]]
