# Menu vs Accordion 組件對比

## 核心區別

### Menu（下拉菜單）
- **用途**：顯示選項列表，供用戶選擇操作
- **行為**：點擊按鈕 → 顯示下拉菜單 → 選擇選項 → 菜單關閉
- **特點**：臨時顯示，選擇後自動關閉

### Accordion（手風琴）
- **用途**：展開/收合內容區塊，顯示詳細信息
- **行為**：點擊按鈕 → 展開/收合內容 → 可以保持展開狀態
- **特點**：持久顯示，可以同時展開多個

## 組件結構對比

### Menu 組件結構

```
Menu (最外層容器)
  ├── MenuButton (觸發按鈕)
  └── MenuList (下拉菜單列表)
      └── MenuItem (菜單選項)
          └── MenuItem (菜單選項)
          └── MenuItem (菜單選項)
```

### Accordion 組件結構

```
Accordion (最外層容器)
  └── AccordionItem (單個項目)
      ├── AccordionButton (觸發按鈕)
      └── AccordionPanel (展開的內容)
  └── AccordionItem (單個項目)
      ├── AccordionButton (觸發按鈕)
      └── AccordionPanel (展開的內容)
```

## 詳細對比

| 特性 | Menu | Accordion |
|------|------|-----------|
| **主要用途** | 選擇操作/選項 | 展開/收合內容 |
| **顯示方式** | 下拉菜單（浮動） | 內聯展開（佔位） |
| **交互方式** | 點擊 → 選擇 → 關閉 | 點擊 → 展開/收合 |
| **保持狀態** | 選擇後關閉 | 可以保持展開 |
| **多選支持** | 不支持（選擇即關閉） | 支持（`allowMultiple`） |
| **內容類型** | 操作選項列表 | 詳細信息展示 |

## 代碼示例對比

### Menu 示例（公司狀態選擇）

```tsx
<Menu>
  {/* 觸發按鈕 */}
  <MenuButton
    as={Badge}
    colorScheme="green"
    variant="subtle"
    cursor="pointer"
  >
    已核可 ▼
  </MenuButton>

  {/* 下拉菜單列表 */}
  <MenuList minW="120px" zIndex={10}>
    {/* 菜單選項 */}
    <MenuItem onClick={() => handleStatusChange("pending")}>
      <Badge colorScheme="yellow">待審核</Badge>
    </MenuItem>
    <MenuItem onClick={() => handleStatusChange("active")}>
      <Badge colorScheme="green">已核可</Badge>
    </MenuItem>
    <MenuItem onClick={() => handleStatusChange("denied")}>
      <Badge colorScheme="red">已拒絕</Badge>
    </MenuItem>
  </MenuList>
</Menu>
```

**行為**：
1. 用戶點擊 "已核可 ▼" 按鈕
2. 顯示下拉菜單（浮動在按鈕下方）
3. 用戶選擇 "待審核"
4. 執行 `handleStatusChange("pending")`
5. 菜單自動關閉

### Accordion 示例（發票詳情展開）

```tsx
<Accordion allowMultiple>
  {invoices.map((invoice) => (
    <AccordionItem key={invoice.id}>
      {/* 觸發按鈕 */}
      <AccordionButton>
        <Text>發票號碼: {invoice.number}</Text>
        <Text>訂單編號: {invoice.orderNumber}</Text>
        <Badge>已開立</Badge>
      </AccordionButton>

      {/* 展開的內容 */}
      <AccordionPanel>
        <VStack>
          <Text>發票金額: NT$ {invoice.amount}</Text>
          <Text>開立日期: {invoice.date}</Text>
          <Text>統一編號: {invoice.taxId}</Text>
        </VStack>
      </AccordionPanel>
    </AccordionItem>
  ))}
</Accordion>
```

**行為**：
1. 用戶點擊發票行
2. 該行的詳細內容展開（向下推開其他內容）
3. 詳細內容保持展開狀態
4. 用戶可以再次點擊收合
5. 可以同時展開多個發票詳情

## 視覺效果對比

### Menu（下拉菜單）

```
┌─────────────────┐
│  已核可 ▼       │  ← MenuButton（可見）
└─────────────────┘
        │
        ▼ 點擊後
┌─────────────────┐
│  已核可 ▼       │
├─────────────────┤
│  待審核         │  ← MenuList（浮動顯示）
│  已核可         │
│  已拒絕         │
└─────────────────┘
        │
        ▼ 選擇後自動關閉
┌─────────────────┐
│  待審核 ▼       │  ← 按鈕文字更新
└─────────────────┘
```

### Accordion（手風琴）

```
┌─────────────────────────────┐
│ 發票號碼: VN001  訂單: ORD1 │  ← AccordionButton（可見）
└─────────────────────────────┘
        │
        ▼ 點擊後展開
┌─────────────────────────────┐
│ 發票號碼: VN001  訂單: ORD1 │
├─────────────────────────────┤
│ 發票金額: NT$ 1000          │  ← AccordionPanel（展開）
│ 開立日期: 2025-01-01        │
│ 統一編號: 12345678          │
└─────────────────────────────┘
        │
        ▼ 再次點擊收合
┌─────────────────────────────┐
│ 發票號碼: VN001  訂單: ORD1 │  ← 恢復原狀
└─────────────────────────────┘
```

## 使用場景

### Menu 適用場景

1. **狀態選擇**
   ```tsx
   // 公司審核狀態選擇
   <Menu>
     <MenuButton>已核可 ▼</MenuButton>
     <MenuList>
       <MenuItem>待審核</MenuItem>
       <MenuItem>已核可</MenuItem>
       <MenuItem>已拒絕</MenuItem>
     </MenuList>
   </Menu>
   ```

2. **操作菜單**
   ```tsx
   // 更多操作菜單
   <Menu>
     <MenuButton>⋮</MenuButton>
     <MenuList>
       <MenuItem>編輯</MenuItem>
       <MenuItem>刪除</MenuItem>
       <MenuItem>複製</MenuItem>
     </MenuList>
   </Menu>
   ```

3. **下拉選擇**
   ```tsx
   // 篩選條件選擇
   <Menu>
     <MenuButton>選擇狀態</MenuButton>
     <MenuList>
       <MenuItem>全部</MenuItem>
       <MenuItem>進行中</MenuItem>
       <MenuItem>已完成</MenuItem>
     </MenuList>
   </Menu>
   ```

### Accordion 適用場景

1. **列表詳情展示**
   ```tsx
   // 發票列表，點擊查看詳情
   <Accordion>
     {invoices.map(invoice => (
       <AccordionItem>
         <AccordionButton>發票 {invoice.number}</AccordionButton>
         <AccordionPanel>詳細信息...</AccordionPanel>
       </AccordionItem>
     ))}
   </Accordion>
   ```

2. **FAQ 問答**
   ```tsx
   // 常見問題展開
   <Accordion>
     {faqs.map(faq => (
       <AccordionItem>
         <AccordionButton>{faq.question}</AccordionButton>
         <AccordionPanel>{faq.answer}</AccordionPanel>
       </AccordionItem>
     ))}
   </Accordion>
   ```

3. **分類內容展示**
   ```tsx
   // 公司信息分類展示
   <Accordion>
     <AccordionItem>
       <AccordionButton>基本資訊</AccordionButton>
       <AccordionPanel>公司名稱、地址...</AccordionPanel>
     </AccordionItem>
     <AccordionItem>
       <AccordionButton>聯絡資訊</AccordionButton>
       <AccordionPanel>電話、郵箱...</AccordionPanel>
     </AccordionItem>
   </Accordion>
   ```

## 本專案中的實際使用

### Menu 使用範例（companies.tsx）

```tsx
{/* 審核狀態選擇 */}
<Menu>
  <MenuButton
    as={Badge}
    colorScheme="green"
    variant="subtle"
    cursor="pointer"
  >
    已核可 ▼
  </MenuButton>
  <MenuList minW="120px" zIndex={10}>
    {companyStatusOptions.map((option) => (
      <MenuItem
        key={option.value}
        onClick={() => handleStatusChange(company.id, option.value)}
      >
        <Badge colorScheme={option.color}>
          {option.label}
        </Badge>
      </MenuItem>
    ))}
  </MenuList>
</Menu>
```

**用途**：讓用戶選擇並更改公司審核狀態

### Accordion 使用範例（companies.tsx）

```tsx
<Accordion allowMultiple defaultIndex={[]} variant="enclosed">
  {companies.data.map((company) => (
    <AccordionItem key={company.id}>
      <AccordionButton>
        {/* 公司列表標題行 */}
        <Text>{company.company_name}</Text>
        <Badge>{company.status}</Badge>
      </AccordionButton>
      <AccordionPanel>
        {/* 公司詳細資訊 */}
        <Grid templateColumns="repeat(3, 1fr)">
          <Box>基本資訊...</Box>
          <Box>負責人資訊...</Box>
          <Box>聯絡人資訊...</Box>
        </Grid>
      </AccordionPanel>
    </AccordionItem>
  ))}
</Accordion>
```

**用途**：讓用戶展開查看公司詳細信息

## 關鍵區別總結

| 特性 | Menu | Accordion |
|------|------|-----------|
| **顯示位置** | 浮動在下拉菜單中 | 內聯在頁面中 |
| **交互目的** | 選擇操作 | 查看詳情 |
| **狀態保持** | 選擇後關閉 | 可以保持展開 |
| **內容類型** | 操作選項 | 詳細信息 |
| **多選支持** | ❌ | ✅ (allowMultiple) |
| **Z-index** | 需要（浮動） | 不需要（內聯） |

## 如何選擇？

### 使用 Menu 當：
- ✅ 需要讓用戶**選擇**一個選項
- ✅ 需要執行**操作**（編輯、刪除、更改狀態）
- ✅ 選項數量較少（通常 2-10 個）
- ✅ 不需要顯示詳細內容

### 使用 Accordion 當：
- ✅ 需要**展示詳細信息**
- ✅ 內容較長，需要展開/收合
- ✅ 需要同時查看多個項目的詳情
- ✅ 內容是**信息展示**而非操作選擇

## 常見問題

### Q: Menu 和 Accordion 可以一起使用嗎？

**A:** 可以！例如在 AccordionButton 中使用 Menu：

```tsx
<AccordionItem>
  <AccordionButton>
    <Text>公司名稱</Text>
    {/* 在 AccordionButton 中使用 Menu */}
    <Menu>
      <MenuButton>操作 ▼</MenuButton>
      <MenuList>
        <MenuItem>編輯</MenuItem>
        <MenuItem>刪除</MenuItem>
      </MenuList>
    </Menu>
  </AccordionButton>
  <AccordionPanel>詳細信息...</AccordionPanel>
</AccordionItem>
```

### Q: Menu 可以保持打開狀態嗎？

**A:** 不可以。Menu 設計為選擇後自動關閉。如果需要保持打開，應該使用 Popover 或 Modal。

### Q: Accordion 可以用來做選擇嗎？

**A:** 不建議。Accordion 主要用於展示信息。如果需要選擇，應該使用 Menu、Select 或 Radio。

## 總結

- **Menu** = 下拉菜單，用於**選擇操作**（選擇後關閉）
- **Accordion** = 手風琴，用於**展開詳情**（可以保持展開）
- **MenuButton** = 觸發下拉菜單的按鈕
- **AccordionButton** = 觸發展開/收合的按鈕
- **MenuList** = 下拉菜單的選項列表
- **AccordionPanel** = 展開後的詳細內容區域
