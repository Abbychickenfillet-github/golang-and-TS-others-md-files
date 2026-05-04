# Claude Code Plugin：marketplace add vs plugin install 差異

## 一句話總結
- **`marketplace add`** = 註冊「來源」（告訴 Claude Code 去哪裡找 plugin）
- **`plugin install`** = 從註冊好的來源「裝一個 plugin 進來」

兩個是**配合使用**，不是二選一。

---

## 詳細差異

| 項目 | `marketplace add` | `plugin install` |
|------|-------------------|------------------|
| 作用 | 註冊一個 GitHub repo 當作 plugin 目錄 | 從目錄裡實際裝一個 plugin |
| 比喻 | 把一間 App Store 加到清單 | 從 App Store 下載一個 App |
| 結果 | 多了一個可選的來源 | 多了一個可用的功能 |
| 執行幾次 | 通常一次 | 每個 plugin 都要做一次 |
| 失敗 | 沒裝任何東西 | 沒功能可用 |

---

## 標準安裝流程（兩步驟）

### 第一步：加 marketplace（一次性）
```
/plugin marketplace add <owner>/<repo>
```
範例：
```
/plugin marketplace add kepano/obsidian-skills
```
✅ 結果：`Successfully added marketplace: obsidian-skills`

> 此時 plugin **還沒裝**，只是 Claude Code 知道有這個來源可以挑東西。

### 第二步：install plugin
```
/plugin install <plugin-name>@<marketplace-name>
```
範例：
```
/plugin install obsidian-skills@obsidian-skills
```

> `@` 後面是 marketplace 的名字（不是 GitHub repo 全名），通常等於 marketplace add 成功訊息裡那個名字。

### 第三步：重載
```
/reload-plugins
```

---

## 常見誤解

### ❌ 「我 add 了 marketplace，為什麼沒 skill 可用？」
因為只 add 了**來源**，沒裝**plugin**。要再跑 `/plugin install`。

### ❌ 「直接 install 不要 add 行不行？」
不行。`install` 需要指定 `@marketplace`，沒先 add 過的 marketplace 不存在。

### ❌ 「一個 marketplace 只有一個 plugin？」
不一定。一個 marketplace 可以列很多 plugins，所以 add 一次後可以 install 多個。

---

## 查看狀態
```
/plugin                        # 列出所有 plugin 狀態
/plugin marketplace list       # 列出已註冊的 marketplaces
```

---

## 實際案例：obsidian-skills（2026-04-30）

```bash
# 1. 加 marketplace
/plugin marketplace add kepano/obsidian-skills
# → Successfully added marketplace: obsidian-skills

# 2. 裝 plugin（下一步要做）
/plugin install obsidian-skills@obsidian-skills

# 3. 重載
/reload-plugins
```

裝完後 skills 會用 `obsidian-skills:*` 命名空間出現。
