import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyStateShell } from '../EmptyStateShell.js'

describe('EmptyStateShell', () => {
  it('shows neutral "session ended" copy for an expired job', () => {
    render(<EmptyStateShell kind="expired" jobId="8f31" onPrimary={vi.fn()} />)
    expect(screen.getByText('This session has ended')).toBeInTheDocument()
  })

  it('calls onPrimary for the generic-failure retry action', async () => {
    const onPrimary = vi.fn()
    render(<EmptyStateShell kind="generic" jobId="8f31" onPrimary={onPrimary} />)
    await userEvent.click(screen.getByText('Try again'))
    expect(onPrimary).toHaveBeenCalled()
  })
})
