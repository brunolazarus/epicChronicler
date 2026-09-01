import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChronicleView } from '../ChronicleView.js'

const flavours = [
  { key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' },
  { key: 'sports', name: 'Sports Commentator', description: 'A commentator' },
]

describe('ChronicleView', () => {
  it('shows the chronicle, plays audio, and retell redirects instead of regenerating', async () => {
    const retellAs = vi.fn()
    render(
      <ChronicleView chronicleText="Here follows the chronicle..." audioKey="tts-1.mp3" transcript="a tale"
        flavours={flavours} selectedFlavour="medieval" retellAs={retellAs} jobOutcome={null} restart={vi.fn()} />,
    )
    expect(screen.getByTestId('chronicle-text')).toHaveTextContent('Here follows the chronicle...')
    expect(screen.getByTestId('tts-player')).toHaveAttribute('src', '/api/v1/pipeline/audio/tts-1.mp3')

    await userEvent.click(screen.getByTestId('retell-sports'))
    expect(retellAs).toHaveBeenCalledWith('sports')
  })

  it('renders EmptyStateShell for an expired job instead of the two-column layout', () => {
    render(
      <ChronicleView chronicleText={null} audioKey={null} transcript="" flavours={flavours}
        selectedFlavour="medieval" retellAs={vi.fn()} jobOutcome="expired" restart={vi.fn()} />,
    )
    expect(screen.getByText('This session has ended')).toBeInTheDocument()
    expect(screen.queryByTestId('chronicle-text')).not.toBeInTheDocument()
  })

  it('renders EmptyStateShell generic fallback for a failed job', () => {
    render(
      <ChronicleView chronicleText={null} audioKey={null} transcript="" flavours={flavours}
        selectedFlavour="medieval" retellAs={vi.fn()} jobOutcome="failed" restart={vi.fn()} />,
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByTestId('chronicle-text')).not.toBeInTheDocument()
  })
})
