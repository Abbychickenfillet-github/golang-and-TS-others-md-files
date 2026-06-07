import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CounterButton } from '../src/02-counter-button'

describe('<CounterButton>', () => {
  // 初始狀態
  it('預設應該顯示「點我 (0)」', () => {
    render(<CounterButton />)
    expect(screen.getByRole('button')).toHaveTextContent('點我 (0)')
  })

  // 互動 — Given / When / Then
  it('點一下應該變成「點我 (1)」', async () => {
    render(<CounterButton />)                       // Given
    const button = screen.getByRole('button')
    await userEvent.click(button)                   // When
    expect(button).toHaveTextContent('點我 (1)')     // Then
  })

  it('點三下應該變成「點我 (3)」', async () => {
    render(<CounterButton />)
    const button = screen.getByRole('button')
    await userEvent.click(button)
    await userEvent.click(button)
    await userEvent.click(button)
    expect(button).toHaveTextContent('點我 (3)')
  })

  // Props 變化
  it('傳入 initialCount=5 應該顯示「點我 (5)」', () => {
    render(<CounterButton initialCount={5} />)
    expect(screen.getByRole('button')).toHaveTextContent('點我 (5)')
  })

  it('initialCount=5 點一下應該變成 6', async () => {
    render(<CounterButton initialCount={5} />)
    const button = screen.getByRole('button')
    await userEvent.click(button)
    expect(button).toHaveTextContent('點我 (6)')
  })
})
