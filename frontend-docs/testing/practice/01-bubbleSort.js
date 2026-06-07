// Bubble Sort 含 early-exit 優化
// 對應 Day 1 演算法 + Day 2 Jest 練習

export function bubbleSort(arr) {
  const a = [...arr] // 不修改原陣列（immutable）
  for (let i = 0; i < a.length - 1; i++) {
    let swapped = false
    for (let j = 0; j < a.length - 1 - i; j++) {
      if (a[j] > a[j + 1]) {
        ;[a[j], a[j + 1]] = [a[j + 1], a[j]] // ES6 destructure swap
        swapped = true
      }
    }
    if (!swapped) break // ← early exit：這輪沒交換代表已排序
  }
  return a
}
