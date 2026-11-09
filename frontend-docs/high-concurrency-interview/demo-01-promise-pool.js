// 併發池：同一時間最多只讓 limit 個非同步任務在飛
// 對應 LeetCode 2636 Promise Pool（概念相同，這裡用 worker 迴圈寫法）
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function promisePool(tasks, limit) {
  let next = 0 // 下一個要領取的任務編號，所有 worker 共用
  let inflight = 0
  let peak = 0

  async function worker(id) {
    while (next < tasks.length) {
      const i = next++ // 單執行緒 + run-to-completion，這行不會被其他 worker 插隊
      inflight++
      peak = Math.max(peak, inflight)
      console.log(`t=${Date.now() - t0}ms worker${id} 開始任務${i}`)
      await tasks[i]() // 讓出執行權，其他 worker 趁機領任務
      inflight--
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, (_, id) => worker(id))
  await Promise.all(workers)
  return peak
}

const t0 = Date.now()
const tasks = Array.from({ length: 8 }, (_, i) => () => sleep(100 + i * 20))

promisePool(tasks, 3).then((peak) => {
  console.log(`全部完成，同時在飛的峰值 = ${peak}（應該 <= 3）`)
})
