import { useEffect, useState } from 'react'
import axios from 'axios'

/**
 * 練習 03：PostList — API 串接 + Mock 測試
 *
 * 待實作：
 * - mount 時呼叫 axios.get('/api/posts')
 * - 載入中：顯示「載入中...」，DOM 上要有 data-testid="loading"
 * - 成功：顯示文章標題清單（每個 <li>{post.title}</li>）
 * - 失敗：顯示「載入失敗，請稍後再試」，data-testid="error"
 *
 * 💡 重點：這支元件「會打 API」，但測試時用 jest.mock('axios') 攔截。
 *     看 tests/03-fetch-posts.test.jsx 怎麼 mock 三種情境。
 *
 * 完成後跑：npm test 03
 */
export function PostList() {
  // TODO: useState — posts、loading、error
  // TODO: useEffect — 呼叫 axios.get('/api/posts')
  //   - 成功：setPosts(res.data)、setLoading(false)
  //   - 失敗：setError(true)、setLoading(false)

  return null
}
