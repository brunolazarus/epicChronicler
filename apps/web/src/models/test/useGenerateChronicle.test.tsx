import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import { useGenerateChronicle } from '../useGenerateChronicle.js'

vi.mock('@chronicler/api-client', () => ({
  client: { POST: vi.fn() },
}))

afterEach(() => vi.resetAllMocks())

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useGenerateChronicle', () => {
  it('posts transcripts + flavour and resolves with a jobId', async () => {
    vi.mocked(client.POST).mockResolvedValue({
      data: { jobId: 'job-2', status: 'queued' },
      error: undefined,
      response: new Response(),
    } as never)

    const { result } = renderHook(() => useGenerateChronicle(), { wrapper })

    result.current.mutate({
      transcripts: [{ speaker: 'Narrator', text: 'a story' }],
      flavour: 'medieval',
    })

    await waitFor(() => expect(result.current.data).toEqual({ jobId: 'job-2' }))
    expect(client.POST).toHaveBeenCalledWith('/api/v1/pipeline/generate', {
      body: {
        transcripts: [{ speaker: 'Narrator', text: 'a story' }],
        flavour: 'medieval',
      },
    })
  })
})
