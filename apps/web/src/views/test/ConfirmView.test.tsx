import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmView } from '../ConfirmView.js'

const base = {
  transcript: 'we got lost on the trail', setTranscript: vi.fn(), confirmTranscript: vi.fn(),
  selectedFlavour: 'medieval', recordingLabel: '1:48 audio', wordCount: 6,
}

describe('ConfirmView', () => {
  it('shows the transcript read-only with the flavour-named primary action', () => {
    render(<ConfirmView {...base} />)
    expect(screen.getByText('we got lost on the trail')).toBeInTheDocument()
    expect(screen.queryByTestId('transcript')).toBeNull()          // no textarea by default
    expect(screen.getByTestId('btn-generate')).toHaveTextContent(/Tell it as Medieval Chronicler/)
    expect(screen.getByText('6 words')).toBeInTheDocument()
    expect(screen.getByText('1:48 audio')).toBeInTheDocument()
  })

  it('reveals a textarea after clicking Edit', async () => {
    render(<ConfirmView {...base} />)
    await userEvent.click(screen.getByTestId('btn-edit-transcript'))
    expect(screen.getByTestId('transcript')).toBeInTheDocument()
    expect(screen.getByText('EDITING')).toBeInTheDocument()
  })

  it('starts the rewrite via the primary action', async () => {
    const confirmTranscript = vi.fn()
    render(<ConfirmView {...base} confirmTranscript={confirmTranscript} />)
    await userEvent.click(screen.getByTestId('btn-generate'))
    expect(confirmTranscript).toHaveBeenCalled()
  })

  it('omits the recording label when it is unknown (upload path)', () => {
    render(<ConfirmView {...base} recordingLabel={null} />)
    expect(screen.queryByText(/audio$/)).toBeNull()
    expect(screen.getByText('6 words')).toBeInTheDocument()
  })
})
