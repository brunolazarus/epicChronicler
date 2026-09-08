import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import App from '../App.js'

vi.mock('@chronicler/api-client', () => ({ client: { GET: vi.fn(), POST: vi.fn() } }))

function renderApp() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><App /></QueryClientProvider>)
}

beforeEach(() => {
  vi.mocked(client.GET).mockResolvedValue({
    data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }],
    error: undefined, response: new Response(),
  } as never)
})

describe('App shell', () => {
  it('stamps the current stage on the root element', async () => {
    renderApp()
    await waitFor(() => expect(document.querySelector('[data-stage="landing"]')).toBeTruthy())
  })

  it('keeps one record ring element mounted from the start', async () => {
    renderApp()
    await waitFor(() => expect(screen.getByTestId('ring-wrapper')).toBeInTheDocument())
    // exactly one ring wrapper, always
    expect(screen.getAllByTestId('ring-wrapper')).toHaveLength(1)
  })
})
