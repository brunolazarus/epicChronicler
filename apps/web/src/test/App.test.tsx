import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import App from '../App.js'

vi.mock('@chronicler/api-client', () => ({ client: { GET: vi.fn(), POST: vi.fn() } }))
afterEach(() => vi.resetAllMocks())

function renderApp() {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}><App /></QueryClientProvider>)
}

describe('App', () => {
  it('walks flavour-first through to a rendered chronicle', async () => {
    vi.mocked(client.GET).mockImplementation(async (path: string) => {
      if (path === '/api/v1/pipeline/flavours') {
        return { data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }], error: undefined, response: new Response() } as never
      }
      return { data: { status: 'completed', progress: 100, result: { transcript: 'a wild tale', text: 'Here follows the chronicle...', audioKey: 'tts-1.mp3', transcriptionMs: 1800 }, error: null }, error: undefined, response: new Response() } as never
    })
    vi.mocked(client.POST).mockResolvedValue({ data: { jobId: 'job-1', status: 'queued' }, error: undefined, response: new Response() } as never)

    renderApp()
    await waitFor(() => expect(screen.getByTestId('carousel-chip-medieval')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('carousel-chip-medieval'))
    const file = new File(['bytes'], 'recording.mp3', { type: 'audio/mpeg' })
    await userEvent.upload(screen.getByTestId('audio-file'), file)

    await waitFor(() => expect(screen.getByTestId('transcript')).toHaveValue('a wild tale'))
    await userEvent.click(screen.getByTestId('btn-generate'))

    await waitFor(() => expect(screen.getByTestId('chronicle-text')).toHaveTextContent('Here follows the chronicle...'))
    expect(screen.getByTestId('tts-player')).toHaveAttribute('src', '/api/v1/pipeline/audio/tts-1.mp3')
  })
})
