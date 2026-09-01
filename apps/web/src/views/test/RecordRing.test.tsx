import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecordRing } from '../RecordRing.js'

describe('RecordRing', () => {
  it('calls onStart when clicked while idle', async () => {
    const onStart = vi.fn()
    render(<RecordRing micError={false} isRecording={false} onStart={onStart} onStop={vi.fn()} onUploadInstead={vi.fn()} onRetryMic={vi.fn()} />)
    await userEvent.click(screen.getByTestId('btn-record'))
    expect(onStart).toHaveBeenCalled()
  })

  it('shows the mic-blocked notice and wires Try again / Upload a file when micError is true', async () => {
    const onRetryMic = vi.fn()
    const onUploadInstead = vi.fn()
    render(<RecordRing micError={true} isRecording={false} onStart={vi.fn()} onStop={vi.fn()} onUploadInstead={onUploadInstead} onRetryMic={onRetryMic} />)
    expect(screen.getByText('Your browser blocked the microphone')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Try again'))
    expect(onRetryMic).toHaveBeenCalled()
    await userEvent.click(screen.getByText('Upload a file'))
    expect(onUploadInstead).toHaveBeenCalled()
  })
})
