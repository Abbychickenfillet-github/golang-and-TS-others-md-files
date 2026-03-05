# Go 併發（Concurrency）— 內建於語法的設計

## 為什麼 Go 特別？

大多數語言的併發是透過**套件/函式庫**實現的，Go 則是直接寫進**語法關鍵字**裡。

```go
// 這四個都是 Go 的關鍵字，不需要 import 任何東西
go         // 啟動 goroutine
chan        // 宣告 channel 型別
<-         // 送/收資料的運算子
select     // 等多個 channel
```

## 四個內建關鍵字

### 1. `go` — 啟動 goroutine（輕量級執行緒）
```go
// 在背景執行，不阻塞主程式
go doSomething()

go func() {
    fmt.Println("我在背景跑")
}()
```
- goroutine 非常輕量，一個只佔幾 KB（OS thread 通常佔 1-2 MB）
- 可以同時跑成千上萬個 goroutine

#### Goroutine 是什麼？

Goroutine 是 Go 自己管理的**輕量級執行單元**，可以想成「超輕量的背景工作」。

**用餐廳比喻：**
```
傳統 Thread（執行緒）= 請一個正職廚師
  → 成本高（1-2 MB 記憶體）、數量有限（幾百個就吃力了）

Goroutine = 請一個工讀生
  → 成本低（幾 KB 記憶體）、可以請很多（幾萬個都沒問題）
  → Go runtime 會自動分配工讀生到廚房的爐子上（OS thread）
```

**沒有 goroutine 的程式（同步）：**
```go
func main() {
    taskA()  // 做完 A 才能做 B（排隊）
    taskB()  // 做完 B 才能做 C
    taskC()
}
```

**有 goroutine 的程式（併發）：**
```go
func main() {
    go taskA()  // A 在背景跑
    go taskB()  // B 也在背景跑
    go taskC()  // C 也在背景跑
    // A、B、C 同時進行，不用排隊

    time.Sleep(time.Second) // 等它們做完（實務上用 channel 或 WaitGroup）
}
```

**跨語言對比：**
```javascript
// JavaScript — 沒有 goroutine，用 Promise 模擬併發
await Promise.all([taskA(), taskB(), taskC()])
```
```python
# Python — 用 asyncio 或 threading
import asyncio
await asyncio.gather(taskA(), taskB(), taskC())
```
```go
// Go — 只要加 go 關鍵字就好
go taskA()
go taskB()
go taskC()
```

**Goroutine vs Thread vs Process：**
| | Goroutine | Thread（執行緒） | Process（程序） |
|---|---|---|---|
| **記憶體** | 幾 KB | 1-2 MB | 幾十 MB |
| **建立速度** | 極快 | 慢 | 很慢 |
| **數量上限** | 幾十萬個 | 幾千個 | 幾百個 |
| **誰管理** | Go runtime | OS | OS |
| **通訊方式** | channel | 共享記憶體（需要鎖） | IPC / socket |

> 重點：goroutine 不是 thread。Go runtime 會把多個 goroutine 分配到少數幾個 OS thread 上執行，這叫做 **M:N 調度**（M 個 goroutine 跑在 N 個 thread 上）。

### 2. `chan` — Channel（goroutine 之間的通訊管道）
```go
ch := make(chan string)       // 無緩衝 channel
ch := make(chan string, 10)   // 有緩衝 channel（可存 10 個值）
```

### 3. `<-` — 送/收資料
```go
ch <- "hello"       // 送資料進 channel
msg := <-ch         // 從 channel 收資料
```

### 4. `select` — 同時等多個 channel
```go
select {
case msg := <-ch1:
    fmt.Println("從 ch1 收到", msg)
case msg := <-ch2:
    fmt.Println("從 ch2 收到", msg)
case <-time.After(3 * time.Second):
    fmt.Println("超時")
default:
    fmt.Println("都沒資料，不等了")
}
```
- 像 `switch`，但專門給 channel 用
- 哪個 channel 先有資料就執行哪個 case
- `default` = 都沒資料時立刻執行（不阻塞）

## 跨語言對比

### JavaScript
```javascript
// 需要用 Promise、async/await（語法糖）、callback
async function main() {
    const result = await fetch("/api")   // await 是語法，但 Promise 是物件
    const data = await result.json()
}

// 併發多個任務
const [a, b] = await Promise.all([taskA(), taskB()])
```
- `async/await` 是語法糖，底層是 Promise（單執行緒事件循環）
- 沒有真正的多執行緒，無法利用多核 CPU

### Python
```python
import asyncio          # 需要 import
import threading        # 需要 import

# asyncio（類似 JS 的 async/await）
async def main():
    result = await do_something()

# threading（真正的多執行緒，但有 GIL 限制）
t = threading.Thread(target=do_something)
t.start()

# multiprocessing（多程序，繞過 GIL）
from multiprocessing import Process
p = Process(target=do_something)
p.start()
```
- 需要 import 套件
- asyncio = 單執行緒非同步
- threading 有 GIL（全域鎖），同時只能跑一個 thread
- multiprocessing 才能真正用多核，但開銷大

### Java
```java
import java.util.concurrent.*;    // 需要 import

// Thread
Thread t = new Thread(() -> doSomething());
t.start();

// ExecutorService（執行緒池）
ExecutorService pool = Executors.newFixedThreadPool(10);
Future<String> future = pool.submit(() -> "result");

// CompletableFuture（類似 Promise）
CompletableFuture.supplyAsync(() -> fetchData())
    .thenApply(data -> process(data));
```
- 全部需要 import `java.util.concurrent`
- Thread 很重（每個約 1 MB）
- 需要手動管理執行緒池

### Go
```go
// 不需要 import 任何東西
ch := make(chan string)

go func() {
    ch <- fetchData()    // 背景執行，結果送進 channel
}()

result := <-ch           // 主程式等結果
```

## 總結比較表

| | Go | JavaScript | Python | Java |
|---|---|---|---|---|
| **併發語法** | 內建關鍵字 | async/await（語法糖） | 需要 import | 需要 import |
| **輕量執行單元** | goroutine（幾 KB） | 無（單執行緒） | coroutine（asyncio） | Virtual Thread（Java 21+） |
| **通訊方式** | channel（內建） | Promise（內建物件） | asyncio.Queue（套件） | BlockingQueue（套件） |
| **多核利用** | 自動 | 不行（Worker 可以） | multiprocessing | Thread / ExecutorService |
| **學習門檻** | 低（只有 4 個關鍵字） | 中（callback→Promise→async） | 高（3 套方案） | 高（Thread→Pool→Future） |

## 常見模式

### Worker Pool（工作池）
```go
jobs := make(chan int, 100)
results := make(chan int, 100)

// 啟動 3 個 worker
for w := 0; w < 3; w++ {
    go func() {
        for job := range jobs {       // 從 jobs channel 不斷取工作
            results <- job * 2        // 結果送進 results channel
        }
    }()
}

// 送 5 個工作
for j := 0; j < 5; j++ {
    jobs <- j
}
close(jobs)  // 關閉 channel，告訴 worker 沒有更多工作了
```

### Fan-out / Fan-in（扇出/扇入）
```go
// Fan-out：一個任務分給多個 goroutine
ch1 := make(chan string)
ch2 := make(chan string)
go fetchFromAPI1(ch1)
go fetchFromAPI2(ch2)

// Fan-in：多個結果匯集
select {
case r := <-ch1:
    fmt.Println("API1 先回來", r)
case r := <-ch2:
    fmt.Println("API2 先回來", r)
}
```

### Done Channel（通知結束）
```go
done := make(chan struct{})  // 空 struct，不佔記憶體

go func() {
    doLongWork()
    close(done)  // 通知：我做完了
}()

<-done  // 等做完
fmt.Println("工作完成")
```

> `chan struct{}` 是慣例用法，因為 `struct{}` 佔 0 bytes，適合純通知用途
