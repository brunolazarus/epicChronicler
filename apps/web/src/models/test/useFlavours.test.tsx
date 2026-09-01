import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import { client } from '@chronicler/api-client'
import { useFlavours } from '../useFlavours.js'

vi.mock('@chronicler/api-client', () => ({
  client: { GET: vi.fn() },
}))

afterEach(() => vi.resetAllMocks())

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient()
  return (
    <QueryClientProvider client={qc}>
      <Suspense fallback="loading">{children}</Suspense>
    </QueryClientProvider>
  )
}

describe('useFlavours', () => {
  it('returns the flavour list from the API', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: [{ key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' }],
      error: undefined,
      response: new Response(),
    } as never)

    const { result } = renderHook(() => useFlavours(), { wrapper })

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data).toEqual([
      { key: 'medieval', name: 'Medieval Chronicler', description: 'A scribe' },
    ])
    expect(client.GET).toHaveBeenCalledWith('/api/v1/pipeline/flavours')
  })
})
