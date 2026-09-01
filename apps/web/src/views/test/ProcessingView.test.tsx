import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProcessingView } from '../ProcessingView.js'

describe('ProcessingView', () => {
  it('shows a retry action and the real error message when rewrite fails', async () => {
    const onRetry = vi.fn()
    render(
      <ProcessingView
        stages={[{ key: 'transcribe', status: 'done', pct: 100 }, { key: 'rewrite', status: 'failed', pct: 40 }, { key: 'narrate', status: 'blocked', pct: 0 }]}
        transcriptionMs={1800} flavourKey="medieval" voice="bm_george"
        generateError="upstream 529" onRetry={onRetry}
      />,
    )
    expect(screen.getByText('upstream 529')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Retry rewrite'))
    expect(onRetry).toHaveBeenCalled()
  })
})
