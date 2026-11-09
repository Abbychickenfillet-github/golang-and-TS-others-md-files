// 請求去重 + 取消舊請求（latest-only）
// 用假的 fakeFetch 模擬網路，這樣離線也能跑，行為與真 fetch 的 signal 一致
const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason) // 真 fetch 被取消時，reject 的就是 signal.reason（AbortError）
    })
  })

let networkHits = 0
async function fakeFetch(url, { signal } = {}) {
  networkHits++
  await sleep(200, signal)
  return `資料:${url}`
}

// 1. 去重：同一個 key 同時只發一次，其餘呼叫者共用同一個 Promise
const inflight = new Map()
function dedupedFetch(url) {
  if (inflight.has(url)) return inflight.get(url)
  const p = fakeFetch(url).finally(() => inflight.delete(url))
  inflight.set(url, p)
  return p
}

// 2. latest-only：新請求一到，先取消上一個
let controller = null
async function searchLatestOnly(keyword) {
  controller?.abort()
  controller = new AbortController()
  try {
    return await fakeFetch(`/search?q=${keyword}`, { signal: controller.signal })
  } catch (err) {
    if (err === controller?.signal?.reason || err?.name === 'AbortError') return null
    throw err
  }
}

async function main() {
  await Promise.all([dedupedFetch('/api/timelogs'), dedupedFetch('/api/timelogs'), dedupedFetch('/api/timelogs')])
  console.log(`去重：3 次呼叫實際打網路 ${networkHits} 次（應為 1）`)

  networkHits = 0
  const results = await Promise.all(['a', 'ab', 'abc'].map((k) => searchLatestOnly(k)))
  console.log('latest-only 結果：', results, `（網路發出 ${networkHits} 次，但只有最後一個有結果）`)
}
main()
