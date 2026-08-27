---
title: "npm-run-script-mechanism"
---

> `npm run dev` 裡的 `run` 到底是誰加的？記錄 `package.json` `scripts` 欄位的運作機制，順便記錄當時環境版本號。專案:`next-one-main`。

## 環境版本(記錄當下)

```bash
node --version   # v24.14.0
npm --version    # 11.9.0
```

## 結論:`run` 不是 npm 自動幫你加的

```json
// package.json
"scripts": {
  "dev": "rimraf .next && next dev --turbopack -p 3001",
  "build": "next build",
  "start": "next start"
}
```

- `"dev"`、`"build"` 這些是**你自己取的名字**(key),對應的字串才是真正要執行的指令
- `run` 是 **npm 本身的子指令**,意思是「去 `scripts` 物件裡找這個 key,把對應的字串丟給系統 shell 執行」
- 是**你自己打 `npm run dev`** 的時候,`run` 這個字就已經在你打的指令裡了——不是 npm 看到 `dev` 這個名字之後,自動幫你補上 `run`

規則永遠是:

```
npm run <scripts裡的任意key>
```

## 例外:少數保留字可以省略 `run`

npm 內建認得幾個**慣例保留字**,這幾個可以省略 `run`:

| 完整寫法 | 可省略成 |
|---|---|
| `npm run start` | `npm start` |
| `npm run test` | `npm test` |
| `npm run stop` | `npm stop` |
| `npm run restart` | `npm restart` |

這個專案的 `"start": "next start"` 就是靠這個特性,可以直接打 `npm start`。但 `"dev"`、`"build"` 不在這個保留字清單裡,**一定要打 `npm run dev`、`npm run build`**,少打 `run` 會直接被 shell 當成不存在的指令。

## 為什麼有這個保留字設計?

這幾個保留字(`start` / `test` / `stop` / `restart`)源自 npm 早期對「套件生命週期」的慣例——在 `npm` 生態系統裡,套件被期待要有一致的入口點(啟動、測試、停止),所以 npm 把這幾個名字內建成快捷方式。其他任意自訂名字(`dev`、`build`、`lint`、`deploy`...)npm 沒辦法預先知道,所以都要透過 `run` 明確指定。

## 相關筆記

- [[next-turbopack-server-chunks-hash-comparison]] — 同一個專案,追 CORS 問題時順便釐清的 Turbopack chunks 懶編譯行為
