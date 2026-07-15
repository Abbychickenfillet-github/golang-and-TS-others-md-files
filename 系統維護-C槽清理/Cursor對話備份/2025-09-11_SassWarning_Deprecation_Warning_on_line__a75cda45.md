# SassWarning Deprecation Warning on line 

> Cursor · 2025-09-11 16:18 · `a75cda45-3121-4cdf-9f09-4b326e7baa5c` · 19 則

## 你
SassWarning: Deprecation Warning on line 341, column 26 of file:///src/node_modules/bootstrap/scss/_variables.scss:341:26:

請幫我解決

## Cursor
I'll help you resolve this Sass deprecation warning from Bootstrap. Let me first examine the current state of your project to understand the issue better.

## Cursor
Now let me check the specific files that might be causing the Bootstrap Sass deprecation warning:

## Cursor
Let me examine the globals.scss file to understand the current Bootstrap import:

## Cursor
Now let me check if there are any other files importing Bootstrap Sass components directly:

## 你
我還有遇到這個問題
[Zeabur] Pod/service-68ad1bd67d2b925fee3ce782-7784b66788-xd4vd - Killing: Container frontend-web failed startup probe, will be restarted
為什麼？

## Cursor
我看到您遇到了兩個問題：

1. **Sass Bootstrap 過時函數警告**
2. **Zeabur 容器啟動失敗**

讓我先幫您解決這兩個問題。

## Cursor
讓我修正命令格式：

## Cursor
很好！構建成功了，但我看到了 Sass 過時函數的警告。現在讓我修復這些問題：

## Cursor
現在我需要修復 `signUpForm.module.scss` 中的 Sass 過時函數警告。根據構建輸出，問題是 `color.lightness()` 函數已經過時。讓我修復這個問題：

## Cursor
現在讓我測試修復是否成功：

## Cursor
太好了！Sass 過時函數警告已經修復了！現在構建成功，沒有出現 Sass deprecation warning。現在讓我處理 Zeabur 容器啟動失敗的問題：

## Cursor
讓我檢查 Zeabur 部署相關的配置檔案：

## Cursor
讓我檢查 package.json 中的啟動腳本和端口配置：

## Cursor
讓我檢查後端的啟動檔案：

## Cursor
現在讓我檢查是否有健康檢查端點：

## Cursor
很好！我發現了問題。讓我檢查是否有根路徑的健康檢查端點：

## Cursor
現在我明白問題了！Zeabur 容器啟動失敗是因為缺少健康檢查端點。讓我為後端添加一個根路徑的健康檢查端點：

## Cursor
現在讓我測試後端是否能正常啟動：
