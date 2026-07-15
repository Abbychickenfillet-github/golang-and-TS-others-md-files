# pip install fastapi uvicorn

> Cursor · 2025-11-13 17:50 · `d15d54df-f482-436d-b405-ac49449c6d0f` · 24 則

## 你
pip install fastapi uvicorn 
uvicorn是什麼套件

## Cursor
已完成 `pip install fastapi uvicorn`，兩個套件都已安裝。

關於 `uvicorn`：它是支援 ASGI (Asynchronous Server Gateway Interface) 的高效能 Web 伺服器，常用來啟動像 FastAPI、Starlette 這類 async 框架寫成的應用程式。用途與傳統 WSGI 伺服器類似，但支援非同步、WebSocket 等現代功能。若要啟動 FastAPI 應用，可執行類似 `uvicorn main:app --reload` 的命令。

若還需要啟動範例或檢查版本，隨時告訴我。

## 你
我想啟動看看
uvicorn main:app --reload

## Cursor
`uvicorn main:app --reload` 已在背景啟動；伺服器預設會在 `http://127.0.0.1:8000` 提供服務。若要停止，回到終端機按 `Ctrl+C` 即可。需要我幫忙測試或檢查輸出，隨時說。

## 你
啟動了但有什麼特別之處嗎它可以做什麼為什麼我看到bootstrap

## Cursor
調整了 `main.py` 的路由寫法，現在是標準版 FastAPI 範例，會回傳 `{"Hello": "World"}`。重新載入後，伺服器應該就能在 `http://127.0.0.1:8000` 正常運作，你可以開 `/docs` 看互動式 API。

你看到的 `importlib._bootstrap` 訊息不是在講 Bootstrap CSS；那是 Python 內部的模組載入流程。剛剛因為程式碼語法錯誤（括號和字典寫法寫壞）才一直報錯，修好就不會再出現了。

FastAPI/uvicorn 的特色：支援非同步、速度快、內建自動產生 OpenAPI/Swagger 文件，可方便撰寫 REST API。如果要停掉伺服器，在終端按 `Ctrl+C` 即可，之後想玩別的路由再告訴我。

## 你
openAI跟swagger文件又是什麼

## Cursor
OpenAI：是一家公司與研發團隊，致力於人工智慧，負責推出像 ChatGPT、GPT-4/5 等大型語言模型與相關服務。開發者可透過他們的 API 將自然語言理解或生成等能力整合進自己的應用程式。

Swagger/OpenAPI：OpenAPI（常被稱為 Swagger）是一套描述 REST API 的開放規格；FastAPI 會自動依 OpenAPI 規格產生文件與互動式測試介面（Swagger UI）。啟動 FastAPI 後瀏覽 `http://127.0.0.1:8000/docs` 就能看到 Swagger UI，可以直接試打 API。

## 你
為什麼我的終端機沒有出現apple

## Cursor
FastAPI 路由已正確收到你新增的 `apple`，但你在 PowerShell 看到的行為跟影片不一樣主要是因為：

- `curl` 在 PowerShell 中其實是 `Invoke-WebRequest` 的別名，它會回傳一個 .NET 物件，而不是像 Linux/macOS 那樣直接把回應內容印出來，所以終端機不會自動顯示 `["apple"]`。
- 影片裡是用原生的 `curl`（或 `Invoke-RestMethod`），會把 JSON 直接寫到標準輸出。

幾個替代作法：

- 改用 `curl.exe`（Windows 會同時有這個）：
  ```
  curl.exe -X POST "http://127.0.0.1:8000/items?item=apple"
  ```
- 或用 PowerShell 的 `Invoke-RestMethod`：
  ```
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/items?item=apple"
  ```
- 如果你仍想用 `curl` 但帶 header，可用 `--%` 關閉 PowerShell 的參數解析：
  ```
  curl --% -X POST -H "Content-Type: application/json" "http://127.0.0.1:8000/items?item=apple"
  ```

這樣就能看到 FastAPI 回傳的 JSON（例如 `["apple"]`），同時你的 `items` 清單也會被更新。

## 你
幫我執行   curl --% -X POST -H "Content-Type: application/json" "http://127.0.0.1:8000/items?item=apple"

## Cursor
PowerShell 仍把 `curl` 當成 `Invoke-WebRequest`，即使加了 `--%` 也沒成功套進參數，才會出現 `-X POST` 找不到對應參數的錯誤。

改用內建的 `curl.exe`（真正的 curl）就能成功：

```
curl.exe -X POST -H "Content-Type: application/json" "http://127.0.0.1:8000/items?item=apple"
```

或是直接用 PowerShell 的 `Invoke-RestMethod`：

```
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/items?item=apple"
```

兩者都會把 FastAPI 回傳的 JSON 顯示出來。需要我再跑一次其中一個指令，跟我說就行。

## 你
請幫我試到有為止

## Cursor
`curl.exe -X POST -H "Content-Type: application/json" "http://127.0.0.1:8000/items?item=apple"` 使用成功，伺服器回傳 `["apple"]`。如果再貼一次指令就會看到清單持續累積。若想改成從 JSON body 讀值或做更進階的驗證，可以再說。

## 你
影片author用mac跟我不太一樣請轉成我能用的指令

## Cursor
Mac 教學裡用的是原生 `curl`，在 Windows PowerShell 只要改成下面這些指令就能得到一樣的效果：

- `GET /`：`curl.exe http://127.0.0.1:8000`
- `POST /items` 加 query 參數：`curl.exe -X POST -H "Content-Type: application/json" "http://127.0.0.1:8000/items?item=apple"`
- 更進階用 PowerShell 內建 cmdlet：`Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/items?item=apple"`

`curl.exe` 是 Windows 自帶的真正 curl，可直接照影片那樣傳遞 query 參數；`Invoke-RestMethod` 則會自動解析 JSON 回傳。如果還要送 JSON body，再告訴我。

## 你
還是我剛剛其實應該要在myvirenv中的終端機執行不應該開新的powershell terminal

## Cursor
不一定要在 `myvirenv` 那個視窗操作；重點只是要先啟用那個虛擬環境，之後在同一個 PowerShell 裡跑指令就行。你目前的做法：

1. `& c:\coding\backend-fastapi\myvirenv\Scripts\Activate.ps1`（或用 IDE 幫你啟用）
2. 看到提示變成 `(myvirenv) PS C:\coding\backend-fastapi>` 後，就可以在這個 shell 下執行 `uvicorn`、`curl.exe` 等指令
3. 如果開另一個 PowerShell 視窗沒啟用環境，就會用到系統的 Python/套件，可能發現套件沒裝或版本不同

我剛剛幫你跑的指令也都是在專案根目錄並已啟用虛擬環境的 shell 中執行，所以沒問題。下次只要確定先 `Activate`，無論是不是同一個終端機都可以。

## 你
為什麼加了這一段以後服務氣就會重新加載並且items陣列會被清空重設

## Cursor
`uvicorn` 加上 `--reload` 會開啟程式碼監看器，只要偵測到 `main.py` 有變動或保存，就整個重新啟動應用程式。這時候：

- 會關掉原本的 worker、再重新 import `main.py`；
- 你的 `items: list[str] = []` 是在模組層級定義的全域變數，每次模組重新載入都會重新建立成空陣列；
- 所以一旦你新增 `get_item` 這段並存檔，就觸發重載，清單自然被清空。

如果想調整行為：

- 開發階段需要 hot reload，就接受這種「記憶體內資料會重設」的特性；
- 如果真的要留資料，要放到 DB、檔案或別的持久化儲存，不要靠全域 list；
- 或者暫時用 `uvicorn main:app`（不帶 `--reload`）就不會自動重啟，但也得自己重啟來載入新程式碼。

因此目前看到的情況是正常的 hot reload 行為。

## 你
def get_item(item_id: int) -> str:這個小箭頭跟str冒號是什麼意思

## Cursor
`item_id: int` 裡的冒號是參數型別註記，表示 `item_id` 預期是 `int`；`-> str` 是函式的回傳型別註記，告訴讀程式的人（和工具）這個函式會回傳 `str`。這些都是 Python 的型別提示，不會改變執行結果，只是提升可讀性，也讓編輯器/靜態分析工具能幫忙檢查型別。

## 你
為什麼我的0沒有東西method not allowed?

## Cursor
因為 `curl.exe -i -X POST "http://127.0.0.1:8000/items/0"` 發的是 **POST**，但 `main.py` 裡 `@app.get("/items/{item_id}")` 只支援 **GET**，FastAPI 就回 `405 Method Not Allowed`。把指令改成 `curl.exe http://127.0.0.1:8000/items/0`（或 `curl.exe -X GET ...`）就會拿到 `["apple","banana","bananorangea"]` 中第 0 個元素。
