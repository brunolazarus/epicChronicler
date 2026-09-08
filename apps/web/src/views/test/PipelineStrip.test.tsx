import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PipelineStrip } from '../PipelineStrip.js'

const base = { transcriptionMs: 1800, generateError: null, onRetry: vi.fn() }

describe('PipelineStrip', () => {
  it('renders a held rewrite row that says it is waiting for the user', () => {
    render(<PipelineStrip {...base} stages={[
      { key: 'transcribe', status: 'done', pct: 100 },
      { key: 'rewrite', status: 'held', pct: 0 },
      { key: 'narrate', status: 'queued', pct: 0 },
    ]} />)
    expect(screen.getByText('waiting for you')).toBeInTheDocument()
  })

  it('freezes a failed row and offers a stage-specific retry', async () => {
    const onRetry = vi.fn()
    render(<PipelineStrip {...base} onRetry={onRetry} generateError="upstream 529" stages={[
      { key: 'transcribe', status: 'done', pct: 100 },
      { key: 'rewrite', status: 'failed', pct: 62 },
      { key: 'narrate', status: 'blocked', pct: 0 },
    ]} />)
    expect(screen.getByText('failed at 62%')).toBeInTheDocument()
    expect(screen.getByText('blocked')).toBeInTheDocument()
    expect(screen.getByText('upstream 529')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Retry rewrite'))
    expect(onRetry).toHaveBeenCalled()
  })

  it('collapses to zero height on the result stage', () => {
    render(<PipelineStrip {...base} collapsed stages={[
      { key: 'transcribe', status: 'done', pct: 100 },
      { key: 'rewrite', status: 'done', pct: 100 },
      { key: 'narrate', status: 'done', pct: 100 },
    ]} />)
    expect(screen.getByTestId('pipeline-strip')).toHaveStyle({ height: '0px' })
  })
})
