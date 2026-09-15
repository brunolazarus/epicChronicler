import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecordRing } from '../RecordRing.js'

const noop = { onStart: vi.fn(), onStop: vi.fn(), onUploadInstead: vi.fn(), onRetryMic: vi.fn() }

describe('RecordRing', () => {
  it('hero slot: starts recording on click', async () => {
    const onStart = vi.fn()
    render(<RecordRing slot="hero" micError={false} isRecording={false} {...noop} onStart={onStart} />)
    await userEvent.click(screen.getByTestId('btn-record'))
    expect(onStart).toHaveBeenCalled()
  })

  it('timer slot: shows the elapsed label and stops on click', async () => {
    const onStop = vi.fn()
    render(<RecordRing slot="timer" micError={false} isRecording elapsedLabel="0:12" {...noop} onStop={onStop} />)
    expect(screen.getByText('0:12')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('btn-record'))
    expect(onStop).toHaveBeenCalled()
  })

  it('marker slot: is not an interactive control', () => {
    render(<RecordRing slot="marker" micError={false} isRecording={false} pipelineLive {...noop} />)
    expect(screen.queryByTestId('btn-record')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('mic blocked: renders the slash icon, MIC BLOCKED label, and no ring animation', () => {
    const { container } = render(<RecordRing slot="hero" micError isRecording={false} {...noop} />)
    expect(screen.getByText('MIC BLOCKED')).toBeInTheDocument()
    expect(container.querySelector('.animate-ringout')).toBeNull()
    expect(container.querySelector('.animate-recpulse')).toBeNull()
  })

  it('mic blocked: wires Try again / Upload a file', async () => {
    const onRetryMic = vi.fn(); const onUploadInstead = vi.fn()
    render(<RecordRing slot="hero" micError isRecording={false} {...noop} onRetryMic={onRetryMic} onUploadInstead={onUploadInstead} />)
    await userEvent.click(screen.getByText('Try again'))
    expect(onRetryMic).toHaveBeenCalled()
    await userEvent.click(screen.getByText('Upload a file'))
    expect(onUploadInstead).toHaveBeenCalled()
  })
})
