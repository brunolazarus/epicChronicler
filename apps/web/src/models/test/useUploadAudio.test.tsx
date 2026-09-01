import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { client } from '@chronicler/api-client'
import { useUploadAudio } from '../useUploadAudio.js'

vi.mock('@chronicler/api-client', () => ({
  client: { POST: vi.fn() },
}))

afterEach(() => vi.resetAllMocks())

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useUploadAudio', () => {
  it('posts the file and resolves with a jobId', async () => {
    vi.mocked(client.POST).mockResolvedValue({
      data: { jobId: 'job-1', status: 'queued' },
      error: undefined,
      response: new Response(),
    } as never)

    const { result } = renderHook(() => useUploadAudio(), { wrapper })
    const file = new File(['audio-bytes'], 'recording.webm', { type: 'audio/webm' })

    result.current.mutate(file)

    await waitFor(() => expect(result.current.data).toEqual({ jobId: 'job-1' }))
    expect(client.POST).toHaveBeenCalledWith('/api/v1/pipeline/upload', {
      body: { audio: file },
      bodySerializer: expect.any(Function),
    })
  })
})
