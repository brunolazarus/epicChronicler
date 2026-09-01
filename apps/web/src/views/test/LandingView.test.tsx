import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LandingView } from '../LandingView.js'

const flavours = [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }]

function baseProps() {
  return {
    flavours, selectedFlavour: null, selectFlavour: vi.fn(),
    micError: false, setMicError: vi.fn(), clearMicError: vi.fn(),
    tryUploadAudio: vi.fn(), uploadValidationError: null,
    uploadStatus: 'idle' as const, uploadError: null,
  }
}

describe('LandingView', () => {
  it('shows the sample chronicle and links to the MCP server', () => {
    render(<LandingView {...baseProps()} />)
    expect(screen.getByText(/Siege of the Flatpack Throne/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'MCP server' })).toHaveAttribute('href', 'https://epicchronicler-production.up.railway.app/mcp')
  })

  it('uploads a file selected via the hidden input', async () => {
    const tryUploadAudio = vi.fn()
    render(<LandingView {...baseProps()} tryUploadAudio={tryUploadAudio} />)
    const file = new File(['bytes'], 'recording.mp3', { type: 'audio/mpeg' })
    await userEvent.upload(screen.getByTestId('audio-file'), file)
    expect(tryUploadAudio).toHaveBeenCalledWith(file)
  })

  it('shows a NoticeCard when uploadValidationError is set', () => {
    render(<LandingView {...baseProps()} uploadValidationError={{ code: 'too-large', detail: '68.4 MB — limit 25 MB' }} />)
    expect(screen.getByText('That file is too large')).toBeInTheDocument()
  })

  it('does not swallow a fresh error after "Record instead" dismisses a previous one', async () => {
    const originalMediaDevices = navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })

    try {
      const { rerender } = render(
        <LandingView {...baseProps()} uploadValidationError={{ code: 'too-large', detail: '68.4 MB — limit 25 MB' }} />,
      )
      expect(screen.getByText('That file is too large')).toBeInTheDocument()

      await userEvent.click(screen.getByText('Record instead'))
      expect(screen.queryByText('That file is too large')).not.toBeInTheDocument()

      // Simulate the user then trying to record again — this must reset the
      // dismissal, or a subsequent real error gets silently swallowed.
      await userEvent.click(screen.getByTestId('btn-record'))

      rerender(
        <LandingView {...baseProps()} uploadValidationError={null} uploadStatus="error" uploadError="transcription failed" />,
      )
      expect(screen.getByText("That recording couldn't be transcribed")).toBeInTheDocument()
    } finally {
      Object.defineProperty(navigator, 'mediaDevices', { value: originalMediaDevices, configurable: true })
    }
  })
})
