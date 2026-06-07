import { render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { PostList } from '../src/03-fetch-posts'

// 🔑 重點：在檔案最上面 mock 掉整個 axios 模組
// 之後 axios.get 就會變成 jest.fn()，可以用 mockResolvedValue / mockRejectedValue 控制
jest.mock('axios')

describe('<PostList>', () => {
  beforeEach(() => {
    // 每個測試前清掉 mock 紀錄，避免互相影響
    jest.clearAllMocks()
  })

  // 情境 1：Loading
  it('一開始應該顯示「載入中...」', () => {
    // 讓 axios.get 回一個「永遠不 resolve」的 promise，停在 loading
    axios.get.mockReturnValue(new Promise(() => {}))
    render(<PostList />)
    expect(screen.getByTestId('loading')).toHaveTextContent('載入中')
  })

  // 情境 2：成功
  it('成功時應該顯示文章標題清單', async () => {
    axios.get.mockResolvedValue({
      data: [
        { id: 1, title: '第一篇' },
        { id: 2, title: '第二篇' },
      ],
    })

    render(<PostList />)

    // waitFor 等到非同步效果跑完
    await waitFor(() => {
      expect(screen.getByText('第一篇')).toBeInTheDocument()
    })
    expect(screen.getByText('第二篇')).toBeInTheDocument()
  })

  // 情境 3：失敗
  it('失敗時應該顯示錯誤訊息', async () => {
    axios.get.mockRejectedValue(new Error('Server Error'))

    render(<PostList />)

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('載入失敗')
    })
  })

  // 行為驗證：確實呼叫對的 endpoint
  it('應該呼叫 /api/posts 這個 endpoint', async () => {
    axios.get.mockResolvedValue({ data: [] })
    render(<PostList />)
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/posts')
    })
  })
})
