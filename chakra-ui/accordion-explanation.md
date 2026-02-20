# Chakra UI Accordion 組件說明

## 組件結構

Accordion（手風琴）組件用於創建可展開/收合的內容區塊，常用於列表詳情展示。

### 組件層級結構

```
Accordion (最外層容器)
  └── AccordionItem (單個可展開項目)
      ├── AccordionButton (可點擊的標題行)
      └── AccordionPanel (展開後的內容區域)
```

### 各組件說明

#### 1. **Accordion**（最外層容器）
- **作用**：管理所有可展開/收合的項目
- **位置**：包裹所有 AccordionItem
- **主要屬性**：
  - `allowMultiple`: 是否允許多個同時展開
  - `defaultIndex`: 默認展開的索引數組
  - `index`: 受控模式的展開索引
  - `onChange`: 展開/收合時的回調函數
  - `variant`: 樣式變體

#### 2. **AccordionItem**（單個可展開項目）
- **作用**：代表一個可展開/收合的單元（例如一行發票或一個公司）
- **包含**：AccordionButton + AccordionPanel
- **位置**：在 Accordion 內部，每個項目一個

#### 3. **AccordionButton**（可點擊的按鈕區域）
- **作用**：顯示在列表中的可見部分，點擊後展開/收合
- **位置**：在 AccordionItem 內部，作為標題行
- **常用屬性**：
  - `px`, `py`: 內邊距
  - `_hover`: 懸停樣式
  - `_expanded`: 展開時的樣式

#### 4. **AccordionPanel**（展開後的內容區域）
- **作用**：點擊按鈕後展開顯示的詳細內容
- **位置**：在 AccordionButton 下方
- **常用屬性**：
  - `pb`, `px`: 內邊距
  - `bg`: 背景色

## 代碼示例

```tsx
<Accordion allowMultiple defaultIndex={[]}>
  {data.map((item) => (
    <AccordionItem key={item.id}>
      <AccordionButton>
        {/* 這裡顯示：標題行（可見部分） */}
        <Text>發票號碼: {item.invoiceNumber}</Text>
        <Text>訂單編號: {item.orderNumber}</Text>
      </AccordionButton>

      <AccordionPanel>
        {/* 這裡顯示：詳細內容（展開後顯示） */}
        <VStack>
          <Text>詳細資訊...</Text>
        </VStack>
      </AccordionPanel>
    </AccordionItem>
  ))}
</Accordion>
```

## 主要屬性說明

### `allowMultiple`

控制是否允許多個項目同時展開。

- **`allowMultiple={true}`** 或 **`allowMultiple`**：
  - ✅ 允許多個同時展開
  - 例如：可以同時展開第 1、2、3 行的詳情
  - 展開新的項目時，不會自動收合之前展開的項目

- **`allowMultiple={false}`**（或不設置，默認）：
  - ❌ 一次只能展開一個
  - 展開新的項目時，會自動收合之前展開的項目

**使用場景**：
- 需要同時查看多個項目詳情時 → 使用 `allowMultiple`
- 節省空間，一次只看一個詳情時 → 不使用 `allowMultiple`

### `defaultIndex`

設置 Accordion 的默認展開項（初始狀態）。

- **類型**：`number[]`（數字數組）
- **說明**：數組中的數字代表要展開的項目索引（從 0 開始）

**示例**：

```tsx
// 1. 默認全部收合（不展開任何項）
<Accordion allowMultiple defaultIndex={[]}>
  {/* 所有項目默認收合 */}
</Accordion>

// 2. 默認展開第一項（索引 0）
<Accordion allowMultiple defaultIndex={[0]}>
  {/* 第一項默認展開 */}
</Accordion>

// 3. 默認展開多項（需要 allowMultiple={true}）
<Accordion allowMultiple defaultIndex={[0, 2, 4]}>
  {/* 第 1、3、5 項默認展開 */}
</Accordion>
```

**注意**：
- 如果 `allowMultiple={false}`，`defaultIndex` 數組只能包含一個數字
- 如果 `allowMultiple={true}`，`defaultIndex` 可以包含多個數字

### `variant`

設置 Accordion 的樣式變體。

**常用值**：
- `"enclosed"`: 封閉樣式（帶邊框，項目之間有分隔）
- `"default"`: 默認樣式（無邊框）
- `"unstyled"`: 無樣式（完全自定義）

**示例**：

```tsx
<Accordion variant="enclosed">
  {/* 帶邊框的封閉樣式 */}
</Accordion>
```

### 受控模式 vs 非受控模式

#### 非受控模式（使用 `defaultIndex`）

```tsx
// 只設置初始狀態，之後由組件自己管理
<Accordion allowMultiple defaultIndex={[]}>
  {/* 用戶點擊後，組件自動管理展開狀態 */}
</Accordion>
```

#### 受控模式（使用 `index` + `onChange`）

```tsx
const [expandedIndex, setExpandedIndex] = useState<number[]>([0])

<Accordion
  allowMultiple
  index={expandedIndex}
  onChange={(indexes) => setExpandedIndex(indexes)}
>
  {/* 完全由 state 控制展開狀態 */}
</Accordion>
```

**使用場景**：
- 需要程序化控制展開狀態 → 使用受控模式
- 只需要初始狀態，之後由用戶操作 → 使用非受控模式

## 本專案中的使用範例

### 1. 發票管理頁面（invoices.tsx）

```tsx
<Accordion allowMultiple>
  {data.data.map((order) => (
    <InvoiceAccordionItem
      key={order.id}
      order={order}
      borderColor={borderColor}
    />
  ))}
</Accordion>
```

- **`allowMultiple`**: 允許多個發票同時展開
- **無 `defaultIndex`**: 默認全部收合（等同於 `defaultIndex={[]}`）

### 2. 公司管理頁面（companies.tsx）

```tsx
<Accordion allowMultiple defaultIndex={[]} variant="enclosed">
  {companies.data.map((company) => (
    <AccordionItem key={company.id}>
      <AccordionButton>
        {/* 公司列表標題行 */}
      </AccordionButton>
      <AccordionPanel>
        {/* 公司詳細資訊 */}
      </AccordionPanel>
    </AccordionItem>
  ))}
</Accordion>
```

- **`allowMultiple`**: 允許多個公司同時展開
- **`defaultIndex={[]}`**: 默認全部收合
- **`variant="enclosed"`**: 使用封閉樣式（帶邊框）

### 3. 電力需求管理（electricity-dashboard.tsx）

```tsx
<Accordion allowMultiple defaultIndex={[0]}>
  {/* 默認展開第一項 */}
</Accordion>
```

- **`defaultIndex={[0]}`**: 默認展開第一項（索引 0）

## 常見問題

### Q: `defaultIndex={[]}` 和 `defaultIndex={[0]}` 的區別？

**A:**
- `defaultIndex={[]}`: 空數組，表示默認不展開任何項
- `defaultIndex={[0]}`: 包含 0 的數組，表示默認展開第一項（索引從 0 開始）

### Q: `allowMultiple` 和 `defaultIndex` 的關係？

**A:**
- `allowMultiple={true}` 時，`defaultIndex` 可以包含多個數字（如 `[0, 2, 4]`）
- `allowMultiple={false}` 時，`defaultIndex` 只能包含一個數字（如 `[0]`）

### Q: 什麼時候使用受控模式？

**A:**
- 需要程序化控制展開狀態時（例如：根據搜索結果自動展開匹配項）
- 需要保存用戶的展開狀態時（例如：刷新頁面後恢復展開狀態）
- 需要根據其他狀態同步展開狀態時

### Q: AccordionItem 和 AccordionButton 的區別？

**A:**
- **AccordionItem**: 一個完整的可展開項目容器（包含按鈕和面板）
- **AccordionButton**: 可點擊的標題行（用戶看到並點擊的部分）

## 總結

- **AccordionItem** = 一個完整的可展開項目（包含按鈕和面板）
- **AccordionButton** = 可點擊的標題行（用戶看到並點擊的部分）
- **AccordionPanel** = 展開後的詳細內容區域
- **allowMultiple** = 是否允許多個同時展開（true = 可以，false = 一次只能一個）
- **defaultIndex** = 默認展開的索引數組（`[]` = 全部收合，`[0]` = 展開第一項）
- **variant** = 樣式變體（`"enclosed"` = 帶邊框的封閉樣式）
