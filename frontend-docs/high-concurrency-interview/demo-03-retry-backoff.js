// 重試 + 指數退避 + jitter：遇到 429 或暫時性錯誤，不要立刻重打
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function withRetry(fn, { retries = 3, baseMs = 100 } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      if (attempt >= retries || !err.retryable) throw err // 4xx 非 429 不該重試
      const backoff = baseMs * 2 ** attempt // 100, 200, 400...
      const jitter = Math.random() * backoff * 0.5 // 打散，避免大家同一刻一起重試
      const wait = Math.round(backoff + jitter)
      console.log(`第 ${attempt + 1} 次失敗（${err.message}），${wait}ms 後重試`)
      await sleep(wait)
    }
  }
}

// 前兩次回 429，第三次成功
async function flakyApi(attempt) {
  if (attempt < 2) {
    const err = new Error('HTTP 429')
    err.retryable = true
    throw err
  }
  return { status: 'success', attempt }
}

withRetry(flakyApi).then((r) => console.log('最終結果：', r))
