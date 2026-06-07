import { bubbleSort } from '../src/01-bubble-sort'

describe('bubbleSort', () => {
  // 邊界 case
  it('空陣列應該回傳空陣列', () => {
    expect(bubbleSort([])).toEqual([])
  })

  it('單一元素的陣列應該照原樣回傳', () => {
    expect(bubbleSort([42])).toEqual([42])
  })

  // 主要邏輯
  it('應該把亂序陣列由小到大排序', () => {
    expect(bubbleSort([3, 1, 4, 1, 5, 9, 2, 6])).toEqual([1, 1, 2, 3, 4, 5, 6, 9])
  })

  it('已排序的陣列應該保持不變', () => {
    expect(bubbleSort([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5])
  })

  it('完全反向的陣列應該正確排序', () => {
    expect(bubbleSort([5, 4, 3, 2, 1])).toEqual([1, 2, 3, 4, 5])
  })

  it('包含負數的陣列應該正確排序', () => {
    expect(bubbleSort([-2, 3, -1, 0, 5])).toEqual([-2, -1, 0, 3, 5])
  })

  it('包含重複值應該保留每個重複', () => {
    expect(bubbleSort([2, 2, 1, 1, 3])).toEqual([1, 1, 2, 2, 3])
  })

  // 進階：immutability
  it('不應該修改原始輸入陣列', () => {
    const original = [3, 1, 2]
    bubbleSort(original)
    expect(original).toEqual([3, 1, 2])
  })
})
