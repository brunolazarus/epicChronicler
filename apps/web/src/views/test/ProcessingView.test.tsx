import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProcessingView } from '../ProcessingView.js'

describe('ProcessingView', () => {
  it('shows the working header and the run log', () => {
    render(
      <ProcessingView
        stages={[{ key: 'transcribe', status: 'done', pct: 100 }, { key: 'rewrite', status: 'active', pct: 40 }, { key: 'narrate', status: 'queued', pct: 0 }]}
        flavourKey="medieval" voice="bm_george"
      />,
    )
    expect(screen.getByText('TELLING YOUR STORY')).toBeInTheDocument()
    expect(screen.getByText('working')).toBeInTheDocument()
    expect(screen.getByText(/flavour medieval → voice bm_george/)).toBeInTheDocument()
  })

  it('reads failed and logs the failed stage when a stage fails', () => {
    render(
      <ProcessingView
        stages={[{ key: 'transcribe', status: 'done', pct: 100 }, { key: 'rewrite', status: 'failed', pct: 40 }, { key: 'narrate', status: 'blocked', pct: 0 }]}
        flavourKey="medieval" voice="bm_george"
      />,
    )
    expect(screen.getByText('failed')).toBeInTheDocument()
    expect(screen.getByText(/rewrite failed/)).toBeInTheDocument()
  })
})
