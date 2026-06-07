import { useState } from 'react'

/**
 * 練習 02：CounterButton
 *
 * 待實作一個按鈕元件：
 * - 顯示「點我 (X)」，X 是目前點擊次數
 * - 預設 X = 0
 * - 每點一下，X +1
 *
 * Props：
 *   - initialCount（可選，預設 0）：起始計數
 *
 * 完成後跑：npm test counter
 */
export function CounterButton({ initialCount = 0 }) {
  // TODO: 用 useState 管理 count
  // TODO: onClick 把 count +1
  return <button>點我 (0)</button>
}
