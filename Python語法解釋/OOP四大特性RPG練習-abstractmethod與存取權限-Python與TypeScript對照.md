---
title: "OOP 四大特性 RPG 練習——abstractmethod 與存取權限、Python 與 TypeScript 對照"
type: topic-note
source: Gemini
category: tech
tags: [gemini, oop, python, typescript, 抽象類別, 繼承, 多型, 封裝, vite]
sources:
  - https://gemini.google.com/app/93a128fc81785ace
updated: 2026-09-15
---

# OOP 四大特性 RPG 練習——`abstractmethod` 與存取權限、Python 與 TypeScript 對照

> 本篇重點 a–p，共 16 個。
> 同資料夾的程式碼範例：`oop-polymorphism.py`（Python 完整可執行版）與 `oop-polymorphism.ts`（TypeScript 完整可執行版）。
> 關聯筆記：[[00-GoF-23種設計模式總覽]]（這四大特性是所有設計模式的地基）、[[高階函式與函數式範式-取代OOP三大設計模式]]（反面：用 FP 取代 OOP 的時機）、[[程序式程式設計-Procedural-Programming]]（更前一個範式）、[[isinstance]]（Python 型別判斷）。
> 關聯的原因：GoF 模式全部建立在「抽象 → 繼承 → 多型」之上，而 FP 那篇是同一個問題的另一種解法，三篇合看才知道「什麼時候該用 class、什麼時候不該」。

## 一、練習題目：英雄 RPG 戰鬥系統

一題同時吃到 OOP 四大特性。

| 特性 | 英文 | 這題用哪裡實現 |
| --- | --- | --- |
| 抽象 | Abstraction | `Hero` 是抽象類別，`attack()` 是抽象方法，只立契約不寫邏輯 |
| 封裝 | Encapsulation | `hp` 設成 protected，外部不能直接 `hero.hp = -999`，只能走 `take_damage()` |
| 繼承 | Inheritance | `Warrior` 與 `Mage` 用 `extends` / `(Hero)` 複用 `is_alive()`、`get_status()` |
| 多型 | Polymorphism | 陣列型別是 `Hero[]`，迴圈裡統一呼叫 `attack()`，戰士與法師卻跑出不同行為 |

### 需求規格

(a) **抽象類別 `Hero`**：屬性 `name` / `hp` / `attack_power`；方法 `take_damage(amount)`（HP 不得低於 0）、`is_alive()`、`get_status()`；`attack(target)` 是抽象方法，強制子類別實作。
(b) **`Warrior`（戰士）**：多一個 `armor`，**覆寫** `take_damage()` 先用護甲抵扣再扣 HP；`attack()` 造成 `attack_power` 的物理傷害。
(c) **`Mage`（法師）**：多一個 `mp`；`attack()` 在 `mp >= 10` 時消耗 10 MP 打 `attack_power * 2` 的魔法傷害，否則改普攻並回 5 MP。

## 二、`@abstractmethod` 跟 `public` 有關係嗎

<mark style="background: #FF5582A6;">**沒有關係，它們解決的是完全不同的問題。**</mark>

| 特性 | `@abstractmethod`（抽象方法） | `public` / `protected` / `private`（存取修飾子） |
| --- | --- | --- |
| 核心目的 | 規範繼承架構 | 規範資料封裝與權限 |
| 它在回答什麼問題 | 「子類別有沒有把這個方法寫出來？」 | 「誰可以呼叫這個方法或讀這個屬性？」 |
| 運作機制 | 強制子類別覆寫，沒寫就不能建立實例 | 限制外部／子類別／內部的存取範圍 |

(d) `@abstractmethod` 管的是 **繼承規格**：父類別只立契約（宣告名稱），子類別沒實作就會在 instantiate 的當下報錯。
(e) `public` / `protected` / `private` 管的是 **存取權限**，屬於封裝（Encapsulation）。
(f) **兩者可以組合**：抽象方法通常是 public（要給外部呼叫），但也可以是 protected（規定子類別要實作某段內部計算）。

### Python 沒有存取關鍵字，只有命名慣例

| 想表達 | Python 寫法 | 實際效果 |
| --- | --- | --- |
| public | `def attack(self):` | 大家都能呼叫 |
| protected | `def _calc(self):`（單底線） | 只是**提示**「內部與子類別才該用」，語言不會擋 |
| private | `def __calc(self):`（雙底線） | 觸發 **name mangling**，屬性被改名成 `_ClassName__calc`，外部不容易直接碰 |

(g) **Python 的封裝是君子協定**：單底線完全靠自律，雙底線也只是改名不是真的鎖住。
(h) **TypeScript 的 `private` 是編譯期檢查**：transpile 成 JS 之後就沒了，要真正的執行期私有請用 `#field`（ES 原生 private class field）。

## 三、兩個常見的初學錯誤

### 錯誤一：`NameError: name 'Warrior' is not defined`

(i) Python 由上往下執行，如果檔案裡只貼了測試區塊、沒有把 `class Hero` / `class Warrior` 的定義放在前面，跑到 `Warrior(...)` 時就會說找不到這個名稱。**解法：把類別定義放在檔案上半部。**

### 錯誤二：`def__init__` 少一個空格

(j) `def` 與 `__init__` 之間**必須有空格**，否則 Python 會丟 `SyntaxError`。

### 型別提示是給編輯器看的

(k) `def attack(self, target: 'Hero') -> None:` 的 `: 'Hero'` 與 `-> None` 對 Python **執行結果完全沒有影響**，只是讓 VS Code 能給更好的自動補全。字串形式的 `'Hero'` 是因為類別當下還沒定義完（forward reference）。

## 四、終端機怎麼跑 Python

Abby 之前把「虛擬環境啟動路徑」跟「檔名」黏在同一行了，要分兩步：

```powershell
# 步驟 A：啟動虛擬環境（CMD 用 activate.bat，PowerShell 用 activate.ps1）
C:\coding\futuresign\claude-log-cli\.venv\Scripts\activate.ps1

# 步驟 B：執行檔案
python oop-polymorphism.py
```

| 需求 | 指令 |
| --- | --- |
| 執行檔案 | `python 檔名.py`（多版本共存時可能要 `python3`） |
| 檢查版本 | `python --version` |
| 進入互動式環境 | `python`（離開輸入 `exit()`） |

(l) **一行一個指令**，兩個路徑黏在一起 shell 會當成一個不存在的檔名。

## 五、不用 Next.js，怎麼在原生環境寫 TypeScript 並 `npm i`

瀏覽器有兩件事做不到：<mark style="background: #FFF3A3A6;">**看不懂 TypeScript，也不知道 `import dayjs from 'dayjs'` 的 `'dayjs'` 要去哪裡找。**</mark>所以需要一個 build tool 幫你 transpile 與 resolve。

```bash
# 1. 建立 Vanilla + TypeScript 專案（不含任何框架）
npm create vite@latest my-ts-app -- --template vanilla-ts
cd my-ts-app
npm install

# 2. 之後就能正常裝任何套件
npm i dayjs axios

# 3. 啟動 dev server
npm run dev
```

(m) **Vite 在開發期做的事**：dev server 把 `.ts` 即時 transpile 成瀏覽器看得懂的 JS，並把裸模組名（bare specifier）`'dayjs'` resolve 成 `node_modules` 裡的實際路徑。
(n) **`npm run build` 時做的事**：把你的 TS 與 `node_modules` 的相依一起打包成標準 JS 與 HTML，可直接部署。
(o) **`vanilla-ts` 模板**的意思是「原生 JS ＋ TypeScript，不含任何框架」，見 [[Dev-Server在Node環境-devServer-proxy繞過CORS-HMR用WebSocket-與原生語言打包工具]]。

(p) **為什麼不能只用 `tsc` 配 `<script>`**：`tsc` 只負責把 TS transpile 成 JS，不負責把 `node_modules` 的相依打包進來，瀏覽器拿到 `import 'dayjs'` 依然無法 resolve。

## 六、延伸練習（LeetCode / NeetCode）

| 題號 | 題目 | 為什麼相關 | 連結 |
| --- | --- | --- | --- |
| 1603 | Design Parking System | 最小的 class 設計題，練封裝與狀態 | https://leetcode.com/problems/design-parking-system/ |
| 155 | Min Stack | 練「對外只暴露安全方法」的封裝 | https://leetcode.com/problems/min-stack/ |
| 355 | Design Twitter | 多個類別互相持有，練繼承與組合的取捨 | https://leetcode.com/problems/design-twitter/ |
| — | NeetCode「Design」分類 | 整組 OOP 設計題 | https://neetcode.io/practice |

## 七、資料來源（含查證時間）

| 主題 | 連結 | 版本／時間 |
| --- | --- | --- |
| 本篇原始對話（Gemini） | https://gemini.google.com/app/93a128fc81785ace | 對話擷取 2026-09-15 |
| Python `abc` — Abstract Base Classes | https://docs.python.org/3/library/abc.html | Python 3 官方文件，查證 2026-09-15 |
| Python 私有變數與 name mangling | https://docs.python.org/3/tutorial/classes.html#private-variables | Python 3 Tutorial，查證 2026-09-15 |
| TypeScript Classes（`abstract`、修飾子） | https://www.typescriptlang.org/docs/handbook/2/classes.html | TS Handbook，查證 2026-09-15 |
| Vite `vanilla-ts` 模板 | https://vite.dev/guide/#scaffolding-your-first-vite-project | Vite 官方，查證 2026-09-15 |
