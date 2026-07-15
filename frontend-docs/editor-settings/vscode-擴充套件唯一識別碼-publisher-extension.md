---
title: VS Code 擴充套件唯一識別碼（publisher.extension）與 defaultFormatter
type: concept-note
tags: [vscode, cursor, extension, prettier, esbenp, defaultFormatter, 設定]
updated: 2026-07-02
---

# VS Code 擴充套件唯一識別碼 `publisher.extension`

## 什麼是 `esbenp.prettier-vscode`

VS Code／Cursor 每個擴充套件都有一個**全域唯一 ID**，格式固定是 **`發行者.套件名`**：

| 部分 | 例子 | 意思 |
|---|---|---|
| 發行者 ID（publisher） | `esbenp` | Esben Petersen，Prettier VS Code 版原作者 |
| 套件名（extension name） | `prettier-vscode` | 套件本身的名字 |
| 合起來 | `esbenp.prettier-vscode` | 這套件在市集裡**獨一無二的門牌號** |

概念等同 npm 的 `@scope/package` —— 前綴（發行者）確保全世界不撞名。

## 幹嘛用（為什麼設定要寫這一長串）

1. **消除歧義**：同一種檔案可能有多個套件都能格式化（好幾個 HTML formatter）。
   ```json
   "[html]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
   ```
   這是明確指定「HTML 就用這一個」，否則 VS Code 會跳「偵測到多個 formatter，請選擇」的提示卡住。
2. **防撞名**：不同發行者可能都把套件取名 prettier，加上發行者前綴才分得出來。
3. **命令列安裝／自動化也用它**：`code --install-extension esbenp.prettier-vscode`。

## 怎麼查一個套件的 ID

- 擴充套件市集頁面，或套件詳情頁右側「Identifier」欄位。
- 設定 `defaultFormatter` 時 VS Code 的下拉選單會直接列出可選 ID。

> 一句話：`publisher.extension` 就是套件的身分證字號，設定裡要「指名道姓」時就用它。

## 易混：`editor.` 的 `editor` 跟 `esbenp` 是不同種東西

settings.json 裡有兩種「用點分隔」的字串，長得像但意義完全不同：

```
"editor.defaultFormatter": "esbenp.prettier-vscode"
 └──┬──┘ └──────┬──────┘   └────────┬────────┘
  分類    設定名(key)              值(value)
  左邊：設定的「分類命名空間」        右邊：套件的「發行者.套件名」
```

- **左邊 `editor`** = **設定分類（namespace）**，不是發行者也不是人名，只表示「這條設定屬於哪個功能」。很多設定（游標、字體、格式化、提示）都屬核心編輯器，所以一堆 key 都以 `editor.` 開頭。
- **右邊 `esbenp.prettier-vscode`** = **套件 ID**（發行者.套件名），出現在「值」的位置。

各前綴屬於誰：

| key 前綴 | 屬於 | 種類 |
|---|---|---|
| `editor.*`、`files.*`、`workbench.*`、`window.*`、`git.*`、`terminal.*` | VS Code 核心各功能 | 內建功能分類 |
| `emmet.*` | Emmet（VS Code 內建） | 內建功能分類 |
| `todohighlight.*`、`liveServer.*`、`gitlens.*`、`cursor.*`、`bitoAI.*` | 各擴充套件 | 套件自訂的設定分類 |

### 陷阱：設定前綴 ≠ 發行者

TODO Highlight 的**設定前綴**是 `todohighlight.*`，但它的**套件 ID** 其實是 `wayou.vscode-todo-highlight`（發行者 `wayou`）。設定前綴是套件自取的「功能短名」，跟 publisher.extension 常常**不一樣**，別把 key 前綴當發行者。

> 收尾：`editor`＝設定的分類（冒號**左邊**）；`esbenp`＝套件的發行者（冒號**右邊**當值）。位置不同、用途不同，不能相提並論。
