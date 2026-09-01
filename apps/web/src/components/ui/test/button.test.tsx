import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button.js'

describe('Button', () => {
  it('renders children, forwards data-testid, and fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button data-testid="x" onClick={onClick}>Go</Button>)
    const btn = screen.getByTestId('x')
    expect(btn).toHaveTextContent('Go')
    expect(btn.tagName).toBe('BUTTON')
    await userEvent.click(btn)
    expect(onClick).toHaveBeenCalled()
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<Button data-testid="x" disabled onClick={onClick}>Go</Button>)
    await userEvent.click(screen.getByTestId('x'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
