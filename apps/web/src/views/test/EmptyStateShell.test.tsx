import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyStateShell } from '../EmptyStateShell.js'

describe('EmptyStateShell', () => {
  it('shows neutral "session ended" copy for an expired job', () => {
    render(<EmptyStateShell kind="expired" jobId="8f31" onPrimary={vi.fn()} />)
    expect(screen.getByText('This session has ended')).toBeInTheDocument()
  })

  it('falls back to onPrimary for the generic-failure retry action when onRetry is not given', async () => {
    const onPrimary = vi.fn()
    render(<EmptyStateShell kind="generic" jobId="8f31" onPrimary={onPrimary} />)
    await userEvent.click(screen.getByText('Try again'))
    expect(onPrimary).toHaveBeenCalled()
  })

  it('calls onRetry, not onPrimary, when both are given for a generic failure', async () => {
    const onPrimary = vi.fn()
    const onRetry = vi.fn()
    render(<EmptyStateShell kind="generic" jobId="8f31" onPrimary={onPrimary} onRetry={onRetry} />)
    await userEvent.click(screen.getByText('Try again'))
    expect(onRetry).toHaveBeenCalled()
    expect(onPrimary).not.toHaveBeenCalled()
  })

  it('"Back to start" always calls onPrimary, even when onRetry is given', async () => {
    const onPrimary = vi.fn()
    const onRetry = vi.fn()
    render(<EmptyStateShell kind="generic" jobId="8f31" onPrimary={onPrimary} onRetry={onRetry} />)
    await userEvent.click(screen.getByText('Back to start'))
    expect(onPrimary).toHaveBeenCalled()
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('renders an icon for each kind', () => {
    const expired = render(<EmptyStateShell kind="expired" jobId="8f31" onPrimary={vi.fn()} />)
    expect(expired.container.querySelector('svg')).toBeTruthy()
    expired.unmount()

    const generic = render(<EmptyStateShell kind="generic" jobId="8f31" onPrimary={vi.fn()} />)
    expect(generic.container.querySelector('svg')).toBeTruthy()
  })
})
